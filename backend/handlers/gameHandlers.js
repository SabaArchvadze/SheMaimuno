const questionList = require('../questions');
const { resolveVotingResult } = require('./voteResolution');

const getRandomQuestion = () => {
    if (!questionList || questionList.length === 0) return null;
    return questionList[Math.floor(Math.random() * questionList.length)];
};

const startGame = (io, socket, rooms, roomCode) => {
    const room = rooms[roomCode];
    if (!room || room.players.length < 2) return; 
    const host = room.players.find(p => p.isHost);
    if (!host || host.socketId !== socket.id) return;

    room.gameState = 'WRITING';
    room.answers = [];
    room.votes = {};

    const impostorIndex = Math.floor(Math.random() * room.players.length);
    room.impostorId = room.players[impostorIndex].id;

    const qPair = getRandomQuestion();
    if (!qPair) {
        room.currentPair = { normal: "Error", impostor: "Error" };
    } else {
        room.currentPair = qPair;
    }
    room.currentQuestion = room.currentPair.normal;

    room.players.forEach(p => {
        const isImpostor = p.id === room.impostorId;
        io.to(p.socketId).emit('roundStart', {
            role: isImpostor ? 'IMPOSTOR' : 'NORMAL',
            question: isImpostor ? room.currentPair.impostor : room.currentPair.normal
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
        io.to(roomCode).emit('startVoting', room.answers);
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

module.exports = { startGame, submitAnswer, submitVote, retractAnswer };