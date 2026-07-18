
import network
import usocket as socket
import time
import machine
from machine import Pin, SoftI2C, PWM
import ujson
import binascii
import os
import vatli_auth

# --- DEVICE ID từ MAC ---
_MAC      = vatli_auth.get_mac()
_SECURE_ID = vatli_auth.get_secure_id()
WS_HOST   = vatli_auth.get_ws_host("your-backend.example.com")
WS_PORT   = 443
USE_SSL   = True
DEVICE_ID = "ESP32-Capacitor-" + _SECURE_ID
WS_PATH   = "/api/lab/ws/esp32/" + DEVICE_ID

# --- HARDWARE ---
i2c = SoftI2C(scl=Pin(22), sda=Pin(21))
ina = None # Đã sửa từ rina thành ina
try:
    from ina226 import INA226
    ina = INA226(i2c, 0x40)
    print("INA226 OK")
except Exception as e:
    print("INA226 Error:", e)

# Khởi tạo LED trên chân 2
led_pin = Pin(2, Pin.OUT)
led_pwm = PWM(led_pin, freq=1000)

def set_led_brightness(voltage):
    # LED sáng theo điện áp nạp (Max ~4.2V)
    brightness = int((voltage / 4.2) * 1023)
    brightness = max(0, min(1023, brightness))
    led_pwm.duty(brightness)

def ws_send(sock, data_str):
    payload = data_str.encode()
    l = len(payload)
    header = bytearray([0x81, l | 0x80])
    mask = os.urandom(4)
    header.extend(mask)
    frame = bytearray(header)
    for i in range(l): frame.append(payload[i] ^ mask[i % 4])
    sock.write(frame)

def run_experiment():
    if not vatli_auth.connect_wifi(): return
    if not vatli_auth.check_pro_auth(_SECURE_ID):
        time.sleep(60)
        return
    addr = socket.getaddrinfo(WS_HOST, WS_PORT)[0][-1]
    s = socket.socket()
    s.connect(addr)
    if USE_SSL:
        import ssl
        s = ssl.wrap_socket(s, server_hostname=WS_HOST)

    key = binascii.b2a_base64(os.urandom(16)).decode().strip()
    handshake = (f"GET {WS_PATH}{vatli_auth.ws_query()} HTTP/1.1\r\nHost: {WS_HOST}\r\nUpgrade: websocket\r\n"
                 f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n")
    s.write(handshake.encode())
    while True:
        line = s.readline()
        if not line or line == b"\r\n": break

    print("--- HỆ THỐNG ONLINE (PIN 18650) ---")
    last_send = 0
    is_charging = False

    while True:
        if ina:
            v_bus = ina.bus_voltage
            i_shunt = ina.current # mA
            v_actual = v_bus * 2.0 # Hệ số cầu chia áp 1:1

            set_led_brightness(v_actual)

            # Nhận diện bật công tắc
            if i_shunt > 0.1:
                is_charging = True
            elif i_shunt < -0.05:
                is_charging = False

            now = time.ticks_ms()
            if time.ticks_diff(now, last_send) >= 20:
                msg = '{"v":%.3f, "i":%.2f, "sw":%d}' % (v_bus, i_shunt, 1 if is_charging else 0)
                try:
                    ws_send(s, msg)
                    last_send = now
                except: break
        time.sleep(0.005)

while True:
    try: run_experiment()
    except Exception as e:
        time.sleep(5)
