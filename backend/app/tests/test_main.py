import datetime

from app.main import app
from fastapi.testclient import TestClient

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

    response = client.get(f"/forecasts/spots/{current_date}/40.7128/-74.0060")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_get_forecasts_by_tile():
    """
    Test case for getting forecasts by tile.

    This test sends a GET request to the '/forecasts/tiles' endpoint with specific parameters.
    It asserts that the response status code is 200 and the response data is a list.
    """
    current_date = datetime.datetime.now().strftime("%Y%m%d")
    lat = "45.123"
    lng = "-75.012"
    zoom = "12"

    response = client.get(f"/forecasts/tiles/{current_date}/{lat}/{lng}/{zoom}")

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
