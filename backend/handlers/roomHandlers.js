const { v4: uuidv4 } = require('uuid');

const createRoom = (io, socket, rooms, playerName, callback) => {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const playerId = uuidv4(); // Permanent ID

    rooms[roomCode] = {
        code: roomCode,
        players: [],
        gameState: 'LOBBY',
        answers: [],
        votes: {},
        currentQuestion: null,
        impostorId: null
    };

    const newPlayer = {
        id: playerId,
        socketId: socket.id,
        name: playerName,
        isHost: true,
        score: 0,
        avatar: Math.floor(Math.random() * 4) // Random Monkey Face 0-3
    };

    rooms[roomCode].players.push(newPlayer);
    socket.join(roomCode);

    console.log(`Room Created: ${roomCode}`); // Debug Log

    // IMPORTANT: We are sending an OBJECT, not just a string
    callback({
        success: true,
        roomCode: roomCode, // The frontend looks for this specific key!
        playerId: playerId,
        players: rooms[roomCode].players
    });
};

const joinRoom = (io, socket, rooms, { roomCode, playerName }, callback) => {
    // Force Uppercase so case doesn't matter
    const code = roomCode ? roomCode.toUpperCase() : "";

    console.log(`Attempting to join room: ${code}`);

    const room = rooms[code];

    if (room && room.gameState === 'LOBBY') {
        const playerId = uuidv4();
        const newPlayer = {
            id: playerId,
            socketId: socket.id,
            name: playerName,
            isHost: false,
            score: 0,
            avatar: Math.floor(Math.random() * 4)
        };

        room.players.push(newPlayer);
        socket.join(code);

        io.to(code).emit('updatePlayers', room.players);

        callback({ success: true, roomCode: code, playerId, players: room.players });
    } else {
        if (!room) callback({ success: false, error: "Room not found! (Did server restart?)" });
        else callback({ success: false, error: "Game already started!" });
    }
};

const reconnect = (io, socket, rooms, { roomCode, playerId }, callback) => {
    const room = rooms[roomCode];
    if (room) {
        const player = room.players.find(p => p.id === playerId);
        if (player) {
            player.socketId = socket.id;
            socket.join(roomCode);

            callback({
                success: true,
                gameState: room.gameState,
                players: room.players,
                player: player,
                roundInfo: room.gameState !== 'LOBBY' ? {
                    question: player.id === room.impostorId ? room.currentPair.impostor : room.currentPair.normal,
                    role: player.id === room.impostorId ? 'IMPOSTOR' : 'NORMAL'
                } : null
            });
            return;
        }
    }
    callback({ success: false });
}

const leaveRoom = (io, socket, rooms, { roomCode, playerId }) => {
    const room = rooms[roomCode];
    if (room) {
        // Remove player
        room.players = room.players.filter(p => p.id !== playerId);
        
        // Notify others
        io.to(roomCode).emit('updatePlayers', room.players);
        console.log(`Player ${playerId} left Room ${roomCode}`); // LOG 1

        // Destroy room if empty
        if (room.players.length === 0) {
            delete rooms[roomCode];
            console.log(`Room ${roomCode} is empty and deleted.`); // LOG 2
        }
    }
};

module.exports = { createRoom, joinRoom, reconnect, leaveRoom };