const { v4: uuidv4 } = require('uuid');
const { startVotingPayloadExtras, getResultQuestionFields } = require('../questionHelpers');
const { resolveVotingResult, buildVoteBreakdown } = require('./voteResolution');
const AVATAR_VARIANTS = 3;
const MAX_PLAYERS_PER_ROOM = 9;
const MIN_PLAYERS_TO_CONTINUE = 3;

const buildLeaderboard = (room) => (
    room.players
        .map(p => ({ name: p.name, score: p.score, avatar: p.avatar, isImpostor: p.id === room.impostorId }))
        .sort((a, b) => b.score - a.score)
);

const getUniquePlayerName = (room, requestedName) => {
    const baseName = String(requestedName || '').trim() || 'Player';
    const takenNames = new Set(room.players.map(p => String(p.name || '')));
    if (!takenNames.has(baseName)) return baseName;

    let suffix = 1;
    let candidate = `${baseName} (${suffix})`;
    while (takenNames.has(candidate)) {
        suffix += 1;
        candidate = `${baseName} (${suffix})`;
    }
    return candidate;
};

const resetRoundStateToLobby = (io, room, { messageKey, message } = {}) => {
    room.gameState = 'LOBBY';
    room.answers = [];
    room.votes = {};
    room.currentQuestion = null;
    room.impostorId = null;
    room.currentPair = null;

    io.to(room.code).emit('gameReset', { messageKey, message });
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

    const uniqueName = getUniquePlayerName(rooms[roomCode], playerName);
    const newPlayer = {
        id: playerId,
        socketId: socket.id,
        name: uniqueName,
        isHost: true,
        score: 0,
        avatar: Math.floor(Math.random() * AVATAR_VARIANTS)
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
        if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
            callback({ success: false, error: "Room is full (max 9 players)." });
            return;
        }

        const uniqueName = getUniquePlayerName(room, playerName);
        const playerId = uuidv4();
        const newPlayer = {
            id: playerId,
            socketId: socket.id,
            name: uniqueName,
            isHost: false,
            score: 0,
            avatar: Math.floor(Math.random() * AVATAR_VARIANTS)
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

    const previousSocketAlive = player.socketId && io.sockets.sockets.get(player.socketId);
    if (!previousSocketAlive) {
        player.socketId = socket.id;
    }
    socket.join(roomCode);
    io.to(roomCode).emit('updatePlayers', room.players);

    if (room.gameState === 'VOTING') {
        const hasVoted = Boolean(room.votes[playerId]);
        socket.emit('startVoting', {
            answers: room.answers,
            normalQuestion: room.currentQuestion,
            ...startVotingPayloadExtras(room),
            yourHasVoted: hasVoted
        });
    }

    const nqExtras = startVotingPayloadExtras(room);
    callback({
        success: true,
        roomCode,
        playerId,
        gameState: room.gameState,
        normalQuestion: room.currentQuestion,
        ...nqExtras,
        players: room.players,
        hasSubmitted: room.answers.some(a => a.playerId === playerId),
        submittedCount: room.answers.length,
        hasVoted: room.gameState === 'VOTING' ? Boolean(room.votes[playerId]) : undefined,
        result: room.gameState === 'RESULT' ? room.lastGameOver : undefined,
        roundInfo: room.gameState !== 'LOBBY' && room.currentPair && room.currentPair.ka ? (() => {
            const isImpostor = player.id === room.impostorId;
            const side = isImpostor ? 'impostor' : 'normal';
            const cp = room.currentPair;
            return {
                role: isImpostor ? 'IMPOSTOR' : 'NORMAL',
                question: cp.ka[side],
                questionKa: cp.ka[side],
                questionEn: cp.en[side],
            };
        })() : null
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

    if (room.players.length < MIN_PLAYERS_TO_CONTINUE && room.gameState !== 'LOBBY') {
        resetRoundStateToLobby(io, room, { messageKey: 'belowMinPlayers' });
        return 'UPDATED';
    }

    if (room.gameState === 'WRITING' || room.gameState === 'VOTING') {
        
        if (playerToRemove.id === room.impostorId) {
            const payload = {
                impostorCaught: true,
                impostorName: `${playerToRemove.name} (Ran Away)`,
                ...getResultQuestionFields(room),
                outcome: "CAUGHT",
                leaderboard: buildLeaderboard(room),
                voteBreakdown: buildVoteBreakdown(room)
            };
            io.to(room.code).emit('gameOver', payload);
            room.lastGameOver = payload;
            room.gameState = 'RESULT';
            return 'UPDATED';
        }

        if (room.gameState === 'WRITING') {
            room.answers = room.answers.filter(a => a.playerId !== playerId);
            io.to(room.code).emit('updateAnswerCount', room.answers.map(a => a.playerId));

            if (room.answers.length >= room.players.length) {
                room.gameState = 'VOTING';
                io.to(room.code).emit('startVoting', {
                    answers: room.answers,
                    normalQuestion: room.currentQuestion,
                    ...startVotingPayloadExtras(room),
                });
            }
        } 
        else if (room.gameState === 'VOTING') {
            delete room.votes[playerId];
            room.answers = room.answers.filter(a => a.playerId !== playerId);
            Object.keys(room.votes).forEach(voterId => {
                if (room.votes[voterId] === playerId) {
                    delete room.votes[voterId];
                }
            });
            io.to(room.code).emit('startVoting', {
                answers: room.answers,
                normalQuestion: room.currentQuestion,
                ...startVotingPayloadExtras(room),
            });
            
            resolveVotingResult(io, room);
        }
    }

    return 'UPDATED';
};

const leaveRoom = (io, socket, rooms, { roomCode, playerId }) => {
    const room = rooms[roomCode];
    if (room) {
        const player = room.players.find(p => p.id === playerId);
        if (!player || player.socketId !== socket.id) return;
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

const kickPlayer = (io, socket, rooms, { roomCode, targetPlayerId }, callback) => {
    const room = rooms[roomCode];
    if (!room) return callback({ success: false, error: 'Room not found.' });
    if (room.gameState !== 'LOBBY') return callback({ success: false, error: 'Kicking is only allowed in lobby.' });

    const host = room.players.find(p => p.isHost);
    if (!host || host.socketId !== socket.id) return callback({ success: false, error: 'Only host can kick players.' });

    const target = room.players.find(p => p.id === targetPlayerId);
    if (!target) return callback({ success: false, error: 'Player not found.' });
    if (target.id === host.id) return callback({ success: false, error: 'Host cannot kick themselves.' });

    io.to(target.socketId).emit('kicked', { messageKey: 'kicked' });
    const targetSocket = io.sockets.sockets.get(target.socketId);
    if (targetSocket) {
        targetSocket.leave(roomCode);
    }

    const result = removePlayerFromRoom(io, room, targetPlayerId);
    if (result === 'EMPTY') {
        delete rooms[roomCode];
    } else {
        io.to(roomCode).emit('updatePlayers', room.players);
    }

    callback({ success: true, kickedName: target.name });
};

module.exports = {
    createRoom,
    joinRoom,
    reconnect,
    leaveRoom,
    removePlayerFromRoom,
    checkRoom,
    kickPlayer
};