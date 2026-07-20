import time
from machine import I2C

# PCF8574 Address (Default is usually 0x27 or 0x3F)
DEFAULT_I2C_ADDR = 0x27

# Commands
LCD_CLEARDISPLAY = 0x01
LCD_RETURNHOME = 0x02
LCD_ENTRYMODESET = 0x04
LCD_DISPLAYCONTROL = 0x08
LCD_CURSORSHIFT = 0x10
LCD_FUNCTIONSET = 0x20
LCD_SETCGRAMADDR = 0x40
LCD_SETDDRAMADDR = 0x80

# Flags for display entry mode
LCD_ENTRYRIGHT = 0x00
LCD_ENTRYLEFT = 0x02
LCD_ENTRYSHIFTINCREMENT = 0x01
LCD_ENTRYSHIFTDECREMENT = 0x00

# Flags for display on/off control
LCD_DISPLAYON = 0x04
LCD_DISPLAYOFF = 0x00
LCD_CURSORON = 0x02
LCD_CURSOROFF = 0x00
LCD_BLINKON = 0x01
LCD_BLINKOFF = 0x00

# Flags for display/cursor shift
LCD_DISPLAYMOVE = 0x08
LCD_CURSORMOVE = 0x00
LCD_MOVERIGHT = 0x04
LCD_MOVELEFT = 0x00

# Flags for function set
LCD_8BITMODE = 0x10
LCD_4BITMODE = 0x00
LCD_2LINE = 0x08
LCD_1LINE = 0x00
LCD_5x10DOTS = 0x04
LCD_5x8DOTS = 0x00

# Flags for backlight control
LCD_BACKLIGHT = 0x08
LCD_NOBACKLIGHT = 0x00

class I2cLcd:
    def __init__(self, i2c, i2c_addr, num_lines, num_columns):
        self.i2c = i2c
        self.i2c_addr = i2c_addr
        self.num_lines = num_lines
        self.num_columns = num_columns
        self.backlight = LCD_BACKLIGHT
        self.display_function = LCD_4BITMODE | LCD_1LINE | LCD_5x8DOTS
        if num_lines > 1:
            self.display_function |= LCD_2LINE

        # Initialize
        time.sleep(0.050)
        self.expanderWrite(self.backlight)
        time.sleep(1)
        self.write4bits(0x03 << 4)
        time.sleep(0.0045)
        self.write4bits(0x03 << 4)
        time.sleep(0.0045)
        self.write4bits(0x03 << 4)
        time.sleep(0.00015)
        self.write4bits(0x02 << 4)

        self.command(LCD_FUNCTIONSET | self.display_function)
        self.display_control = LCD_DISPLAYON | LCD_CURSOROFF | LCD_BLINKOFF
        self.command(LCD_DISPLAYCONTROL | self.display_control)
        self.command(LCD_CLEARDISPLAY)
        time.sleep(0.002)
        self.display_mode = LCD_ENTRYLEFT | LCD_ENTRYSHIFTDECREMENT
        self.command(LCD_ENTRYMODESET | self.display_mode)
        self.command(LCD_RETURNHOME)
        time.sleep(0.002)

    def expanderWrite(self, _data):
        self.i2c.writeto(self.i2c_addr, bytes([_data | self.backlight]))

    def pulseEnable(self, _data):
        self.expanderWrite(_data | 0x04) # En high
        time.sleep(0.000001)
        self.expanderWrite(_data & ~0x04) # En low
        time.sleep(0.000050)

    def write4bits(self, value):
        self.expanderWrite(value)
        self.pulseEnable(value)

    def send(self, value, mode):
        highnib = value & 0xf0
        lownib = (value << 4) & 0xf0
        self.write4bits(highnib | mode)
        self.write4bits(lownib | mode)

    def command(self, value):
        self.send(value, 0)

    def write(self, value):
        self.send(value, 1)

    def clear(self):
        self.command(LCD_CLEARDISPLAY)
        time.sleep(0.002)

    def move_to(self, col, row):
        row_offsets = [0x00, 0x40, 0x14, 0x54]
        if row > self.num_lines: row = self.num_lines - 1
        self.command(LCD_SETDDRAMADDR | (col + row_offsets[row]))

    def putstr(self, string):
        for char in string:
            if char == '\n':
                self.command(0xC0) # Go to 2nd line
            else:
                self.write(ord(char))
                
    def backlight_on(self):
        self.backlight = LCD_BACKLIGHT
        self.expanderWrite(0)
        
    def backlight_off(self):
        self.backlight = LCD_NOBACKLIGHT
        self.expanderWrite(0)
