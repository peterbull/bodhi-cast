from sqlalchemy import Column, Float, Integer, String, JSON, DateTime
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