from __future__ import annotations

import base64
import hashlib
import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect

from config import settings
from dependencies import current_user


router = APIRouter(prefix="/api/lab", tags=["physics-lab"])
DEVICE_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{3,80}$")


EXPERIMENTS = {
    "harmonic-motion-bmi160": {
        "title": "Harmonic Motion with BMI160",
        "source": "esp32_shm_bmi160.py",
        "files": ["vatli_auth.py"],
    },
    "specific-heat": {
        "title": "Specific Heat Capacity of Water",
        "source": "esp32_specific_heat.py",
        "files": ["ina226.py", "i2c_lcd.py", "vatli_auth.py"],
    },
    "induction": {
        "title": "Electromagnetic Induction",
        "source": "esp32_induction.py",
        "files": ["ads1115.py", "vatli_auth.py"],
    },
    "capacitor": {
        "title": "Capacitor Charge and Discharge",
        "source": "esp32_capacitor.py",
        "files": ["vatli_auth.py"],
    },
    "lamp-va": {
        "title": "Incandescent Lamp I-V Characteristic",
        "source": "esp32_lamp_va.py",
        "files": ["vatli_auth.py"],
    },
    "resistor-va": {
        "title": "Resistor I-V Characteristic",
        "source": "esp32_resistor_va.py",
        "files": ["vatli_auth.py"],
    },
}

BASE_FIRMWARES = {
    "ESP32": {"base_file": "/firmware/base/esp32-v1.28.0.bin", "address": "0x1000"},
    "ESP32-C3": {"base_file": "/firmware/base/esp32-c3-v1.28.0.bin", "address": "0x0"},
    "ESP32-S2": {"base_file": "/firmware/base/esp32-s2-v1.28.0.bin", "address": "0x1000"},
    "ESP32-S3": {"base_file": "/firmware/base/esp32-s3-v1.28.0.bin", "address": "0x0"},
    "ESP32-C6": {"base_file": "/firmware/base/esp32-c6-v1.28.0.bin", "address": "0x0"},
}


class ConnectionManager:
    def __init__(self) -> None:
        self.esp32: dict[str, WebSocket] = {}
        self.browsers: dict[str, list[WebSocket]] = {}

    async def add_esp32(self, device_id: str, socket: WebSocket) -> None:
        await socket.accept()
        previous = self.esp32.get(device_id)
        if previous is not None:
            try:
                await previous.close(code=4000)
            except Exception:
                pass
        self.esp32[device_id] = socket

    async def add_browser(self, device_id: str, socket: WebSocket) -> None:
        await socket.accept()
        self.browsers.setdefault(device_id, []).append(socket)

    def remove_browser(self, device_id: str, socket: WebSocket) -> None:
        clients = self.browsers.get(device_id, [])
        if socket in clients:
            clients.remove(socket)
        if not clients:
            self.browsers.pop(device_id, None)

    async def send_to_browsers(self, device_id: str, message: str) -> None:
        live: list[WebSocket] = []
        for socket in self.browsers.get(device_id, []):
            try:
                await socket.send_text(message)
                live.append(socket)
            except Exception:
                pass
        if live:
            self.browsers[device_id] = live
        else:
            self.browsers.pop(device_id, None)

    async def send_to_esp32(self, device_id: str, message: str) -> None:
        socket = self.esp32.get(device_id)
        if socket is not None:
            try:
                await socket.send_text(message)
            except Exception:
                self.esp32.pop(device_id, None)


manager = ConnectionManager()


def _valid_device_id(device_id: str) -> str:
    value = device_id.strip()
    if not DEVICE_ID_PATTERN.fullmatch(value):
        raise ValueError("Invalid device ID")
    return value


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "esp32_connections": len(manager.esp32),
        "browser_channels": len(manager.browsers),
        "experiments": len(EXPERIMENTS),
    }


@router.get("/firmware")
def firmware_manifest(_: dict = Depends(current_user)) -> dict:
    builds = {
        family: {**build, "file": build["base_file"], "delivery": "mpy", "ready": True,
                 "flash_encryption": False, "secure_boot": False}
        for family, build in BASE_FIRMWARES.items()
    }
    return {
        "version": 1,
        "firmwares": [
            {"id": experiment_id, "title": item["title"], "source": item["source"], "builds": builds}
            for experiment_id, item in EXPERIMENTS.items()
        ],
    }


def _bundle_file(path: Path, output_name: str, replace_host: bool = False) -> dict:
    if not path.is_file() or path.parent.resolve() != settings.firmware_source_dir:
        raise HTTPException(status_code=500, detail=f"Missing public firmware source: {path.name}")
    data = path.read_bytes()
    if replace_host:
        data = data.replace(b"your-backend.example.com", settings.public_ws_host.encode("ascii"))
    return {
        "path": output_name,
        "size": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "data": base64.b64encode(data).decode(),
    }


@router.get("/firmware/{experiment_id}/bundle")
def firmware_bundle(experiment_id: str, _: dict = Depends(current_user)) -> dict:
    item = EXPERIMENTS.get(experiment_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Unknown experiment")
    files = [_bundle_file(settings.firmware_source_dir / item["source"], "main.py", replace_host=True)]
    files.extend(_bundle_file(settings.firmware_source_dir / name, name, replace_host=True) for name in item["files"])
    return {"experiment_id": experiment_id, "mpy_version": 6, "files": files}


@router.websocket("/ws/esp32/{device_id}")
async def esp32_socket(websocket: WebSocket, device_id: str) -> None:
    try:
        device_id = _valid_device_id(device_id)
    except ValueError:
        await websocket.close(code=1008)
        return
    await manager.add_esp32(device_id, websocket)
    try:
        while True:
            await manager.send_to_browsers(device_id, await websocket.receive_text())
    except WebSocketDisconnect:
        pass
    finally:
        if manager.esp32.get(device_id) is websocket:
            manager.esp32.pop(device_id, None)


@router.websocket("/ws/client/{device_id}")
async def browser_socket(websocket: WebSocket, device_id: str) -> None:
    try:
        device_id = _valid_device_id(device_id)
    except ValueError:
        await websocket.close(code=1008)
        return
    await manager.add_browser(device_id, websocket)
    try:
        while True:
            await manager.send_to_esp32(device_id, await websocket.receive_text())
    except WebSocketDisconnect:
        pass
    finally:
        manager.remove_browser(device_id, websocket)
