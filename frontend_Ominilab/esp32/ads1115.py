
import struct

class ADS1115:
    def __init__(self, i2c, address=0x48):
        self.i2c = i2c
        self.address = address
        self._is_configured = False

    def _setup_continuous(self):
        # Config: MUX=000 (A0-A1), PGA=001 (4.096V), Mode=0 (Continuous), DR=111 (860 SPS)
        # 0x82E3: 1000 0010 1110 0011
        config = 0x82E3
        data = struct.pack('>BH', 0x01, config)
        self.i2c.writeto(self.address, data)
        self._is_configured = True

    def read_diff_0_1(self):
        if not self._is_configured:
            self._setup_continuous()

        # Doc ket qua tu thanh ghi Conversion (0x00)
        res = self.i2c.readfrom_mem(self.address, 0x00, 2)
        return struct.unpack('>h', res)[0]
