from sqlalchemy import Column, Float, Integer, String, JSON, DateTime
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base


Base = declarative_base()

class SwellData(Base):
    __tablename__ = 'surf_data'
    id = Column(Integer, primary_key=True)
    latitude = Column(Float)
    longitude = Column(Float)
    generationtime_ms = Column(Float)
    utc_offset_seconds = Column(Integer)
    timezone = Column(String)
    timezone_abbreviation = Column(String)
    elevation = Column(Integer)
    hourly_units = Column(JSON)
    hourly = Column(DateTime(timezone=True))
    swell_wave_height = Column(Float)
    swell_wave_period = Column(Float)
    entry_created = Column(DateTime(timezone=True), default=func.now())
    entry_updated = Column(DateTime(timezone=True), onupdate=func.now())


class WaveForecast(Base):
    __tablename__ = 'wave_forecast'
    id = Column(Integer, primary_key=True)
    latitude = Column(Float)
    longitude = Column(Float)
    swh = Column(Float) # Significant height of combined wind waves and swell
    forecast_hour = Column(DateTime(timezone=True))
    entry_created = Column(DateTime(timezone=True), default=func.now())
    entry_updated = Column(DateTime(timezone=True), onupdate=func.now())