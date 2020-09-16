#!/bin/sh
if [ $USER != "pi" ]; then
        echo "Script must be run as user: pi"
        exit -1
fi

sudo raspi-config nonint do_camera 0

cd ~
sudo apt update && apt install -y zip git nodejs npm pigpio redis-server imagemagick supervisor

git clone https://github.com/sui77/scann3r.git
cd scann3r
./update.sh
