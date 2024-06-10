from sqlalchemy import Column, Float, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class SlSpots(Base):
    __tablename__ = "sl_spots"
    spot_id = Column(Text, primary_key=True)
    spot_name = Column(Text)
    spot_lon = Column(Float)
    spot_lat = Column(Float)
    spot_url = Column(Text)
