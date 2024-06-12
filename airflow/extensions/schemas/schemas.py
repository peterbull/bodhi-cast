from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict


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


class SlOffshoreIdx(BaseModel):
    associated_spotId: str
    associated_offshoreLocation_lat: float
    associated_offshoreLocation_lon: float

    model_config = ConfigDict(from_attributes=True)


class BodhiWavesModel(BaseModel):
    id: int
    location: str
    latitude: float
    longitude: float
    time: datetime
    step: timedelta
    valid_time: datetime
    swh: Optional[float]
    perpw: Optional[float]
    dirpw: Optional[float]
    shww: Optional[float]
    mpww: Optional[float]
    wvdir: Optional[float]
    ws: Optional[float]
    wdir: Optional[float]
    swell: Optional[float]
    swper: Optional[float]
    entry_updated: datetime

    model_config = ConfigDict(from_attributes=True)
