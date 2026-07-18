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

WIFI_CFG_FILE = "wifi.json"

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

# --- WIFI MANAGER ---
class WiFiManager:
    def __init__(self):
        self.ssid = ""
        self.password = ""
        self.load_config()

    def load_config(self):
        try:
            with open(WIFI_CFG_FILE, "r") as f:
                cfg = ujson.load(f)
                self.ssid = cfg.get("ssid", "")
                self.password = cfg.get("pass", "")
        except: pass

    def save_config(self, ssid, password):
        try:
            with open(WIFI_CFG_FILE, "w") as f:
                ujson.dump({"ssid": ssid, "pass": password}, f)
        except: pass

    def connect(self, timeout=15):
        if not self.ssid: return False

        WLAN.active(True)
        WLAN.connect(self.ssid, self.password)
        print(f"Connecting to {self.ssid}...")

        start = time.time()
        while not WLAN.isconnected() and (time.time() - start) < timeout:
            time.sleep(0.5)

        return WLAN.isconnected()

    def start_portal(self):
        ap = network.WLAN(network.AP_IF)
        ap.active(True)
        ap_name = "Vatli365_Setup_{}".format(MAC_ADDR.replace(':', '')[-4:])
        ap.config(essid=ap_name, password="ominilab-open")

        print(f"Portal started: {ap_name}")
        lcd_update("Setup WiFi:", ap_name)

        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(('', 80))
        s.listen(1)

        while True:
            if btn.value() == 0: # Bấm giữ nút để thoát portal
                time.sleep(2)
                if btn.value() == 0: break

            try:
                s.settimeout(1)
                conn, addr = s.accept()
                request = conn.recv(1024).decode()

                if "/save" in request:
                    import ure
                    ssid = ure.search("ssid=([^&]*)", request).group(1).replace("+", " ")
                    password = ure.search("pass=([^&]*)", request).group(1).replace("+", " ")
                    self.save_config(ssid, password)

                    html = "<html><body><h1>OK! ESP32 is restarting...</h1></body></html>"
                    conn.send("HTTP/1.1 200 OK\r\n\r\n" + html)
                    conn.close()
                    time.sleep(2)
                    machine.reset()

                # Scan WiFi
                WLAN.active(True)
                nets = WLAN.scan()
                net_options = ""
                for n in nets:
                    net_name = n[0].decode()
                    net_options += f'<option value="{net_name}">{net_name}</option>'

                html = f"""
                <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
                <style>body{{font-family:sans-serif;padding:20px;background:#f0f4f8}}
                .card{{background:white;padding:20px;border-radius:10px;box-shadow:0 2px 5px rgba(0,0,0,0.1)}}
                h2{{color:#2563eb}} input,select{{width:100%;padding:10px;margin:10px 0;border:1px solid #ccc;border-radius:5px}}
                button{{width:100%;padding:12px;background:#2563eb;color:white;border:none;border-radius:5px}}</style></head>
                <body><div class="card"><h2>Vatli365 WiFi Setup</h2><p>MAC: {MAC_ADDR}</p>
                <form action="/save"><label>Chọn WiFi:</label><select name="ssid_sel" onchange="this.form.ssid.value=this.value">
                <option value="">-- Chọn --</option>{net_options}</select>
                <input type="text" name="ssid" placeholder="Tên WiFi">
                <input type="password" name="pass" placeholder="Mật khẩu">
                <button type="submit">LƯU VÀ KẾT NỐI</button></form></div></body></html>
                """
                conn.send("HTTP/1.1 200 OK\r\n\r\n" + html)
                conn.close()
            except: pass

        ap.active(False)

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

    wifi = WiFiManager()
    if not wifi.connect():
        wifi.start_portal()

    if WLAN.isconnected():
        lcd_update("WiFi OK", WLAN.ifconfig()[0])
        time.sleep(1)
        if not vatli_auth.check_pro_auth(SECURE_ID):
            lcd_update("No client", MAC_ADDR[-5:])
            time.sleep(60)
            machine.reset()

    t_start = time.time()
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
            t_elapsed = now - t_start

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
