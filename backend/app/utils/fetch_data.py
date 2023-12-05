import requests
import re
import tempfile
import xarray as xr
from datetime import datetime
import pytz

from bs4 import BeautifulSoup
from sqlalchemy.exc import SQLAlchemyError


from app.models.models import SwellData
from app.db.database import SessionLocal

# Functions for fetching and commiting global grib wave forecast files from Wavewatch III models to database

def latest_url():
    date = datetime.now().strftime("%Y%m%d")
    url = f"https://nomads.ncep.noaa.gov/pub/data/nccf/com/gens/prod/gefs.{date}/00/wave/gridded/"
    return url


def get_grib2_links():    # parse the list of models
    response = requests.get(latest_url())
    soup = BeautifulSoup(response.content, 'html.parser')
    # match the average global model for all forecast hours
    pattern = re.compile(r'gefs\.wave\.t00z\.mean\.global\.0p25\.f\d{3}\.grib2')
    hrefs = [a.get('href') for a in soup.find_all('a', href=pattern)]
    return hrefs


def grib2_url_to_dataframe(target):
    response = requests.get(f'{latest_url()}/{target}')
    if response.status_code == 200:
        # Use a temporary file to store the response content
        with tempfile.NamedTemporaryFile() as tmp:
            tmp.write(response.content)
            tmp.flush()

            # Open the dataset from the temporary file
            with xr.open_dataset(tmp.name, engine='cfgrib') as ds:
                # Extract the necessary data here
                data = ds.load()  # 'load' will load the data into memory
                # load to pandas dataframe
                df = data.to_dataframe()
                # drop landlocked rows
                df = df.dropna(subset=['swh'])
                # reset index
                df.reset_index(level=['latitude', 'longitude'], inplace=True)

                # Convert the timedelta to total number of hours as a string with ' hours' appended
                df['step'] = df['step'].dt.total_seconds() / 3600.0
                df['step'] = df['step'].astype(str) + ' hours'
                return df
                    
    else:
        print(f"Failed to get data: {response.status_code}")


def save_dataframe_to_db(df, engine, table_name):
    with engine.begin() as connection:  # Automatically handles transactions, including rollbacks if neccessary
        try:
            utc = pytz.utc
            df['entry_updated'] = datetime.now(utc)
            df.to_sql(table_name, con=connection, if_exists='append', index=False)
            print(f"Successfully wrote grib2 file")
        except SQLAlchemyError as e:
            print(f"An error occurred: {e}")


def all_wave_forecasts_to_db(engine, table_name):
    count = 0
    targets = get_grib2_links()
    for target in targets:
        df = grib2_url_to_dataframe(target)
        save_dataframe_to_db(df, engine, table_name)
        count += 1
        print(f"Wrote grib file number {count} out of {len(targets)}")






