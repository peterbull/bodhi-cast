import asyncio
import logging
from typing import Dict, List

import aiohttp
import pandas as pd
import requests


class SurflineSpots:
    def __init__(self):
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

    def process_spots(self):
        if len(self.states) == 0:
            self._update_states()

        self.update_data(self.state_urls, "state_data")
        logging.info("spots")

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
