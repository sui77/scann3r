# Scann3r

Scann3r is a firmware and user interface for the [OpenScan Mini](https://en.openscan.eu/openscan-mini)

## Quick Install
(Only tested on `Raspberry Pi OS (32-bit) Lite / Debian Buster` yet.)

    bash <(curl -s https://raw.githubusercontent.com/sui77/scann3r/master/install.sh)


## Install

#### Dependencies
First install all dependencies.

    sudo apt update && apt install -y zip git nodejs npm pigpio redis-server imagemagick supervisor

#### Setup Raspberry Camera
If your camera is not set up yet, you need to enable it and reboot.

    sudo raspi-config nonint do_camera 0
    reboot

#### Install Scann3r
Checkout the source and run the update script which will get the latest release. You should do that as user pi.

    cd /home/pi
    git clone https://github.com/sui77/scann3r.git
    cd scann3r
    ./update.sh

#### Setup supervisor
Supervisor will start scanner on boot and keep it running. If you installed it in a different directory than `/home/pi/scann3r` or want to run scann3r as a different user than `pi` you need to edit the configuration file.

    ln -s ./scann3r-supervisor.conf /etc/supervisor/conf.d/scann3r-supervisor.conf
    supervisorctl update