const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");
const cors = require('cors');

const { createRoom, joinRoom, reconnect, leaveRoom, removePlayerFromRoom, checkRoom, kickPlayer } = require('./handlers/roomHandlers');
const { startGame, submitAnswer, submitVote, retractAnswer, backToLobby } = require('./handlers/gameHandlers');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3001;

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// In production the backend also serves the built React frontend so the whole
// app runs from a single origin (no CORS, one URL/domain).
const FRONTEND_BUILD = path.join(__dirname, '..', 'frontend', 'build');
app.use(express.static(FRONTEND_BUILD));
app.get('/healthz', (req, res) => res.status(200).send('ok'));
// SPA fallback: any non-asset, non-socket route returns index.html.
app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(FRONTEND_BUILD, 'index.html'), (err) => {
        if (err) next();
    });
});

let rooms = {};
let socketToRoom = {}; 
const pendingDisconnects = {};
const RECONNECT_GRACE_MS = 15000;

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
            if (res.success) {
                registerSocket(socket.id, res.roomCode);
                if (pendingDisconnects[data.playerId]) {
                    clearTimeout(pendingDisconnects[data.playerId]);
                    delete pendingDisconnects[data.playerId];
                }
            }
            cb(res);
        });
    });

    socket.on('leaveRoom', (data) => {
        if (data && data.playerId && pendingDisconnects[data.playerId]) {
            clearTimeout(pendingDisconnects[data.playerId]);
            delete pendingDisconnects[data.playerId];
        }
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
                const disconnectedSocketId = socket.id;

                if (pendingDisconnects[player.id]) {
                    clearTimeout(pendingDisconnects[player.id]);
                }

                pendingDisconnects[player.id] = setTimeout(() => {
                    const latestRoom = rooms[roomCode];
                    if (!latestRoom) return;

                    const latestPlayer = latestRoom.players.find(p => p.id === player.id);
                    if (!latestPlayer || latestPlayer.socketId !== disconnectedSocketId) return;

                    const result = removePlayerFromRoom(io, latestRoom, player.id);

                    if (result === 'EMPTY') {
                        delete rooms[roomCode];
                        console.log(`[Room Deleted] ${roomCode} is empty`);
                    } else {
                        io.to(roomCode).emit('updatePlayers', latestRoom.players);
                    }

                    delete pendingDisconnects[player.id];
                }, RECONNECT_GRACE_MS);
            }
        }
        
        delete socketToRoom[socket.id];
    });

    socket.on('checkRoom', (code, cb) => {
        checkRoom(rooms, code, cb);
    });

    socket.on('startGame', (code) => startGame(io, socket, rooms, code));
    socket.on('backToLobby', (code) => backToLobby(io, socket, rooms, code));
    socket.on('kickPlayer', (data, cb = () => {}) => kickPlayer(io, socket, rooms, data, cb));
    socket.on('submitAnswer', (data) => submitAnswer(io, socket, rooms, data));
    socket.on('retractAnswer', (data) => retractAnswer(io, socket, rooms, data));
    socket.on('submitVote', (data) => submitVote(io, socket, rooms, data));
});

server.listen(PORT, () => console.log(`She Maimuno Server Stable v2.0 Running on ${PORT}`));