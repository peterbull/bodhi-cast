import re
import tempfile
from datetime import datetime

import pandas as pd
import pytz
import requests
import xarray as xr
from bs4 import BeautifulSoup
from geoalchemy2 import WKTElement
from geoalchemy2.types import Geography
from shapely.geometry import Point
from sqlalchemy import text
from sqlalchemy.engine.base import Engine
from sqlalchemy.exc import SQLAlchemyError


class Wavewatch:
    """
    Class representing the Wavewatch data processing and database interaction.

    This class provides methods to retrieve data from Wavewatch URLs, convert
    it to a pandas DataFrame, and commit it to a database. It also includes
    methods for running a full data processing run or a sample run.

    Attributes:
        engine (str): The database engine to be used for committing the
        DataFrame.
        table_name (str): The name of the table in the database to which the
        DataFrame will be committed.
        date (str): The current date in the format "%Y%m%d".
        url (str): The base URL for retrieving Wavewatch data.
        url_list (list): A list of URLs for retrieving Wavewatch data.

    Methods:
        get_global_mean_urls(url: str) -> list:
            Retrieves the list of links for the average global model for all
            forecast hours.

        url_to_df(target: str) -> pandas.DataFrame:
            Fetches data from the specified URL and returns it as a pandas
            DataFrame.

        commit_df_to_db(df: pandas.DataFrame) -> None:
            Commit a DataFrame to the database.

        run() -> None:
            Retrieve data from the Wavewatch URLs, convert it to a DataFrame,
            and commit it to the database.

        run_sample() -> None:
            Retrieve data from a single Wavewatch URL, convert it to a
            DataFrame, and commit it to the database.
    """

    def __init__(self, engine: Engine, table_name: str):
        """
        Initialize the Wavewatch object.

        Args:
            engine (Engine): The database engine to be used for committing the
            DataFrame.
            table_name (str): The name of the table in the database to which
            the DataFrame will be committed.
        """
        self.engine = engine
        self.table_name = table_name
        self.date = datetime.now().strftime("%Y%m%d")
        self.url = f"https://nomads.ncep.noaa.gov/pub/data/nccf/com/gens/prod/gefs.{self.date}/00/wave/gridded/"
        self.url_list = self.get_global_mean_urls(self.url)

    def get_global_mean_urls(self, url: str) -> list:
        """
        Retrieves the list of links for the average global model for all
        forecast hours at the first forecast time for the day (`00` Hours).

        Parameters:
            url (str): The URL of the webpage to scrape.

        Returns:
            urls (list): A list of links for the average global model.
        """
        response = requests.get(url)
        soup = BeautifulSoup(response.content, "html.parser")
        pattern = re.compile(r"gefs\.wave\.t00z\.mean\.global\.0p25\.f\d{3}\.grib2")
        urls = [a.get("href") for a in soup.find_all("a", href=pattern)]
        return urls

    def url_to_df(self, target: str, swell_only: bool = False) -> pd.DataFrame:
        """
        Fetches data from the specified URL and returns it as a pandas
        DataFrame. Xarray is used as an intermediary to utilize decoding with `cfgrib`.
        Rows with no meteorological data are dropped to decrease extra load.

        Args:
            target (str): The target URL to fetch the data from.
            swell_only (bool, optional): Flag indicating whether to include
            only swell data. Defaults to False.

        Returns:
            pandas.DataFrame: The fetched data as a pandas DataFrame, with NaN
            swell values dropped and index reset.
        """
        response = requests.get(f"{self.url}/{target}")
        if response.status_code == 200:
            with tempfile.NamedTemporaryFile() as tmp:
                tmp.write(response.content)
                tmp.flush()

                with xr.open_dataset(tmp.name, engine="cfgrib") as ds:
                    data = ds.load()
                    df = data.to_dataframe()
                    df.reset_index(level=["latitude", "longitude"], inplace=True)
                    df.drop(columns="surface", inplace=True)
                    df.dropna(
                        subset=[
                            "swh",
                            "perpw",
                            "dirpw",
                            "shww",
                            "mpww",
                            "wvdir",
                            "ws",
                            "wdir",
                            "swper",
                            "swell",
                        ],
                        how="all",
                        inplace=True,
                    )
                    if swell_only:
                        df = df.drop(
                            columns=[
                                "surface",
                                "swh",
                                "perpw",
                                "dirpw",
                                "shww",
                                "mpww",
                                "wvdir",
                                "ws",
                                "wdir",
                                "swper",
                            ]
                        )

                    df["longitude"] = (
                        df["longitude"].apply(lambda x: x - 360 if x > 180 else x).round(2)
                    )
                    df["location"] = df.apply(
                        lambda row: Point(row["longitude"], row["latitude"]), axis=1
                    )
                    df["location"] = df["location"].apply(
                        lambda loc: WKTElement(loc.wkt, srid=4326)
                    )
                    df["step"] = df["step"].dt.total_seconds() / 3600.0
                    df["step"] = df["step"].astype(str) + " hours"
                    return df

        else:
            print(f"Failed to get data: {response.status_code}")

    def commit_df_to_db(self, df: pd.DataFrame) -> None:
        """
        Commit a DataFrame to the database.

        Args:
            df (pandas.DataFrame): The DataFrame to be committed.

        Raises:
            SQLAlchemyError: If an error occurs while committing the DataFrame
            to the database.
        """
        with self.engine.begin() as connection:
            try:
                utc = pytz.utc
                df["entry_updated"] = datetime.now(utc)
                df.to_sql(
                    self.table_name,
                    con=connection,
                    if_exists="append",
                    index=False,
                    dtype={"location": Geography(geometry_type="POINT", srid=4326)},
                )
                print("Successfully wrote grib2 file")
            except SQLAlchemyError as e:
                print(f"An error occurred: {e}")

    def reindex_db(self) -> None:
        """
        Create a GiST index on the 'location' column of the table in the
        database if it doesn't already exist, then reindex the 'location'
        column.

        Raises:
            SQLAlchemyError: If an error occurs while creating or reindexing
            the index.
        """
        with self.engine.begin() as connection:
            try:
                connection.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS location_gist ON wave_forecast USING gist(location);"
                    )
                )

                print("Successfully created the index if it did not exist")
            except SQLAlchemyError as e:
                print(f"An error occurred while creating the index: {e}")

            try:
                connection.execute(text("REINDEX INDEX location_gist;"))
                print("Successfully reindexed the table")
            except SQLAlchemyError as e:
                print(f"An error occurred while reindexing the table: {e}")

    def run(self, swell_only: bool = False) -> None:
        """
        Retrieve data from the Wavewatch URLs, convert it to a DataFrame, and
        commit it to the database.

        This method processes all URLs in self.url_list. Each URL is processed
        individually, converted to a DataFrame with the url_to_df method, and
        committed to the database with the commit_df_to_db method.

        Note: This is a full run and can be time consuming. Use the sample
        method for a quicker test with a single URL.

        Args:
            swell_only (bool, optional): If True, only retrieve data for
            swells. Defaults to False.

        Returns:
            None
        """
        count = 0
        for url in self.url_list:
            df = self.url_to_df(url, swell_only)
            self.commit_df_to_db(df)
            count += 1
            print(f"Wrote grib file number {count} out of {len(self.url_list)}")
            print("Updated")
        self.reindex_db()

    def run_sample(self, num_samples: int = 1, swell_only: bool = False) -> None:
        """
        Retrieve data from a single Wavewatch URL, convert it to a DataFrame,
        and commit it to the database.

        This method is a sample run and is intended for quick testing with a
        single URL. It retrieves data from a single URL, converts it to a
        DataFrame with the url_to_df method, and commits it to the database
        with the commit_df_to_db method.

        Args:
            swell_only (bool): If True, retrieve only the swell data. Defaults
            to False.

        Returns:
            None
        """

        count = 0

        for url in self.url_list[0:num_samples]:
            df = self.url_to_df(url, swell_only)
            self.commit_df_to_db(df)
            count += 1
            print(
                f"""Wrote grib file number {count} out of {len(self.url_list[0:num_samples])}
                samples"""
            )
            print("Updated")
        self.reindex_db()
