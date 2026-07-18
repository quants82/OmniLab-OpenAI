"""Open Ominilab Wi-Fi helper with no subscription gate or device secrets."""

import machine
import network
import time
import ujson

try:
    import usocket as socket
except ImportError:
    import socket


CONFIG_FILE = "wifi.json"


def get_mac():
    raw = network.WLAN(network.STA_IF).config("mac")
    return "".join("{:02X}".format(byte) for byte in raw)


def get_secure_id():
    return get_mac()


def get_ws_host(default="your-backend.example.com"):
    try:
        with open(CONFIG_FILE, "r") as handle:
            return ujson.load(handle).get("host", default) or default
    except Exception:
        return default


def ws_query():
    return ""


def check_pro_auth(_device_id=None):
    return True


def _load_config():
    try:
        with open(CONFIG_FILE, "r") as handle:
            return ujson.load(handle)
    except Exception:
        return {}


def _try_station(config, timeout_seconds=15):
    ssid = config.get("ssid", "")
    if not ssid:
        return False
    station = network.WLAN(network.STA_IF)
    station.active(True)
    if not station.isconnected():
        station.connect(ssid, config.get("password", ""))
    deadline = time.time() + timeout_seconds
    while not station.isconnected() and time.time() < deadline:
        time.sleep(0.25)
    return station.isconnected()


def _form_value(request, name):
    marker = (name + "=").encode()
    body = request.split(b"\r\n\r\n", 1)[-1]
    for item in body.split(b"&"):
        if item.startswith(marker):
            value = item[len(marker):].replace(b"+", b" ")
            return value.decode().replace("%3A", ":").replace("%2F", "/")
    return ""


def _setup_portal():
    access_point = network.WLAN(network.AP_IF)
    access_point.active(True)
    access_point.config(essid="Ominilab-Setup-" + get_mac()[-4:])
    server = socket.socket()
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", 80))
    server.listen(1)
    server.settimeout(180)
    page = """<!doctype html><html><meta name=viewport content='width=device-width'>
    <body style='font-family:sans-serif;max-width:520px;margin:40px auto;padding:20px'>
    <h2>Ominilab ESP32 setup</h2><p>Device ID: <b>{device}</b></p>
    <form method=post><label>Wi-Fi name</label><br><input name=ssid required style='width:100%;padding:10px'><br><br>
    <label>Wi-Fi password</label><br><input name=password type=password style='width:100%;padding:10px'><br><br>
    <label>Backend hostname</label><br><input name=host value='{host}' required style='width:100%;padding:10px'><br><br>
    <button style='padding:12px 20px'>Save and restart</button></form></body></html>"""
    try:
        while True:
            client, _ = server.accept()
            request = client.recv(4096)
            if request.startswith(b"POST "):
                config = {
                    "ssid": _form_value(request, "ssid"),
                    "password": _form_value(request, "password"),
                    "host": _form_value(request, "host") or "your-backend.example.com",
                }
                with open(CONFIG_FILE, "w") as handle:
                    ujson.dump(config, handle)
                client.send(b"HTTP/1.1 200 OK\r\nContent-Type:text/html\r\n\r\nSaved. Restarting...")
                client.close()
                time.sleep(1)
                machine.reset()
            html = page.format(device=get_mac(), host=get_ws_host())
            client.send(b"HTTP/1.1 200 OK\r\nContent-Type:text/html\r\n\r\n" + html.encode())
            client.close()
    except Exception:
        pass
    finally:
        server.close()
        access_point.active(False)


def connect_wifi():
    if _try_station(_load_config()):
        return True
    _setup_portal()
    return False
