import asyncio
import logging
from typing import Any, Dict, List, Optional

import aiohttp
import pandas as pd
import pendulum
import requests
from plugins.models.models import SlRatings, SlSpots
from plugins.schemas.schemas import SlApiEndpoints, SlApiParams
from plugins.utils.db_config import LOCAL_PG_URI
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker


def fetch_from_sl_api(endpoint: SlApiEndpoints, param_type: SlApiParams, param: str):
    base_url = "https://services.surfline.com/kbyg/spots/forecasts"
    res = requests.get(f"{base_url}/{endpoint}", params={param_type: param})
    data = res.json()
    return data


def cull_extra_days(full_json):
    if "data" in full_json and "rating" in full_json["data"]:
        full_json["data"]["rating"] = full_json["data"]["rating"][:24]


class SurflineSpots:
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

    def _update_states(self):
        response = requests.get(
            "https://services.surfline.com/taxonomy?type=taxonomy&id=58f7ed51dadb30820bb3879c&maxDepth=0"
        )
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
        logging.info(f"{len(self.state_urls)}")

    async def fetch_url(self, url, session):
        async with session.get(url) as response:
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
        return df

    def run(self) -> None:
        df = self.process_spots()
        results = self.fetch_db_spots()
        non_dupe_df = df[~df["spot_id"].isin(results)]
        non_dupe_df.to_sql("sl_spots", con=self.engine, if_exists="append", index=False)


class SpotForecast:
    def __init__(self, database_uri):
        self.spots = []
        self.engine = create_engine(database_uri)
        self.SessionLocal = sessionmaker(bind=self.engine)

    def get_session(self):
        return self.SessionLocal()

    def fetch_all_forecasts(self) -> List[Dict[Any, Any]]:
        data = []
        for spot in self.spots[:2]:
            result = self.fetch_forecast(
                SlApiEndpoints.WAVE.value, SlApiParams.SPOT_ID.value, param=spot
            )
            if result.get("associated"):
                result["associated"]["spotId"] = spot
                result["data"]["spotId"] = spot
            data.append(result)
        return data

    def fetch_forecast(
        self, endpoint: SlApiEndpoints, param_type: SlApiParams, param: str
    ) -> Dict[Any, Any]:
        base_url = "https://services.surfline.com/kbyg/spots/forecasts"
        res = requests.get(f"{base_url}/{endpoint}", params={param_type: param})
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

    def process_all_spot_ratings(self):
        self.fetch_spots_from_db()
        data = self.fetch_all_forecasts()
        for spot in data:
            record = self.transform_wave_data(spot)
            self.load_to_pg(record)
