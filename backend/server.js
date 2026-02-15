const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const { createRoom, joinRoom, reconnect, leaveRoom, removePlayerFromRoom, checkRoom } = require('./handlers/roomHandlers');
const { startGame, submitAnswer, submitVote, retractAnswer } = require('./handlers/gameHandlers');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

let rooms = {};
let socketToRoom = {}; 

io.on('connection', (socket) => {

    const registerSocket = (socketId, roomCode) => {
        socketToRoom[socketId] = roomCode;
    };

    
    socket.on('createRoom', (name, cb) => {
        createRoom(io, socket, rooms, name, (res) => {
            if (res.success) registerSocket(socket.id, res.roomCode);
            cb(res);
        });
    });

    socket.on('joinRoom', (data, cb) => {
        joinRoom(io, socket, rooms, data, (res) => {
            if (res.success) registerSocket(socket.id, res.roomCode);
            cb(res);
        });
    });

    socket.on('reconnect', (data, cb) => {
        reconnect(io, socket, rooms, data, (res) => {
            if (res.success) registerSocket(socket.id, res.roomCode);
            cb(res);
        });
    });

    socket.on('leaveRoom', (data) => {
        leaveRoom(io, socket, rooms, data);
        delete socketToRoom[socket.id];
    });

    socket.on('disconnect', () => {
        const roomCode = socketToRoom[socket.id];
        
        if (roomCode && rooms[roomCode]) {
            const room = rooms[roomCode];
            const player = room.players.find(p => p.socketId === socket.id);
            
            if (player) {
                console.log(`[Disconnect] ${player.name} left ${roomCode}`);
                
                const result = removePlayerFromRoom(io, room, player.id);
                
                if (result === 'EMPTY') {
                    delete rooms[roomCode];
                    console.log(`[Room Deleted] ${roomCode} is empty`);
                } else {
                    io.to(roomCode).emit('updatePlayers', room.players);
                }
            }
        }
        
        delete socketToRoom[socket.id];
    });

    socket.on('checkRoom', (code, cb) => {
        checkRoom(rooms, code, cb);
    });

    socket.on('startGame', (code) => startGame(io, socket, rooms, code));
    socket.on('submitAnswer', (data) => submitAnswer(io, socket, rooms, data));
    socket.on('retractAnswer', (data) => retractAnswer(io, socket, rooms, data));
    socket.on('submitVote', (data) => submitVote(io, socket, rooms, data));
});

server.listen(3001, () => console.log('She Maimuno Server Stable v2.0 Running'));