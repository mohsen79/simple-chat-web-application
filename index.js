var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
const e = require('express');
const { exit } = require('process');
const redis = require('redis');
const client = redis.createClient();
const moment = require('moment');
var allUsers = [];
// client.on('connect', function() {
//     console.log('Connected!');
// });

server.listen(3000);

app.get('/', function(request, response) {
    // response.send('hello');
    response.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    client.zrange('room1', 0, -1, function(error, response) {
        for (let i in response) {
            let data = JSON.parse(response[i]);
            var date = new Date(data.time * 1000);
            var hours = date.getHours();
            var minutes = "0" + date.getMinutes();
            var seconds = "0" + date.getSeconds();
            var formattedTime = hours + ':' + minutes.substr(-2);
            socket.emit('chat.message', { time: formattedTime, message: data.message, username: data.name });
        }
    });
    socket.on('userName', function(name) {
        if (allUsers.includes(name) === false) {
            allUsers.push(name);
            // console.log(allUsers);
        }
        socket.userName = name;
        io.emit('online', allUsers);
        io.emit('userName', socket.userName);
        io.emit('connecting', { message: 'connected', username: socket.userName });
    });
    socket.on('chat.message', function(data) {
        var timestamp = moment().unix();
        var message = {
            name: socket.userName,
            message: data,
            time: timestamp
        };
        var date = new Date(message.time * 1000);
        var hours = date.getHours();
        var minutes = "0" + date.getMinutes();
        var seconds = "0" + date.getSeconds();
        var formattedTime = hours + ':' + minutes.substr(-2);
        client.zadd('room1', "" + message.time, JSON.stringify(message));
        io.emit('chat.message', { time: formattedTime, message: message.message, username: message.name });
    });
    socket.on('typing.message', function() {
        socket.broadcast.emit('typing.message', socket.userName);
    });
    socket.on('notTyping', function() {
        socket.broadcast.emit('notTyping');
    });
    socket.on('disconnectUser', function() {
        allUsers.pop(socket.userName);
        // console.log(allUsers);
        socket.emit('user.disconnect', { message: 'has disconnected', username: socket.userName });
        socket.broadcast.emit('user.disconnect.message', { message: 'has disconnected', username: socket.userName });
        socket.disconnect();
    });
    socket.on('disconnect', function() {
        var userIndex = allUsers.indexOf(socket.userName);
        if (userIndex > -1) {
            allUsers.splice(userIndex, 1);
        }
    });
});