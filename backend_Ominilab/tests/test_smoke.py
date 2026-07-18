from fastapi.testclient import TestClient

from main import app


EXPECTED_FIRMWARE_IDS = {
    "harmonic-motion-bmi160",
    "specific-heat",
    "induction",
    "capacitor",
    "lamp-va",
    "resistor-va",
}


def test_health_login_and_firmware_manifest() -> None:
    with TestClient(app) as client:
        health = client.get("/api/lab/health")
        assert health.status_code == 200
        assert health.json()["experiments"] == 6

        login = client.post(
            "/api/auth/login",
            json={"username": "judge", "password": "ominilab-demo"},
        )
        assert login.status_code == 200
        token = login.json()["access_token"]

        firmware = client.get(
            "/api/lab/firmware",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert firmware.status_code == 200
        assert {item["id"] for item in firmware.json()["firmwares"]} == EXPECTED_FIRMWARE_IDS
