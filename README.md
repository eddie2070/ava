AVA Project - LCD SCREEN


## Install

### Auto start
pi@raspberrypi:~ $ sudo cat /etc/xdg/lxsession/LXDE-pi/autostart

```
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
#@xscreensaver -no-splash
point-rpi

#Disable screensave
@xset s noblank
@xset s off
@xset -dpms

@/usr/bin/chromium-browser --kiosk --ignore-certificate-errors --noerrors --disable-session-crashed-bubble --disable-infobars --disable-overlay-scrollbar --disable-restore-session-state --app=http://127.0.0.1:3000
```
