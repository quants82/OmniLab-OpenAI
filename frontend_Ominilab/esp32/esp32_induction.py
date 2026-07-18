
import machine
from machine import Pin, I2C
import network
import time
import gc
import os
import binascii
from ads1115 import ADS1115
import vatli_auth

# === CONFIG ===
WS_HOST     = vatli_auth.get_ws_host("your-backend.example.com")
WS_PORT     = 443
USE_SSL     = True
_MAC        = vatli_auth.get_mac()
_SECURE_ID = vatli_auth.get_secure_id()
DEVICE_ID   = "ESP32-Induction-" + _SECURE_ID
WS_PATH     = "/api/lab/ws/esp32/" + DEVICE_ID

SENSITIVITY = 150 # Nguong sang LED (Tang len de bot nhay)
DEADZONE    = 60  # Loc nhiễu nền (Tang len de duong 0 thang hon)
FILTER_SIZE = 4   # Bo loc lam min do thi (4 - 8 mau)

def ws_connect():
    import socket
    key = binascii.b2a_base64(os.urandom(16)).decode().strip()
    try:
        addr = socket.getaddrinfo(WS_HOST, WS_PORT)[0][-1]
        s = socket.socket()
        s.settimeout(5)
        s.connect(addr)
        if USE_SSL:
            import ssl
            s = ssl.wrap_socket(s, server_hostname=WS_HOST)
        req = (f"GET {WS_PATH}{vatli_auth.ws_query()} HTTP/1.1\r\nHost: {WS_HOST}\r\nUpgrade: websocket\r\n"
               f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n")
        s.write(req.encode())
        while True:
            line = s.readline()
            if not line or line == b"\r\n": break
        print("[WS] CONNECTED!")
        return s
    except Exception as e:
        print(f"[WS] ERR: {e}"); return None

def ws_send(sock, data_str):
    payload = data_str.encode()
    l = len(payload)
    header = bytearray([0x81, l | 0x80])
    mask = os.urandom(4)
    header.extend(mask)
    frame = bytearray(header)
    for i in range(l): frame.append(payload[i] ^ mask[i % 4])
    sock.write(frame)

def run():
    if not vatli_auth.connect_wifi(): return
    if not vatli_auth.check_pro_auth(_SECURE_ID):
        time.sleep(60)
        return
    i2c = I2C(0, scl=Pin(22), sda=Pin(21), freq=400000)
    ads = ADS1115(i2c)
    led_duong = Pin(18, Pin.OUT); led_am = Pin(19, Pin.OUT)
    sock = ws_connect()
    if not sock: return

    buf = [0] * FILTER_SIZE
    ptr = 0
    last_send = time.ticks_ms()

    print("[RUN] Smooth Mode Active...")
    while True:
        try:
            # 1. Doc vao bo loc trung binh truot
            raw = ads.read_diff_0_1()
            buf[ptr] = raw
            ptr = (ptr + 1) % FILTER_SIZE
            avg_v = sum(buf) // FILTER_SIZE

            # 2. Xu ly Deadzone
            final_v = avg_v if abs(avg_v) >= DEADZONE else 0

            # 3. Dieu khien LED
            if final_v > SENSITIVITY: led_duong.on(); led_am.off()
            elif final_v < -SENSITIVITY: led_duong.off(); led_am.on()
            else: led_duong.off(); led_am.off()

            # 4. Gui len Web (40Hz - Faster drift)
            now = time.ticks_ms()
            if time.ticks_diff(now, last_send) >= 25:
                gc.collect()
                ws_send(sock, '{"v":%d}' % final_v)
                last_send = now

            time.sleep_ms(5) # Sampling rate ~200Hz

        except Exception as e:
            print(f"[ERR] {e}"); sock.close(); return

while True:
    try: run()
    except Exception as e: print(f"Crash: {e}")
    time.sleep(5)
