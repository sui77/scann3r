#!/bin/bash

if [ $USER != "pi" ]; then
        echo "Script must be run as user: pi"
        exit -1
fi

sudo raspi-config nonint do_camera 0

cd ~
sudo apt update && sudo apt install -y zip git nodejs npm pigpio redis-server imagemagick supervisor

git clone https://github.com/sui77/scann3r.git
cd scann3r
./update.sh latest

sudo ln -s /home/pi/scann3r/scann3r-supervisor.conf /etc/supervisor/conf.d/scann3r-supervisor.conf
sudo supervisorctl update

echo ======================
echo "Scann3r should be available at one of these URLs:"
echo ""
echo "http://${HOSTNAME}:8085/"

string=`hostname -I`
IFS=' ' read -r -a array <<< "$string"
for element in "${array[@]}"
do
    echo "http://$element:8085"
done