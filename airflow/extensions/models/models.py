import os

from extensions.utils.db_config import LOCAL_PG_URI, SUPABASE_PG_URI
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
    func,
)
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.orm.session import Session

Base = declarative_base()
engine = create_engine(os.environ.get("SUPABASE_PG_URI"))
bodhi_engine = create_engine(os.environ.get("AIRFLOW__DATABASE__SQL_ALCHEMY_CONN"))


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_session(engine: Engine) -> Session:
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


class SlSpots(Base):
    __tablename__ = "sl_spots"
    spot_id = Column(Text, primary_key=True)
    spot_name = Column(Text)
    spot_lon = Column(Float)
    spot_lat = Column(Float)
    spot_url = Column(Text)


class SlRatings(Base):
    __tablename__ = "sl_ratings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    associated_units_temperature = Column(String)
    associated_units_tideHeight = Column(String)
    associated_units_swellHeight = Column(String)
    associated_units_waveHeight = Column(String)
    associated_units_windSpeed = Column(String)
    associated_units_pressure = Column(String)
    associated_utcOffset = Column(Integer)
    associated_location_lon = Column(Float)
    associated_location_lat = Column(Float)
    associated_forecastLocation_lon = Column(Float)
    associated_forecastLocation_lat = Column(Float)
    associated_offshoreLocation_lon = Column(Float)
    associated_offshoreLocation_lat = Column(Float)
    associated_runInitializationTimestamp = Column(BigInteger)
    associated_spotId = Column(String)
    timestamp = Column(String)
    probability = Column(Float)
    utcOffset = Column(Integer)
    wave_power = Column(Float)
    surf_min = Column(Integer)
    surf_max = Column(Integer)
    surf_plus = Column(Boolean)
    surf_humanRelation = Column(String)
    surf_raw_min = Column(Float)
    surf_raw_max = Column(Float)
    surf_optimalScore = Column(Integer)
    data_spotId = Column(String)
    height = Column(Float)
    period = Column(Integer)
    impact = Column(Float)
    swell_power = Column(Float)
    direction = Column(Float)
    directionMin = Column(Float)
    optimalScore = Column(Integer)
    data_wave_timestamp = Column(String)
    swells_idx = Column(Integer)
    timestamp_utc = Column(DateTime)


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
