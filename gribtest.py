import requests
import pygrib
import tarfile

date = '20231125'
url = f"https://nomads.ncep.noaa.gov/pub/data/nccf/com/gens/prod/gefs.20231125/00/wave/gridded/"
target = "gefs.wave.t00z.mean.global.0p25.f000.grib2"

def write_response(url, target, data='./data/'):
    response = requests.get(f'{url}/{target}')
    
    if response.status_code == 200:
        with open(f'{data}/{target}', 'wb') as f:
            f.write(response.content)
        print(f"{target} written successfully")
    else:
        print(f"Error: {response.status_code}")
write_response(url, target)

# with tarfile.open(f'./data/{target}', 'r') as tar:
#     # Extract all contents
#     tar.extractall(path='./data/extracted')

grb = pygrib.open(f'./data/{target}')