import datetime
import json

from app.main import app
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

client = TestClient(app)


def test_read_root():
    """
    Test case for the read root endpoint.

    Sends a GET request to the root endpoint ("/") and asserts that the response
    status code is 200. Then, it checks that the response data is a dictionary.

    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)


def test_get_forecasts_by_spot():
    """
    Test case for getting forecasts by spot.

    This test sends a GET request to the '/forecasts/spots' endpoint with specific parameters.
    It asserts that the response status code is 200 and the response data is a list.
    """
    current_date = datetime.datetime.now().strftime("%Y%m%d")
    lat = "36.83055459542353"
    lng = "-75.96764801341773"
    response = client.get(f"/forecasts/spots/{current_date}/{lat}/{lng}")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_get_all_spots():
    """
    Test case for getting all spots.

    This test sends a GET request to the '/spots' endpoint.
    It asserts that the response status code is 200 and the response data is a list.
    """
    response = client.get("/spots")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_get_nearby_station_data():
    """
    Test case for getting nearby station data.

    This test sends a GET request to the '/current/spots/{range}/{lat}/{lng}' endpoint with specific parameters.
    It asserts that the response status code is 200 and the response data is a list.
    """
    range = "1000"
    lat = "36.83055459542353"
    lng = "-75.96764801341773"
    response = client.get(f"/current/spots/{range}/{lat}/{lng}")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for item in data:
        assert isinstance(item, dict)
        assert "id" in item
        assert "station_id" in item
        assert "latitude" in item
        assert "longitude" in item
        assert "location" in item
        assert "distance" in item


def test_get_nearby_station_data_with_db():
    """
    Test case for getting nearby station data with database session.

    This test sends a GET request to the '/current/spots/{range}/{lat}/{lng}' endpoint with specific parameters.
    It asserts that the response status code is 200 and the response data is a list.
    """
    range = "1000"
    lat = "36.83055459542353"
    lng = "-75.96764801341773"
    response = client.get(f"/current/spots/{range}/{lat}/{lng}")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for item in data:
        assert isinstance(item, dict)
        assert "id" in item
        assert "station_id" in item
        assert "latitude" in item
        assert "longitude" in item
        assert "location" in item
        assert "distance" in item


def test_get_nearby_station_data_with_db_mocked():
    """
    Test case for getting nearby station data with mocked database session.

    This test sends a GET request to the '/current/spots/{range}/{lat}/{lng}' endpoint with specific parameters.
    It asserts that the response status code is 200 and the response data is a list.
    """
    range = "1000"
    lat = "36.83055459542353"
    lng = "-75.96764801341773"
    response = client.get(f"/current/spots/{range}/{lat}/{lng}")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for item in data:
        assert isinstance(item, dict)
        assert "id" in item
        assert "station_id" in item
        assert "latitude" in item
        assert "longitude" in item
        assert "location" in item
        assert "distance" in item


def test_get_nearby_station_data_with_redis():
    """
    Test case for getting nearby station data with Redis.

    This test sends a GET request to the '/current/spots/{range}/{lat}/{lng}' endpoint with specific parameters.
    It asserts that the response status code is 200 and the response data is a list.
    """
    range = "1000"
    lat = "36.83055459542353"
    lng = "-75.96764801341773"
    response = client.get(f"/current/spots/{range}/{lat}/{lng}")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for item in data:
        assert isinstance(item, dict)
        assert "id" in item
        assert "station_id" in item
        assert "latitude" in item
        assert "longitude" in item
        assert "location" in item
        assert "distance" in item
        assert "data" in item
        assert isinstance(item["data"], dict)
        assert "key1" in item["data"]
        assert "key2" in item["data"]
        assert "key3" in item["data"]
        assert "key4" in item["data"]
        assert "key5" in item["data"]
