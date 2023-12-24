from sqlalchemy import Column, Float, Integer, String, DateTime, Interval
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.inspection import inspect

from geoalchemy2 import Geography


Base = declarative_base()

# NOAA WaveWatch III forecast


class WaveForecast(Base):
    __tablename__ = 'wave_forecast'
    id = Column(Integer, primary_key=True)
    location = Column(Geography('POINT', srid=4326))
    latitude = Column(Float)
    longitude = Column(Float)
    time = Column(DateTime(timezone=True))
    step = Column(Interval)  # using an Interval to represent a timedelta
    surface = Column(Float)
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
    entry_created = Column(DateTime(timezone=True), default=func.now())
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
