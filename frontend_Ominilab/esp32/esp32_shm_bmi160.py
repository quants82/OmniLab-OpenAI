# esp32_shm_bmi160.py — Dao động điều hòa lò xo (BMI160 Version)
# Hardware : ESP32-C3 Super Mini + BMI160 (I2C: SCL=9, SDA=8)
# Device ID: MAC-based → ESP32-SHM2-XXXXXXXXXXXX  (nhớ MAC để nhập vào web)
# WiFi     : đọc từ wifi.json (không hardcode) — tạo file wifi.json trước khi chạy
# Backend  : wss://YOUR_BACKEND/api/lab/ws/esp32/{DEVICE_ID}
#
# Cải tiến so với ADXL345 (esp32_shm_adxl345.py):
#   • BMI160 ±2g → phân giải ~0.06 mg/bit (gấp đôi độ chính xác)
#   • 200 Hz ODR → đường cong mượt hơn
#   • Gyroscope ±125°/s → cờ chất lượng gm (gyro magnitude) gửi lên web
#   • EMA 2 tầng trên thiết bị → cắt nhiễu trước khi truyền
#   • Tự động tìm trục trọng lực và gửi sự kiện "axis_info" lên web
#
# File wifi.json (đặt cùng thư mục — có thể là list hoặc object):
#   {"ssid": "TenMang", "pass": "MatKhau"}
#   hoặc: [{"ssid": "Mang1", "pass": "mk1"}, {"ssid": "Mang2", "pass": "mk2"}]
# ESP32-NEM-10003BAEED30

import machine
from machine import Pin, SoftI2C
import network
import usocket as socket
import time
import ujson
import binascii
import os
import ustruct as struct
import math
import gc
import vatli_auth

# ─── Device ID từ MAC ────────────────────────────────────────────────────────
_MAC      = vatli_auth.get_mac()
_SECURE_ID = vatli_auth.get_secure_id()
DEVICE_ID = "ESP32-SHM2-" + _SECURE_ID
WS_HOST   = vatli_auth.get_ws_host("your-backend.example.com")
WS_PORT   = 443
USE_SSL   = True
WS_PATH   = "/api/lab/ws/esp32/" + DEVICE_ID

# ─── BMI160 registers ────────────────────────────────────────────────────────
BMI160_ADDR   = 0x69
REG_CHIP_ID   = 0x00
REG_GYR_DATA  = 0x0C   # 6 bytes gyro (0x0C-0x11) + 6 bytes accel (0x12-0x17)
REG_ACC_CONF  = 0x40
REG_ACC_RANGE = 0x41
REG_GYR_CONF  = 0x42
REG_GYR_RANGE = 0x43
REG_CMD       = 0x7E

# ±2g accel: phân giải tốt nhất cho SHM (biên độ thường < 5cm → a < 2 m/s²)
ACC_SCALE = 2.0 / 32768.0 * 9.80665       # ≈ 0.000598 m/s²/LSB
# ±125°/s gyro: đủ để phát hiện rung lắc, phân giải cao nhất
GYR_SCALE = 125.0 / 32768.0 * math.pi / 180.0  # ≈ 0.0000666 rad/s/LSB

INTERVAL_MS = 5   # 200 Hz

# ─── I2C ─────────────────────────────────────────────────────────────────────
try:
    i2c = SoftI2C(scl=Pin(9), sda=Pin(8), freq=400000)
except Exception:
    i2c = SoftI2C(scl=Pin(22), sda=Pin(21), freq=400000)

# ─── BMI160 init ─────────────────────────────────────────────────────────────
def init_bmi160():
    try:
        found = i2c.scan()
        if BMI160_ADDR not in found:
            print(f"BMI160 không tìm thấy! Bus I2C: {[hex(d) for d in found]}")
            return False
        chip_id = i2c.readfrom_mem(BMI160_ADDR, REG_CHIP_ID, 1)[0]
        if chip_id != 0xD1:
            print(f"Chip ID sai: 0x{chip_id:02X} (cần 0xD1)")
            return False

        # Accel: normal mode (cmd 0x11) → chờ startup → ±2g, 200 Hz, normal_avg4
        i2c.writeto_mem(BMI160_ADDR, REG_CMD,       b'\x11')
        time.sleep_ms(100)
        i2c.writeto_mem(BMI160_ADDR, REG_ACC_CONF,  b'\x29')  # 200Hz, OSS4
        i2c.writeto_mem(BMI160_ADDR, REG_ACC_RANGE, b'\x03')  # ±2g

        # Gyro: normal mode (cmd 0x15) → chờ startup → ±125°/s, 200 Hz
        i2c.writeto_mem(BMI160_ADDR, REG_CMD,       b'\x15')
        time.sleep_ms(100)
        i2c.writeto_mem(BMI160_ADDR, REG_GYR_CONF,  b'\x29')  # 200Hz
        i2c.writeto_mem(BMI160_ADDR, REG_GYR_RANGE, b'\x04')  # ±125°/s
        time.sleep_ms(10)

        print("BMI160 OK — accel ±2g @ 200Hz, gyro ±125°/s @ 200Hz")
        return True
    except Exception as e:
        print("BMI160 lỗi:", e)
        return False

# ─── Đọc IMU: 12 bytes liên tiếp (gyro rồi accel) ────────────────────────────
def read_imu():
    try:
        data = i2c.readfrom_mem(BMI160_ADDR, REG_GYR_DATA, 12)
        gx = struct.unpack('<h', data[0:2])[0]  * GYR_SCALE
        gy = struct.unpack('<h', data[2:4])[0]  * GYR_SCALE
        gz = struct.unpack('<h', data[4:6])[0]  * GYR_SCALE
        ax = struct.unpack('<h', data[6:8])[0]  * ACC_SCALE
        ay = struct.unpack('<h', data[8:10])[0] * ACC_SCALE
        az = struct.unpack('<h', data[10:12])[0]* ACC_SCALE
        return gx, gy, gz, ax, ay, az
    except Exception:
        return 0.0, 0.0, 0.0, 0.0, 0.0, 9.81

# ─── WebSocket helpers ────────────────────────────────────────────────────────
def _sock_write_all(sock, buf):
    try:
        mv = memoryview(buf)
        sent = 0
        while sent < len(mv):
            n = sock.write(mv[sent:])
            if n is None:
                time.sleep_ms(1)
                continue
            if n <= 0:
                return False
            sent += n
        return True
    except Exception:
        return False

def ws_send_frame(sock, payload_bytes, opcode=0x1):
    payload = payload_bytes or b""
    l = len(payload)
    header = bytearray([0x80 | (opcode & 0x0F)])
    if l < 126:
        header.append(0x80 | l)
    elif l < 65536:
        header.append(0x80 | 126)
        header.extend(struct.pack("!H", l))
    mask = os.urandom(4)
    header.extend(mask)
    frame = bytearray(header)
    for i in range(l):
        frame.append(payload[i] ^ mask[i & 3])
    return _sock_write_all(sock, frame)

def ws_send(sock, data_str):
    try:
        return ws_send_frame(sock, data_str.encode(), opcode=0x1)
    except Exception:
        return False

def ws_read_cmd(sock):
    """Đọc lệnh từ web không block.
    Socket đã ở chế độ non-blocking — KHÔNG gọi settimeout để tránh treo SSL socket.
    """
    try:
        header = sock.read(2)
        if not header or len(header) < 2: return None
        b0, b1 = header[0], header[1]
        opcode  = b0 & 0x0F
        masked  = (b1 & 0x80) != 0
        plen    = b1 & 0x7F
        if opcode == 0x8: return "close"
        if plen == 126:
            ext  = sock.read(2)
            plen = struct.unpack("!H", ext)[0] if ext and len(ext) >= 2 else 0
        mk = sock.read(4) if masked else b""
        pk = b""
        if plen:
            while len(pk) < plen:
                chunk = sock.read(plen - len(pk))
                if not chunk: break
                pk += chunk
            if masked and mk:
                pk = bytes([pk[i] ^ mk[i & 3] for i in range(len(pk))])
        if opcode != 0x1: return None
        msg = pk.decode()
        if "calib" in msg or "reset" in msg: return "calib"
        if "stop"  in msg: return "stop"
        if "start" in msg: return "start"
    except Exception:
        pass
    return None

# ─── Hiệu chuẩn & phát hiện trục trọng lực ──────────────────────────────────
CALIB_N = 200  # 1 giây ở 200 Hz

def calibrate(sock):
    """Thu thập 1s dữ liệu khi đứng yên.
    Trả về: (gMean, gravAxis, gyrBias)
      gMean    : giá trị trọng lực đo được trên trục đứng (m/s²)
      gravAxis : 'x'|'y'|'z'
      gyrBias  : (bx, by, bz) rad/s — zero-rate offset
    """
    ws_send(sock, '{"event":"calibrating","p":0}')
    sumAcc = [0.0, 0.0, 0.0]
    sumGyr = [0.0, 0.0, 0.0]
    for n in range(1, CALIB_N + 1):
        gx, gy, gz, ax, ay, az = read_imu()
        sumAcc[0] += ax; sumAcc[1] += ay; sumAcc[2] += az
        sumGyr[0] += gx; sumGyr[1] += gy; sumGyr[2] += gz
        if n % 40 == 0:
            ws_send(sock, '{"event":"calibrating","p":%d}' % (n * 100 // CALIB_N))
        time.sleep_ms(INTERVAL_MS)

    N = float(CALIB_N)
    mX = sumAcc[0] / N
    mY = sumAcc[1] / N
    mZ = sumAcc[2] / N

    absX, absY, absZ = abs(mX), abs(mY), abs(mZ)
    if absX >= absY and absX >= absZ:
        gravAxis, gMean = 'x', mX
    elif absY >= absX and absY >= absZ:
        gravAxis, gMean = 'y', mY
    else:
        gravAxis, gMean = 'z', mZ

    gyrBias = (sumGyr[0] / N, sumGyr[1] / N, sumGyr[2] / N)

    print(f"Calib OK: trục={gravAxis} g={gMean:.4f} bias=({gyrBias[0]:.4f},{gyrBias[1]:.4f},{gyrBias[2]:.4f})")
    ws_send(sock, '{"event":"calib_done","axis":"%s","g":%.4f,"bx":%.5f,"by":%.5f,"bz":%.5f}' % (
        gravAxis, gMean, gyrBias[0], gyrBias[1], gyrBias[2]))
    return gMean, gravAxis, gyrBias

# ─── Main experiment loop ─────────────────────────────────────────────────────
def run_experiment():
    if not vatli_auth.connect_wifi():  return
    if not vatli_auth.check_pro_auth(_SECURE_ID):
        time.sleep(60)
        return
    if not init_bmi160():   return

    try:
        addr = socket.getaddrinfo(WS_HOST, WS_PORT)[0][-1]
        s = socket.socket()
        s.connect(addr)
        if USE_SSL:
            import ssl
            s = ssl.wrap_socket(s, server_hostname=WS_HOST)

        key = binascii.b2a_base64(os.urandom(16)).decode().strip()
        handshake = (
            f"GET {WS_PATH}{vatli_auth.ws_query()} HTTP/1.1\r\nHost: {WS_HOST}\r\n"
            f"Upgrade: websocket\r\nConnection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
        )
        _sock_write_all(s, handshake.encode())

        try: s.settimeout(5)
        except: pass
        status_line = s.readline()
        if not status_line or b"101" not in status_line:
            print("WS handshake fail:", status_line)
            return
        while True:
            line = s.readline()
            if not line or line == b"\r\n": break

        print(f"=== DAO ĐỘNG ĐIỀU HÒA BMI160 | {DEVICE_ID} ===")
        print("Vào web, nhập MAC sau: " + DEVICE_ID[len("ESP32-SHM2-"):])
        s.setblocking(False)
        ws_send(s, ujson.dumps({"event": "device_online", "id": DEVICE_ID}))

        # ── Hiệu chuẩn ban đầu ──────────────────────────────────────────────
        gMean, gravAxis, gyrBias = calibrate(s)

        # ── EMA state ───────────────────────────────────────────────────────
        # Dùng EMA 2 tầng: tầng 1 cắt nhiễu điện (α=0.40), tầng 2 cắt rung (α=0.20)
        e1x = e1y = e1z = 0.0
        e2x = e2y = e2z = 0.0
        A1, A2 = 0.40, 0.20

        state       = "running"  # "running" hoặc "stopped"
        t_start     = time.ticks_ms()
        last_send   = t_start
        debug_count = 0
        fail_count  = 0
        gc_count    = 0

        while True:
            now = time.ticks_ms()

            cmd = ws_read_cmd(s)
            if cmd == "calib" or cmd == "reset":
                gMean, gravAxis, gyrBias = calibrate(s)
                e1x = e1y = e1z = 0.0
                e2x = e2y = e2z = 0.0
                t_start = time.ticks_ms()
                state = "running"
                continue
            elif cmd == "stop":
                state = "stopped"
                ws_send(s, '{"event":"stopped"}')
            elif cmd == "start":
                state = "running"
                t_start = time.ticks_ms()
                ws_send(s, '{"event":"started"}')
            elif cmd == "close":
                break

            if time.ticks_diff(now, last_send) < INTERVAL_MS:
                time.sleep_ms(1)
                continue
            last_send = now

            gx, gy, gz, ax, ay, az = read_imu()

            # Trừ gyro bias
            gx -= gyrBias[0]; gy -= gyrBias[1]; gz -= gyrBias[2]

            # EMA 2 tầng trên accel
            e1x = A1 * ax + (1.0 - A1) * e1x
            e1y = A1 * ay + (1.0 - A1) * e1y
            e1z = A1 * az + (1.0 - A1) * e1z
            e2x = A2 * e1x + (1.0 - A2) * e2x
            e2y = A2 * e1y + (1.0 - A2) * e2y
            e2z = A2 * e1z + (1.0 - A2) * e2z

            # Gyro magnitude (rad/s) → chỉ số chất lượng: cao = đang quay/rung
            gm = math.sqrt(gx * gx + gy * gy + gz * gz)

            t_ms = time.ticks_diff(now, t_start)

            if state == "running":
                # Gửi accel đã lọc EMA 2 tầng + gyro magnitude
                msg = ('{"t":%d,"ax":%.4f,"ay":%.4f,"az":%.4f,"gm":%.4f}'
                       % (t_ms, e2x, e2y, e2z, gm))
                if ws_send(s, msg):
                    fail_count = 0
                    gc_count += 1
                    if gc_count >= 200:  # mỗi 1 giây ở 200Hz
                        gc.collect()
                        gc_count = 0
                else:
                    fail_count += 1
                    if fail_count >= 10:
                        raise OSError("WS mat ket noi")

            debug_count += 1
            if debug_count >= 100:  # In mỗi 0.5s
                aV = e2x if gravAxis == 'x' else (e2y if gravAxis == 'y' else e2z)
                print(f"t={t_ms}ms a_vert={aV:.4f} gm={gm:.4f} axis={gravAxis}")
                debug_count = 0

    except Exception as e:
        print("Lỗi kết nối:", e)
        time.sleep(3)


# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"=== THIẾT BỊ ĐÃ SẴN SÀNG ===")
    print(f"ID Thiết bị: {DEVICE_ID}")
    print(f"Device ID to enter on the web (12 characters): {_SECURE_ID}")
    while True:
        try:
            run_experiment()
        except KeyboardInterrupt:
            print("Dừng.")
            break
        except Exception as e:
            print("Khởi động lại:", e)
            time.sleep(3)
