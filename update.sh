#!/bin/bash
TAG=`curl --silent "https://api.github.com/repos/$1/releases/latest" | grep -Po '"tag_name": "\K.*?(?=")'`
git checkout -f $TAG
npm update
