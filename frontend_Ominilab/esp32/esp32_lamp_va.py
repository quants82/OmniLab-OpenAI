
import machine
from machine import Pin, SoftI2C, PWM
import network
import usocket as socket
import time
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
DEVICE_ID = "ESP32-Lamp-" + _SECURE_ID
WS_PATH   = "/api/lab/ws/esp32/" + DEVICE_ID

# --- HARDWARE ---
i2c = SoftI2C(scl=Pin(22), sda=Pin(21))

# Scan I2C
print("Scanning I2C...")
devices = i2c.scan()
if not devices:
    print("Error: No I2C devices found!")
else:
    print("I2C found at:", [hex(d) for d in devices])

ina = None
try:
    from ina226 import INA226
    ina = INA226(i2c, 0x40)

    # CALIBRATION FOR 0.002 Ohm SHUNT (R002)
    ina._current_lsb = 0.0001
    ina._cal_value = 25600
    ina._write_register(0x05, 25600)

    print("INA226 OK: Lamp V-A Mode (R002)")
except Exception as e:
    print("INA226 Error:", e)

# Status LED
led_pwm = machine.PWM(Pin(2, Pin.OUT), freq=1000)

def set_led_by_current(current_ma):
    abs_i = abs(current_ma)
    brightness = int((abs_i / 500.0) * 1023)
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

    print("--- ĐẶC TUYẾN V-A ĐÈN SỢI ĐỐT | " + DEVICE_ID + " ---")
    last_send = 0
    last_print = 0
    sim_u = 0

    while True:
        try:
            # --- MANDATORY HARDWARE CHECK ---
            if not ina:
                print("CRITICAL ERROR: No INA226 detected. Measurement halted.")
                msg = '{"error":"INA226_NOT_FOUND"}'
                ws_send(s, msg)
                time.sleep(5)
                continue

            v_bus = ina.bus_voltage
            i_ma = ina.current * 1000.0

            set_led_by_current(i_ma)
            now = time.ticks_ms()

            if time.ticks_diff(now, last_print) >= 500:
                print(f"[REAL] U: {v_bus:.3f} V | I: {i_ma:.1f} mA")
                last_print = now

            if time.ticks_diff(now, last_send) >= 50:
                msg = '{"u":%.3f, "i":%.2f, "m":"REAL"}' % (v_bus, i_ma)
                ws_send(s, msg)
                last_send = now
        except Exception as e:
            print("TX Error:", e)
            break
        time.sleep(0.01)
    s.close()

while True:
    try:
        run_experiment()
    except Exception as e:
        print("Crash/Restart:", e)
        time.sleep(5)
