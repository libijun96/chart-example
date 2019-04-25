const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

http.listen(3000, function () {
    console.log('listening on *:3000');
});

// 命名广播
const adminNamespace = io.of('/admin');
adminNamespace.to('level1').emit('an event', {some: 'data_room'});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.origins((origin, callback) => {
    if (origin !== 'http://localhost:3000/') {
        return callback('origin not allowed', false);
    }
    callback(null, true);
});

// 自定义套接字ID
io.engine.generateId = (req) => {
    return "custom:id:" + 1; // custom id must be unique
}

// 获取连接到此命名空间的客户机ID
io.clients((error, clients) => {
    if (error) throw error;
    console.log(clients); // => [6em3d4TJP8Et9EMNAAAA, G5p55dHhGgUnLUctAAAB]
});

// middleware
io.use((socket, next) => {
    let token = socket.handshake.query.token;
    let clientId = socket.handshake.headers['x-clientid'];
    if (typeof (token) === 'string' && clientId === 'abc') {
        return next();
    } else {
        return next(new Error('authentication error'));
    }
});

io.on('connect', function (socket) {
    console.log('a user connected');
    let token = socket.handshake.query.token;
    console.log(token)
    console.log(socket.id);
    // 标识客房所在房间的字符串散列，按房间名称索引。
    socket.join('room 237', () => {
        let rooms = Object.keys(socket.rooms);
        console.log(rooms + 'room'); // [ <socket.id>, 'room 237' ]
        // broadcast to everyone in the room
        io.to('room 237', 'a new user has joined the room');
    });
    socket.use((packet, next) => {
        return next();
        // if (packet.doge === true) return next();
        // next(new Error('Not a doge error'));
    });
    // 触发事件
    socket.on('chat message', function (msg) {
        // 广播信息
        io.emit('chat message', msg);
        console.log('message: ' + msg);
    });
    socket.on('error', (error) => {
        console.log(error)
    });
    // 当客户端断开连接（但尚未离开rooms）时触发
    socket.on('disconnecting', (reason) => {
        let rooms = Object.keys(socket.rooms);
        console.log(rooms + 'leaving room...')
    });
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
    // 重新连接
    socket.on('reconnect_attempt', function (msg) {
        io.emit('reconnect_attempt', msg);
    });
});