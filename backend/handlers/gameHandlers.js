const questionList = require('../questions');
const { startVotingPayloadExtras } = require('../questionHelpers');
const { resolveVotingResult } = require('./voteResolution');
const MIN_PLAYERS_TO_START = 3;

const getRandomQuestion = () => {
    if (!questionList || questionList.length === 0) return null;
    return questionList[Math.floor(Math.random() * questionList.length)];
};

const startGame = (io, socket, rooms, roomCode) => {
    const room = rooms[roomCode];
    if (!room || room.players.length < MIN_PLAYERS_TO_START) return; 
    const host = room.players.find(p => p.isHost);
    if (!host || host.socketId !== socket.id) return;

    room.gameState = 'WRITING';
    room.answers = [];
    room.votes = {};

    const impostorIndex = Math.floor(Math.random() * room.players.length);
    room.impostorId = room.players[impostorIndex].id;

    const qPair = getRandomQuestion();
    if (!qPair) {
        room.currentPair = {
            id: 0,
            ka: { normal: 'Error', impostor: 'Error' },
            en: { normal: 'Error', impostor: 'Error' },
        };
    } else {
        room.currentPair = qPair;
    }
    room.currentQuestion = room.currentPair.ka.normal;

    room.players.forEach(p => {
        const isImpostor = p.id === room.impostorId;
        const side = isImpostor ? 'impostor' : 'normal';
        const cp = room.currentPair;
        io.to(p.socketId).emit('roundStart', {
            role: isImpostor ? 'IMPOSTOR' : 'NORMAL',
            question: cp.ka[side],
            questionKa: cp.ka[side],
            questionEn: cp.en[side],
        });
    });
    
    io.to(roomCode).emit('updateGameState', 'WRITING');
};

const submitAnswer = (io, socket, rooms, { roomCode, playerId, answer }) => {
    const room = rooms[roomCode];
    if (!room || room.gameState !== 'WRITING') return;

    const player = room.players.find(p => p.id === playerId);
    if (!player || player.socketId !== socket.id) return;

    const existingIndex = room.answers.findIndex(a => a.playerId === playerId);
    if (existingIndex !== -1) {
        room.answers[existingIndex].text = answer;
    } else {
        room.answers.push({ playerId, name: player.name, text: answer, avatar: player.avatar });
    }

    io.to(roomCode).emit('updateAnswerCount', room.answers.map(a => a.playerId));

    if (room.answers.length >= room.players.length) {
        room.gameState = 'VOTING';
        io.to(roomCode).emit('startVoting', {
            answers: room.answers,
            normalQuestion: room.currentQuestion,
            ...startVotingPayloadExtras(room),
        });
    }
};

const retractAnswer = (io, socket, rooms, { roomCode, playerId }) => {
    const room = rooms[roomCode];
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (!player || player.socketId !== socket.id) return;
    
    room.answers = room.answers.filter(a => a.playerId !== playerId);
    io.to(roomCode).emit('updateAnswerCount', room.answers.map(a => a.playerId));
};

const submitVote = (io, socket, rooms, { roomCode, voterId, targetId }) => {
    const room = rooms[roomCode];
    if (!room || room.gameState !== 'VOTING') return;
    const voter = room.players.find(p => p.id === voterId);
    if (!voter || voter.socketId !== socket.id) return;
    if (!room.players.some(p => p.id === targetId) || voterId === targetId) return;

    room.votes[voterId] = targetId;

    resolveVotingResult(io, room);
};

const backToLobby = (io, socket, rooms, roomCode) => {
    const room = rooms[roomCode];
    if (!room || room.gameState !== 'RESULT') return;

    const host = room.players.find(p => p.isHost);
    if (!host || host.socketId !== socket.id) return;

    room.gameState = 'LOBBY';
    room.answers = [];
    room.votes = {};
    room.currentQuestion = null;
    room.currentPair = null;
    room.impostorId = null;

    io.to(roomCode).emit('gameReset', { messageKey: 'backToLobbyMessage' });
    io.to(roomCode).emit('updatePlayers', room.players);
};

module.exports = { startGame, submitAnswer, submitVote, retractAnswer, backToLobby };