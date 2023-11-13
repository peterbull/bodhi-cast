import os
import requests
import json
from datetime import datetime


condition_list = ['rating', 'wave', 'wind', 'tides', 'weather']

# Spot Id's are listed in the url after the name of the spot
# ex. https://www.surfline.com/surf-report/1st-street-jetty/584204214e65fad6a7709ce7
params = {
    "spotId": '584204214e65fad6a7709ce7',
    "days": 1,
    "intervalHours": 1,
    "maxHeights": True,
    "sds": True
}

url = "https://services.surfline.com/kbyg/spots/forecasts/"
current_date = datetime.now().strftime("%Y-%m-%d")
filename = f"data/{current_date}_surf_data_.json"

# Check if file exists and has content
if os.path.exists(filename) and os.path.getsize(filename) > 0:
    with open(filename, 'r') as file:
        try:
            data = json.load(file)
        except json.JSONDecodeError:
            data = []
else:
    data = []

for condition in condition_list:
    res = requests.get(url + condition, params=params)

    # Check if the response is successful and has JSON content
    if res.status_code == 200 and 'application/json' in res.headers.get('Content-Type', ''):
        # Append new data
        data.append({
            "condition": condition,
            "data": res.json()
        })

# Write updated data back to the file
with open(filename, 'w') as file:
    json.dump(data, file, indent=4)
