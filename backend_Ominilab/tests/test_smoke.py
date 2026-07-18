import base64
import hashlib
from types import SimpleNamespace

from fastapi.testclient import TestClient

from main import app
from routers import ai as ai_router


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
        headers = {"Authorization": f"Bearer {token}"}

        current_user = client.get("/api/auth/me", headers=headers)
        assert current_user.status_code == 200
        assert current_user.json()["username"] == "judge"

        firmware = client.get(
            "/api/lab/firmware",
            headers=headers,
        )
        assert firmware.status_code == 200
        assert {item["id"] for item in firmware.json()["firmwares"]} == EXPECTED_FIRMWARE_IDS

        bundle = client.get(
            "/api/lab/firmware/harmonic-motion-bmi160/bundle",
            headers=headers,
        )
        assert bundle.status_code == 200
        assert bundle.json()["experiment_id"] == "harmonic-motion-bmi160"
        for item in bundle.json()["files"]:
            decoded = base64.b64decode(item["data"], validate=True)
            assert len(decoded) == item["size"]
            assert hashlib.sha256(decoded).hexdigest() == item["sha256"]


def test_ai_model_is_fixed_by_the_backend(monkeypatch) -> None:
    captured: dict = {}

    class FakeResponses:
        async def create(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(output_text='{"questions":[]}')

    class FakeAsyncOpenAI:
        def __init__(self, api_key: str):
            captured["api_key"] = api_key
            self.responses = FakeResponses()

    monkeypatch.setattr(ai_router, "AsyncOpenAI", FakeAsyncOpenAI)
    monkeypatch.setattr(
        ai_router,
        "settings",
        SimpleNamespace(openai_api_key="test-only-key", openai_model="gpt-5.6"),
    )

    with TestClient(app) as client:
        login = client.post(
            "/api/auth/login",
            json={"username": "judge", "password": "ominilab-demo"},
        )
        token = login.json()["access_token"]

        response = client.post(
            "/api/ai/explain",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "messages": [{"role": "user", "content": "Use this run."}],
                "max_tokens": 120,
                "model": "browser-cannot-override-this",
            },
        )

    assert response.status_code == 200
    assert response.json()["model"] == "gpt-5.6"
    assert captured["model"] == "gpt-5.6"
    assert captured["max_output_tokens"] == 120
    assert captured["api_key"] == "test-only-key"
