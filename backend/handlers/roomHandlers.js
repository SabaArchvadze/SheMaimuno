const { v4: uuidv4 } = require('uuid');

const checkVotingResult = (io, room) => {
    const currentIds = room.players.map(p => p.id);
    
    const validVotes = Object.keys(room.votes).filter(id => currentIds.includes(id));
    
    if (validVotes.length >= room.players.length) {
        
        const voteCounts = {};
        Object.values(room.votes).forEach(targetId => {
            voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
        });

        let maxVotes = 0;
        let mostSusId = null;
        for (const [pid, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                mostSusId = pid;
            }
        }

        const impostorCaught = mostSusId === room.impostorId;
        
        const impostorObj = room.players.find(p => p.id === room.impostorId);
        const impostorName = impostorObj ? impostorObj.name : "The Impostor (Left)";

        io.to(room.code).emit('gameOver', {
            impostorCaught,
            impostorName,
            realQuestion: room.currentQuestion
        });
        room.gameState = 'RESULT';
    }
};



const createRoom = (io, socket, rooms, playerName, callback) => {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const playerId = uuidv4();

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
        avatar: Math.floor(Math.random() * 4)
    };

    rooms[roomCode].players.push(newPlayer);
    socket.join(roomCode);

    callback({
        success: true,
        roomCode,
        playerId,
        players: rooms[roomCode].players
    });
};

const joinRoom = (io, socket, rooms, { roomCode, playerName }, callback) => {
    const code = roomCode ? roomCode.toUpperCase() : "";
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
        if (!room) callback({ success: false, error: "Room not found!" });
        else callback({ success: false, error: "Game already started!" });
    }
};

const reconnect = (io, socket, rooms, { roomCode, playerId }, callback) => {
    const room = rooms[roomCode];
    if (!room) return callback({ success: false, error: "Room expired" });

    const player = room.players.find(p => p.id === playerId);
    if (!player) return callback({ success: false, error: "Player not found" });

    player.socketId = socket.id;
    socket.join(roomCode);
    io.to(roomCode).emit('updatePlayers', room.players);

    if (room.gameState === 'VOTING') {
        socket.emit('startVoting', room.answers);
    }

    callback({
        success: true,
        roomCode,
        playerId,
        gameState: room.gameState,
        players: room.players,
        hasSubmitted: room.answers.some(a => a.playerId === playerId),
        roundInfo: room.gameState !== 'LOBBY' ? {
            question: player.id === room.impostorId ? room.currentPair.impostor : room.currentPair.normal,
            role: player.id === room.impostorId ? 'IMPOSTOR' : 'NORMAL'
        } : null
    });
};

const removePlayerFromRoom = (io, room, playerId) => {
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const playerToRemove = room.players[playerIndex];
    const wasHost = playerToRemove.isHost;

    room.players.splice(playerIndex, 1);

    if (room.players.length === 0) return 'EMPTY';

    if (wasHost) {
        room.players[0].isHost = true;
    }

    if (room.gameState === 'WRITING' || room.gameState === 'VOTING') {
        
        if (playerToRemove.id === room.impostorId) {
            io.to(room.code).emit('gameOver', {
                impostorCaught: true,
                impostorName: `${playerToRemove.name} (Ran Away)`,
                realQuestion: room.currentQuestion
            });
            room.gameState = 'RESULT';
            return 'UPDATED';
        }

        if (room.gameState === 'WRITING') {
            room.answers = room.answers.filter(a => a.playerId !== playerId);
            io.to(room.code).emit('updateAnswerCount', room.answers.map(a => a.playerId));

            if (room.answers.length >= room.players.length) {
                room.gameState = 'VOTING';
                io.to(room.code).emit('startVoting', room.answers);
            }
        } 
        else if (room.gameState === 'VOTING') {
            delete room.votes[playerId];
            
            checkVotingResult(io, room);
        }
    }

    return 'UPDATED';
};

const leaveRoom = (io, socket, rooms, { roomCode, playerId }) => {
    const room = rooms[roomCode];
    if (room) {
        const result = removePlayerFromRoom(io, room, playerId);
        socket.leave(roomCode);
        
        if (result === 'EMPTY') {
            delete rooms[roomCode];
        } else {
            io.to(roomCode).emit('updatePlayers', room.players);
        }
    }
};

const checkRoom = (rooms, roomCode, callback) => {
    const code = roomCode ? roomCode.toUpperCase() : "";
    const exists = !!rooms[code]; 
    callback(exists);
};

module.exports = { createRoom, joinRoom, reconnect, leaveRoom, removePlayerFromRoom, checkRoom };