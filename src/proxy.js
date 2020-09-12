var client = require("socket.io-client");
var fs = require('fs').promises;

var socket = client.connect("ws://mc.sui.li:807", {path: '/ws'});

let counter = 0;


socket.on('reconnect_attempt', () => {
    console.log('reconnect');
});

socket.on('connect', async () => {
    socket.emit("register", "asdfgh");
    socket.file = await fs.open('/home/pi/scann3r/projects/48.zip', 'r');
    let buffer = Buffer.alloc(100);
});

socket.on('getData', async (cb) => {
    console.log( counter++);
    let buffer = Buffer.alloc(1024*1024);
    let data = await socket.file.read(buffer, 0, 1024*1024);
    cb(data);
});