# AVA Project - LCD SCREEN

<img src="https://github.com/eddie2070/ava/blob/master/img/20200323_091426.jpg"/>
<img src="https://github.com/eddie2070/ava/blob/master/img/20200323_091429.jpg"/>
<img src="https://github.com/eddie2070/ava/blob/master/img/20200323_091453.jpg"/>

Hardware is a Sunfounder 10.1-inch IPS LCD Monitor for Raspberry Pi.

## Install

pi@raspberrypi:~ $ sudo apt-get install vim npm

### Deploy
pi@raspberrypi:~ $ git clone https://github.com/eddie2070/ava.git

### Auto start

pi@raspberrypi:~ $ cat /etc/rc.local
```
# By default this script does nothing.

cd /home/pi/ava/ava; /usr/bin/npm start

# Print the IP address
_IP=$(hostname -I) || true
if [ "$_IP" ]; then
  printf "My IP address is %s\n" "$_IP"
fi

exit 0
```

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

### Screen HDMI configuration (if screen stays black)

pi@raspberrypi:~ $ sudo cat /boot/config.txt
```
# For more options and information see
# http://rpf.io/configtxt
# Some settings may impact device functionality. See link above for details

# uncomment if you get no picture on HDMI for a default "safe" mode
#hdmi_safe=1

# uncomment this if your display has a black border of unused pixels visible
# and your display can output without overscan
#disable_overscan=1

# uncomment the following to adjust overscan. Use positive numbers if console
# goes off screen, and negative if there is too much border
#overscan_left=16
#overscan_right=16
#overscan_top=16
#overscan_bottom=16

# uncomment to force a console size. By default it will be display's size minus
# overscan.
#framebuffer_width=1280
#framebuffer_height=720

# uncomment if hdmi display is not detected and composite is being output
#hdmi_force_hotplug=1
#ADDED EK
hdmi_cvt=1024 600 60 3 0 0 0

# uncomment to force a specific HDMI mode (this will force VGA)
#hdmi_group=1
#hdmi_mode=1
#ADDED
hdmi_group=2
hdmi_mode=87
hdmi_drive=2

# uncomment to force a HDMI mode rather than DVI. This can make audio work in
# DMT (computer monitor) modes
#hdmi_drive=2

# uncomment to increase signal to HDMI, if you have interference, blanking, or
# no display
#config_hdmi_boost=4

# uncomment for composite PAL
#sdtv_mode=2

#uncomment to overclock the arm. 700 MHz is the default.
#arm_freq=800

# Uncomment some or all of these to enable the optional hardware interfaces
#dtparam=i2c_arm=on
#dtparam=i2s=on
#dtparam=spi=on

# Uncomment this to enable the lirc-rpi module
#dtoverlay=lirc-rpi

# Additional overlays and parameters are documented /boot/overlays/README

# Enable audio (loads snd_bcm2835)
dtparam=audio=on

[pi4]
# Enable DRM VC4 V3D driver on top of the dispmanx display stack
dtoverlay=vc4-fkms-v3d
max_framebuffers=2

[all]
#dtoverlay=vc4-fkms-v3d

# NOOBS Auto-generated Settings:
hdmi_force_hotplug=1
```