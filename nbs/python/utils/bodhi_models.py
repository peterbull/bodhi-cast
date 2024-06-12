from datetime import datetime, timedelta
from typing import Any, List, Optional

from geoalchemy2 import Geography
from pydantic import BaseModel, ConfigDict
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    Interval,
    String,
    Text,
    create_engine,
)
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker
from sqlalchemy.sql import func
from utils.utils import LOCAL_AIRFLOW_PG_URI

Base = declarative_base()
engine = create_engine(LOCAL_AIRFLOW_PG_URI)


def create_tables(engine: Engine):
    Base.metadata.create_all(bind=engine)


def get_session(engine: Engine) -> Session:
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


# class Spots(Base):
#     __tablename__ = "spots"
#     id = Column(Integer, primary_key=True)
#     latitude = Column(Float)
#     longitude = Column(Float)
#     spot_name = Column(String(255))
#     street_address = Column(String(255))
#     location = Column(Geography("POINT", srid=4326))


class BodhiWaves(Base):
    __tablename__ = "bodhi_waves"
    id = Column(BigInteger, primary_key=True)
    latitude = Column(Float)
    longitude = Column(Float)
    time = Column(DateTime(timezone=True))
    step = Column(Interval)  # using an Interval to represent a timedelta
    valid_time = Column(DateTime(timezone=True))
    swh = Column(Float)  # Significant height of combined wind waves and swell
    perpw = Column(Float)  # Primary wave mean period
    dirpw = Column(Float)  # Primary wave direction
    shww = Column(Float)  # Significant height of wind waves
    mpww = Column(Float)  # Mean period of wind waves
    wvdir = Column(Float)  # Direction of wind waves
    ws = Column(Float)  # Wind speed
    wdir = Column(Float)  # Wind direction
    swell = Column(Float)  # Significant height of swell waves
    swper = Column(Float)  # Mean period of swell waves
    entry_updated = Column(DateTime(timezone=True), onupdate=func.now())


# class SpotsModel(BaseModel):
#     id: int
#     latitude: float
#     longitude: float
#     spot_name: str
#     street_address: str
#     location: str

# model_config = ConfigDict(from_attributes=True)


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
