from dataclasses import dataclass
from enum import Enum


@dataclass
class SlApiParams(Enum):
    SPOT_ID = "spotId"
    DAYS = "days"
    INTERVAL_HOURS = "intervalHours"
    MAX_HEIGHTS = "maxHeights"
    SDS = "sds"
    ACCESSTOKEN = "accesstoken"


@dataclass
class SlApiEndpoints(Enum):
    RATING = "rating"
    WAVE = "wave"
    WIND = "wind"
    TIDES = "tides"
    WEATHER = "weather"
