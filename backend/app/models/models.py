from geoalchemy2 import Geography
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, Interval, String
from sqlalchemy.inspection import inspect
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

# NOAA WaveWatch III forecast


class WaveForecast(Base):
    __tablename__ = "wave_forecast"
    id = Column(Integer, primary_key=True)
    location = Column(Geography("POINT", srid=4326))
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


class Spots(Base):
    __tablename__ = "spots"
    id = Column(Integer, primary_key=True)
    latitude = Column(Float)
    longitude = Column(Float)
    spot_name = Column(String(255))
    street_address = Column(String(255))

    def as_dict(self):
        return {c.key: getattr(self, c.key) for c in inspect(self).mapper.column_attrs}


class StationInventory(Base):
    __tablename__ = "station_inventory"
    id = Column(Integer, primary_key=True)
    latitude = Column(Float)
    longitude = Column(Float)
    has_water_level = Column(Boolean)
    has_wind = Column(Boolean)
    has_air_temperature = Column(Boolean)
    location = Column(Geography("POINT", srid=4326))
    entry_updated = Column(DateTime(timezone=True), onupdate=func.now())
