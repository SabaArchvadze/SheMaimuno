const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// Import our new handlers
const { createRoom, joinRoom, reconnect, leaveRoom } = require('./handlers/roomHandlers');
const { startGame, submitAnswer, submitVote } = require('./handlers/gameHandlers');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Global State
let rooms = {};

io.on('connection', (socket) => {
    
    // --- ROOM HANDLERS ---
    socket.on('createRoom', (name, cb) => createRoom(io, socket, rooms, name, cb));
    socket.on('joinRoom', (data, cb) => joinRoom(io, socket, rooms, data, cb));
    socket.on('reconnect', (data, cb) => reconnect(io, socket, rooms, data, cb));
    socket.on('leaveRoom', (data) => leaveRoom(io, socket, rooms, data));

    // --- GAME HANDLERS ---
    socket.on('startGame', (code) => startGame(io, socket, rooms, code));
    socket.on('submitAnswer', (data) => submitAnswer(io, socket, rooms, data));
    socket.on('submitVote', (data) => submitVote(io, socket, rooms, data));

});

server.listen(3001, () => console.log('She Maimuno Server Running (Refactored)'));