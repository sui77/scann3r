#!/bin/bash
TAG=`curl --silent "https://api.github.com/repos/sui77/scann3r/releases/latest" | grep -Po '"tag_name": "\K.*?(?=")'`
git checkout -f $TAG
npm update
