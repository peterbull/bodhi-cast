from sqlalchemy import BigInteger, Boolean, Column, Float, Integer, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


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
