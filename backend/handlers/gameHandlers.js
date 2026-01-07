const questionList = require('../questions'); // Move this import here

const getRandomQuestion = () => {
    return questionList[Math.floor(Math.random() * questionList.length)];
};


const startGame = (io, socket, rooms, roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.gameState = 'WRITING';
    room.answers = [];
    room.votes = {};

    const impostorIndex = Math.floor(Math.random() * room.players.length);
    room.impostorId = room.players[impostorIndex].id; // No typo here!

    const qPair = getRandomQuestion();
    room.currentPair = qPair;
    room.currentQuestion = qPair.normal;

    room.players.forEach(p => {
        const isImpostor = p.id === room.impostorId;
        const text = isImpostor ? qPair.impostor : qPair.normal;
        io.to(p.socketId).emit('roundStart', {
            role: isImpostor ? 'IMPOSTOR' : 'NORMAL',
            question: text
        });
    });
};

const submitAnswer = (io, socket, rooms, { roomCode, playerId, answer }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (!room.answers.find(a => a.playerId === playerId)) {
        room.answers.push({ playerId, name: player.name, text: answer, avatar: player.avatar });
    }

    if (room.answers.length === room.players.length) {
        room.gameState = 'VOTING';
        io.to(roomCode).emit('startVoting', room.answers);
    }
};

const submitVote = (io, socket, rooms, { roomCode, voterId, targetId }) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.votes[voterId] = targetId;

    if (Object.keys(room.votes).length === room.players.length) {
        const voteCounts = {};
        Object.values(room.votes).forEach(target => {
            voteCounts[target] = (voteCounts[target] || 0) + 1;
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
        const impostorName = room.players.find(p => p.id === room.impostorId).name;

        io.to(roomCode).emit('gameOver', {
            impostorCaught,
            impostorName,
            realQuestion: room.currentQuestion
        });
        room.gameState = 'RESULT';
    }
};

module.exports = { startGame, submitAnswer, submitVote };