import datetime

from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


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
