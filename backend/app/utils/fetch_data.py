from requests import get
from app.models.models import SwellData
from app.db.database import SessionLocal

def fetch_data():
    url = "https://marine-api.open-meteo.com/v1/marine?latitude=36.83088925769251&longitude=-75.96727139259976&hourly=swell_wave_height,swell_wave_period"
    res = get(url)
    return res.json()

def parse_swell_data(json_data):
    hourly_data = json_data.get('hourly', {})
    times = hourly_data.get('time', [])
    heights = hourly_data.get('swell_wave_height', [])
    periods = hourly_data.get('swell_wave_period', [])

    swell_data_list = []

    for time, height, period in zip(times, heights, periods):
        swell_data = SwellData(
                    latitude=json_data.get('latitude'),
                    longitude=json_data.get('longitude'),
                    generationtime_ms=json_data.get('generationtime_ms'),
                    utc_offset_seconds=json_data.get('utc_offset_seconds'),
                    timezone=json_data.get('timezone'),
                    timezone_abbreviation=json_data.get('timezone_abbreviation'),
                    elevation=json_data.get('elevation'),
                    hourly_units=json_data.get('hourly_units'),
                    hourly=time,
                    swell_wave_height=height,
                    swell_wave_period=period
                    )
        swell_data_list.append(swell_data)

    return swell_data_list

def save_swell_data(parsed_data):
    db = SessionLocal()
    try:
        for data in parsed_data:
            db.add(data)
        db.commit()
    finally:
        db.close()