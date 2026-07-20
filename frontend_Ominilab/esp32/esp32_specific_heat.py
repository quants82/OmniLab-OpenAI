import network
import usocket as socket
import ustruct as struct
import time
import machine
from machine import Pin, SoftI2C
import ujson
import uselect
import os
import ubinascii
import vatli_auth

# --- SENSOR IMPORTS ---
try:
    import onewire, ds18x20
    HAS_DS18B20 = True
except:
    HAS_DS18B20 = False

try:
    from ina226 import INA226
    HAS_INA226 = True
except:
    HAS_INA226 = False

try:
    from i2c_lcd import I2cLcd
    HAS_LCD = True
except:
    HAS_LCD = False

# --- SYSTEM CONFIGURATION ---
WLAN = network.WLAN(network.STA_IF)
WLAN.active(True)
MAC_ADDR  = vatli_auth.get_mac()
SECURE_ID = vatli_auth.get_secure_id()
DEVICE_ID = "ESP32-SH-" + SECURE_ID

WS_HOST = vatli_auth.get_ws_host("your-backend.example.com")
WS_PORT = 443
WS_PATH = "/api/lab/ws/esp32/" + DEVICE_ID
USE_SSL = True

# --- PIN DEFINITIONS ---
PIN_DS18B20 = 4
PIN_BTN = 23
PIN_SDA = 21
PIN_SCL = 22

# --- HARDWARE INIT ---
btn = Pin(PIN_BTN, Pin.IN, Pin.PULL_UP)
i2c = SoftI2C(scl=Pin(PIN_SCL), sda=Pin(PIN_SDA), freq=100000)

ina = None
lcd = None
ds_sensor = None
roms = []

def lcd_update(l1, l2=""):
    global lcd
    if lcd:
        try:
            s1 = "{:16}".format(l1[:16])
            s2 = "{:16}".format(l2[:16])
            lcd.move_to(0, 0)
            lcd.putstr(s1)
            lcd.move_to(0, 1)
            lcd.putstr(s2)
        except: pass

def init_hardware():
    global ina, lcd, ds_sensor, roms
    # 1. DS18B20
    if HAS_DS18B20:
        try:
            ow = onewire.OneWire(Pin(PIN_DS18B20))
            ds_sensor = ds18x20.DS18X20(ow)
            roms = ds_sensor.scan()
            print("DS18B20 found:", len(roms))
        except: pass

    # 2. INA226
    if HAS_INA226:
        try:
            ina = INA226(i2c, addr=0x40)
            ina._current_lsb = 0.0001
            ina._cal_value = 25600
            ina._write_register(0x05, 25600)
            print("INA226 OK")
        except:
            print("INA226 Error or not found")

    # 3. LCD
    if HAS_LCD:
        try:
            devices = i2c.scan()
            addr = 0x27
            for d in devices:
                if d in [0x27, 0x3F]: addr = d; break
            lcd = I2cLcd(i2c, addr, 2, 16)
            lcd.clear()
            lcd.putstr("Vatli365 Start")
            lcd.move_to(0, 1)
            lcd.putstr(MAC_ADDR[-5:]) # Hiện 5 ký tự cuối của MAC
        except: pass

# --- CLOUD WEBSOCKET CLIENT ---
class CloudClient:
    def __init__(self):
        self.sock = None
        self.connected = False

    def connect(self):
        try:
            print(f"Connecting to {WS_HOST}...")
            addr = socket.getaddrinfo(WS_HOST, WS_PORT)[0][-1]
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.connect(addr)
            if USE_SSL:
                import ssl
                self.sock = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT).wrap_socket(sock, server_hostname=WS_HOST)
            else: self.sock = sock
            self.sock.setblocking(False)
            key = "dGhlIHNhbXBsZSBub25jZQ=="
            self.sock.setblocking(True)
            self.sock.write(f"GET {WS_PATH}{vatli_auth.ws_query()} HTTP/1.1\r\nHost: {WS_HOST}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n")
            while True:
                line = self.sock.readline()
                if not line or line == b'\r\n': break
            self.connected = True
            self.sock.setblocking(False)
            self.send(f"READY_SPECIFIC_HEAT:{DEVICE_ID}")
            print("Cloud Connected!")
        except Exception as e:
            print("WS Error:", e)
            self.connected = False

    def send(self, msg):
        if not self.connected: return
        try:
            frame = bytearray([0x81, len(msg) | 0x80])
            mask = [1,2,3,4]; frame.extend(bytearray(mask))
            pl = bytearray(msg.encode())
            for i in range(len(pl)): pl[i] ^= mask[i%4]
            frame.extend(pl)
            self.sock.write(frame)
        except: self.connected = False

cloud = CloudClient()
record_flag = False
def btn_handler(p):
    global record_flag
    record_flag = True
btn.irq(trigger=Pin.IRQ_FALLING, handler=btn_handler)

def main():
    global record_flag, lcd
    init_hardware()

    # Same proven flow as the other five labs: try wifi.json, otherwise open
    # the shared "Ominilab-Setup-XXXX" portal (vatli_auth resets after save).
    lcd_update("WiFi...", "AP:Setup-" + MAC_ADDR[-4:])
    if not vatli_auth.connect_wifi():
        machine.reset()

    if WLAN.isconnected():
        lcd_update("WiFi OK", WLAN.ifconfig()[0])
        time.sleep(1)
        if not vatli_auth.check_pro_auth(SECURE_ID):
            lcd_update("No client", MAC_ADDR[-5:])
            time.sleep(60)
            machine.reset()

    # Start the clock only when current actually flows through the
    # calorimeter (first is_heating). Kits without an INA226 keep the old
    # behaviour of counting from boot.
    t_start = None
    t_elapsed = 0.0
    last_send = 0
    last_lcd = 0

    while True:
        try:
            if not cloud.connected and WLAN.isconnected():
                cloud.connect()

            p, is_heating = 0, False
            if ina:
                try:
                    v = ina.bus_voltage
                    current = ina.current
                    p = v * abs(current)
                    is_heating = p > 0.5
                except: pass

            now = time.time()
            if is_heating or not ina:
                if t_start is None:
                    t_start = now
                t_elapsed = now - t_start
            else:
                t_start = None

            # Read Temp
            current_temp = 0
            if ds_sensor and roms:
                try:
                    ds_sensor.convert_temp()
                    time.sleep_ms(750) # DS18B20 need time
                    current_temp = ds_sensor.read_temp(roms[0])
                except: pass

            # Handle Button / Remote Record
            cmd = ""
            if record_flag:
                cmd = "record"
                record_flag = False

            # Send Data to Cloud
            if now - last_send >= 1:
                data = {"t": t_elapsed, "temp": current_temp, "P": p, "cmd": cmd}
                cloud.send("RESULT=" + ujson.dumps(data))
                last_send = now

            # Update LCD
            if now - last_lcd >= 1:
                l1 = "T:{:.1f} P:{:.1f}W".format(current_temp, p)
                l2 = "Time:{}s {}".format(int(t_elapsed), "HEATING" if is_heating else "READY")
                lcd_update(l1, l2)
                last_lcd = now

        except Exception as e:
            time.sleep(1)

if __name__ == "__main__":
    main()
