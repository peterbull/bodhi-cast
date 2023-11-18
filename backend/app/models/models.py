from sqlalchemy import Column, Float, Integer, String, ARRAY, JSON
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class SurfData(Base):
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
    hourly = Column(Float)
    swell_wave_height = Column(Float)  # Assuming array of float values
    swell_wave_period = Column(Float)  # Assuming array of float values
