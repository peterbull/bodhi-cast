import asyncio
import logging
import time
from typing import Any, Dict, List, Optional

import aiohttp
import pandas as pd
import pendulum
import requests
from extensions.models.models import SlRatings, SlSpots
from extensions.schemas.schemas import SlApiEndpoints, SlApiParams
from extensions.utils.db_config import LOCAL_PG_URI
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker


class SpotsGetter:
    def __init__(self, database_uri):
        self.states = []
        self.state_ids = []
        self.state_urls = []
        self.state_data = []
        self.county_data = []
        self.region_data = []
        self.spot_ids = []
        self.spot_names = []
        self.spot_address = []
        self.spot_lon = []
        self.spot_lat = []
        self.spot_urls = []
        self.spots = []
        self.engine = create_engine(database_uri)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
        }

    def get_session(self):
        return self.SessionLocal()

    def _update_states(self):

        response = requests.get(
            "https://services.surfline.com/taxonomy?type=taxonomy&id=58f7ed51dadb30820bb3879c&maxDepth=0",
            headers=self.headers,
        )
        logging.info(f"Response: {response.text}")
        json_data = response.json()
        json_contains = json_data["contains"]
        for x in json_contains:
            self.states.append(x["name"])
            self.state_ids.append(x["_id"])

        for state_id in self.state_ids:
            self.state_urls.append(
                "https://services.surfline.com/taxonomy?type=taxonomy&id="
                + state_id
                + "&maxDepth=0"
            )

    async def fetch_url(self, url, session):
        async with session.get(url, headers=self.headers) as response:
            return await response.json()

    async def fetch_all_urls(self, target):
        data = []
        async with aiohttp.ClientSession() as session:
            tasks = []
            for url in target:
                tasks.append(self.fetch_url(url, session))
            data = await asyncio.gather(*tasks)
        return data

    def update_data(self, data_target: List[str], attr_target):
        data = asyncio.run(self.fetch_all_urls(data_target))
        setattr(self, attr_target, data)

    def fetch_db_spots(self):
        with self.get_session() as db:
            stmt = select(SlSpots.spot_id)
            self.spots = db.execute(stmt).scalars().all()

    def process_spots(self):
        if len(self.states) == 0:
            self._update_states()

        self.update_data(self.state_urls, "state_data")

        county_ids = []
        for state in self.state_data:
            state_contains = state["contains"]
            for y in state_contains:
                county_ids.append(y["_id"])

        county_urls = []
        for county_id in county_ids:
            county_urls.append(
                "https://services.surfline.com/taxonomy?type=taxonomy&id="
                + county_id
                + "&maxDepth=0"
            )

        self.update_data(county_urls, "county_data")

        region_ids = []
        region_names = []
        for county in self.county_data:
            county_contains = county["contains"]
            for z in county_contains:
                region_ids.append(z["_id"])
                region_names.append(z["name"])

        region_urls = []
        for region_id in region_ids:
            region_urls.append(
                "https://services.surfline.com/taxonomy?type=taxonomy&id="
                + region_id
                + "&maxDepth=0"
            )

        self.update_data(region_urls, "region_data")

        for region in self.region_data:
            region_contains = region["contains"]
            if len(region_contains) == 0:
                self.spot_ids.append(region.get("spot", ""))
                self.spot_names.append(region.get("name", ""))
                self.spot_address.append("")
                region_associated = region["associated"]
                region_links = region_associated["links"]
                region_location = region["location"]
                region_coordinates = region_location["coordinates"]
                self.spot_lon.append(region_coordinates[0])
                self.spot_lat.append(region_coordinates[1])
                for i in region_links:
                    if i["key"] == "www":
                        self.spot_urls.append(i["href"])

        df = pd.DataFrame(
            {
                "spot_id": self.spot_ids,
                "spot_name": self.spot_names,
                "spot_lon": self.spot_lon,
                "spot_lat": self.spot_lat,
                "spot_url": self.spot_urls,
            }
        )
        df.drop_duplicates(subset=["spot_id"], inplace=True)
        # Drop entries with no spot_id
        df = df.loc[df["spot_id"] != ""]
        return df

    def run(self) -> None:
        df = self.process_spots()
        self.fetch_db_spots()
        if self.spots is not None:
            non_dupe_df = df[~df["spot_id"].isin(self.spots)]
            logging.info(f"{len(non_dupe_df)} new spots to be added.")
        else:
            non_dupe_df = df
            logging.info(f"{len(non_dupe_df)} new spots to be added.")
        non_dupe_df.to_sql("sl_spots", con=self.engine, if_exists="append", index=False)


class SpotsForecast:
    def __init__(self, database_uri, sleep_delay=60):
        self.spots = []
        self.engine = create_engine(database_uri)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.sleep_delay = sleep_delay
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
        }

    def get_session(self):
        return self.SessionLocal()

    def fetch_forecasts_to_db(self) -> List[Dict[Any, Any]]:
        chunk_total = 0
        for i in range(0, len(self.spots), 100):
            chunk = self.spots[i : i + 100]
            for spot in chunk:
                result = self.fetch_forecast(
                    SlApiEndpoints.WAVE.value, SlApiParams.SPOT_ID.value, param=spot
                )
                if result.get("associated"):
                    result["associated"]["spotId"] = spot
                    result["data"]["spotId"] = spot
                data = self.transform_wave_data(result)
                self.load_to_pg(data)
            chunk_total += len(chunk)
            logging.info(f"Processed forecasts for {chunk_total} spots out of {len(self.spots)}.")
            logging.info(f"Sleeping {self.sleep_delay} seconds to give the API a break.")
            time.sleep(self.sleep_delay)

        return data

    def fetch_forecast(
        self, endpoint: SlApiEndpoints, param_type: SlApiParams, param: str
    ) -> Dict[Any, Any]:
        base_url = "https://services.surfline.com/kbyg/spots/forecasts"
        res = requests.get(
            f"{base_url}/{endpoint}",
            params={param_type: param},
            headers=self.headers,
        )
        data = res.json()
        return data

    def fetch_spots_from_db(self) -> None:
        with self.get_session() as db:
            stmt = select(SlSpots.spot_id)
            self.spots = db.execute(stmt).scalars().all()

    def transform_wave_data(self, data: Dict) -> List[Dict[Any, Any]]:
        if not data:
            raise ValueError("Data is empty")

        # Restrict wave forecast data to 24 hour intervals
        data["data"]["wave"] = data["data"]["wave"][:24]

        meta_df = pd.json_normalize(data, sep="_")
        meta_df.drop(
            ["permissions_violations", "permissions_data", "data_wave", "data_spotId"],
            inplace=True,
            axis=1,
        )

        wave_df = pd.json_normalize(
            data, record_path=["data", "wave"], meta=[["data", "spotId"]], sep="_"
        )
        wave_df.drop("swells", inplace=True, axis=1)
        wave_df.rename(columns={"power": "wave_power"}, inplace=True)

        wave_df["timestamp_utc"] = wave_df["timestamp"].apply(
            lambda x: pendulum.from_timestamp(x).to_datetime_string()
        )
        wave_df["timestamp_utc"] = pd.to_datetime(wave_df["timestamp_utc"])
        wave_df["timestamp_utc"] = wave_df.apply(
            lambda row: row["timestamp_utc"] + pd.Timedelta(hours=row["utcOffset"]), axis=1
        )

        swell_df = pd.json_normalize(
            data,
            record_path=["data", "wave", "swells"],
            meta=[["data", "wave", "timestamp"], ["data", "spotId"]],
            sep="_",
        )

        swell_df.rename(columns={"power": "swell_power"}, inplace=True)
        swell_df["swells_idx"] = swell_df.groupby("data_wave_timestamp").cumcount()

        combined_waves_df = pd.merge(
            wave_df,
            swell_df,
            how="inner",
            left_on=["timestamp", "data_spotId"],
            right_on=["data_wave_timestamp", "data_spotId"],
        )

        combined_df = pd.merge(meta_df, combined_waves_df, how="cross")
        dict_record = combined_df.to_dict("records")

        return dict_record

    def load_to_pg(self, dict_record: List[Dict[Any, Any]]) -> None:
        with self.get_session() as db:
            db.bulk_insert_mappings(SlRatings, dict_record)
            db.commit()

    def run(self):
        self.fetch_spots_from_db()
        self.fetch_forecasts_to_db()
