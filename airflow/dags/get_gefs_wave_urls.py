import re
from datetime import datetime, timedelta

import requests
from airflow.decorators import task
from bs4 import BeautifulSoup

from airflow import DAG

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "start_date": datetime(2024, 1, 1),
    "email": ["your-email@example.com"],
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    "get_gefs_wave_urls",
    default_args=default_args,
    description="Get GEFS wave forecast grib2 file urls",
    schedule_interval=None,
    catchup=False,
) as dag:
    # Available forecasts
    forecast_intervals = ["00", "06", "12", "18"]
    # Fetch just the first model of the day due to storage size on disk
    epoch = forecast_intervals[0]

    @task
    def get_gefs_wave_urls(epoch):
        date = datetime.now().strftime("%Y%m%d")  # Current Time UTC
        url = f"https://nomads.ncep.noaa.gov/pub/data/nccf/com/gens/prod/gefs.{date}/{epoch}/wave/gridded"
        # Pattern for mean ensemble wave models at epoch:
        pattern = re.compile(r".*\.mean\.global\.0p25\.f\d{3}\.grib2")
        response = requests.get(url)
        soup = BeautifulSoup(response.content, "html.parser")
        urls = [a.get("href") for a in soup.find_all("a", href=pattern)]

        return urls

    gefs_wave_urls = get_gefs_wave_urls(epoch)
