import requests
import re
import tempfile
import xarray as xr
import pandas as pd
from datetime import datetime
import pytz

from bs4 import BeautifulSoup

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine.base import Engine


class Wavewatch:
    """
    Class representing the Wavewatch data processing and database interaction.

    This class provides methods to retrieve data from Wavewatch URLs, convert it to a pandas DataFrame,
    and commit it to a database. It also includes methods for running a full data processing run or a sample run.

    Attributes:
        engine (str): The database engine to be used for committing the DataFrame.
        table_name (str): The name of the table in the database to which the DataFrame will be committed.
        date (str): The current date in the format "%Y%m%d".
        url (str): The base URL for retrieving Wavewatch data.
        url_list (list): A list of URLs for retrieving Wavewatch data.

    Methods:
        get_global_mean_urls(url: str) -> list:
            Retrieves the list of links for the average global model for all forecast hours.

        url_to_df(target: str) -> pandas.DataFrame:
            Fetches data from the specified URL and returns it as a pandas DataFrame.

        commit_df_to_db(df: pandas.DataFrame) -> None:
            Commit a DataFrame to the database.

        run() -> None:
            Retrieve data from the Wavewatch URLs, convert it to a DataFrame, and commit it to the database.

        run_sample() -> None:
            Retrieve data from a single Wavewatch URL, convert it to a DataFrame, and commit it to the database.
    """

    def __init__(self, engine: Engine, table_name: str):
        self.engine = engine
        self.table_name = table_name
        self.date = datetime.now().strftime("%Y%m%d")
        self.url = f"https://nomads.ncep.noaa.gov/pub/data/nccf/com/gens/prod/gefs.{self.date}/00/wave/gridded/"
        self.url_list = self.get_global_mean_urls(self.url)

    def get_global_mean_urls(self, url: str) -> list:
        """
        Retrieves the list of links for the average global model for all forecast hours.

        Parameters:
        url (str): The URL of the webpage to scrape.

        Returns:
        urls (list): A list of links for the average global model.
        """
        response = requests.get(url)
        soup = BeautifulSoup(response.content, 'html.parser')
        pattern = re.compile(
            r'gefs\.wave\.t00z\.mean\.global\.0p25\.f\d{3}\.grib2')
        urls = [a.get('href') for a in soup.find_all('a', href=pattern)]
        return urls

    def url_to_df(self, target: str) -> pd.DataFrame:
        """
        Fetches data from the specified URL and returns it as a pandas DataFrame.

        Args:
            target (str): The target URL to fetch the data from.

        Returns:
            pandas.DataFrame: The fetched data as a pandas DataFrame, with NaN swell values dropped and index reset.
        """
        response = requests.get(f'{self.url}/{target}')
        if response.status_code == 200:
            with tempfile.NamedTemporaryFile() as tmp:
                tmp.write(response.content)
                tmp.flush()

                with xr.open_dataset(tmp.name, engine='cfgrib') as ds:
                    data = ds.load()
                    df = data.to_dataframe()
                    # df = df.dropna(subset=['swh'])
                    df.reset_index(
                        level=['latitude', 'longitude'], inplace=True)

                    df['longitude'] = df['longitude'].apply(
                        lambda x: x - 360 if x > 180 else 180).round(2)
                    df['step'] = df['step'].dt.total_seconds() / 3600.0
                    df['step'] = df['step'].astype(str) + ' hours'
                    return df

        else:
            print(f"Failed to get data: {response.status_code}")

    def commit_df_to_db(self, df: pd.DataFrame) -> None:
        """
        Commit a DataFrame to the database.

        Args:
            df (pandas.DataFrame): The DataFrame to be committed.

        Raises:
            SQLAlchemyError: If an error occurs while committing the DataFrame to the database.
        """
        with self.engine.begin() as connection:
            try:
                utc = pytz.utc
                df['entry_updated'] = datetime.now(utc)
                df.to_sql(self.table_name, con=connection,
                          if_exists='append', index=False)
                print(f"Successfully wrote grib2 file")
            except SQLAlchemyError as e:
                print(f"An error occurred: {e}")

    def run(self) -> None:
        """
        Retrieve data from the Wavewatch URLs, convert it to a DataFrame, and commit it to the database.

        This method processes all URLs in self.url_list. Each URL is processed individually, 
        converted to a DataFrame with the url_to_df method, and committed to the database with 
        the commit_df_to_db method.

        Note: This is a full run and can be time consuming. Use the sample method for a quicker test 
        with a single URL.

        Args:
            None

        Returns:
            None
        """
        count = 0
        for url in self.url_list:
            df = self.url_to_df(url)
            self.commit_df_to_db(df)
            count += 1
            print(
                f"Wrote grib file number {count} out of {len(self.url_list)}")
            print("Updated")

    def run_sample(self) -> None:
        """
        Retrieve data from a single Wavewatch URL, convert it to a DataFrame, and commit it to the database.

        This method is a sample run and is intended for quick testing with a single URL. It retrieves data from 
        a single URL, converts it to a DataFrame with the url_to_df method, and commits it to the database with 
        the commit_df_to_db method.

        Args:
            None

        Returns:
            None
        """
        url = self.url_list[0]
        df = self.url_to_df(url)
        self.commit_df_to_db(df)
        print("Sample run completed.")
