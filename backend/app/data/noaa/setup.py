from setuptools import setup, find_packages

setup(
    name='wavewatch',
    version='0.1',
    packages=find_packages(),
    description='A module for processing Wavewatch data',
    install_requires=[
        'pandas',
        'xarray',
        'requests',
        'beautifulsoup4',
        'geoalchemy2',
        'shapely',
        'sqlalchemy',
        'pytz'
    ],
)