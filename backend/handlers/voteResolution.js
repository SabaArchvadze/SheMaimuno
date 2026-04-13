const buildVoteBreakdown = (room) => {
    const voteCounts = {};
    Object.values(room.votes || {}).forEach(targetId => {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

    return room.players
        .map(p => ({
            playerId: p.id,
            name: p.name,
            avatar: p.avatar,
            votes: voteCounts[p.id] || 0
        }))
        .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
};

const resolveVotingResult = (io, room) => {
    const currentIds = room.players.map(p => p.id);
    const validVotes = Object.keys(room.votes).filter(id => currentIds.includes(id));

    if (validVotes.length < room.players.length) return false;

    const voteCounts = {};
    let maxVotes = 0;

    Object.values(room.votes).forEach(targetId => {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
        if (voteCounts[targetId] > maxVotes) {
            maxVotes = voteCounts[targetId];
        }
    });

    const mostSusIds = Object.keys(voteCounts).filter(pid => voteCounts[pid] === maxVotes);

    let impostorCaught = false;
    let outcome = "TIE";

    if (mostSusIds.length === 1) {
        const suspectId = mostSusIds[0];
        if (suspectId === room.impostorId) {
            impostorCaught = true;
            outcome = "CAUGHT";
        } else {
            outcome = "WRONG_GUESS";
        }
    }

    room.players.forEach(p => {
        if (p.id === room.impostorId) {
            if (!impostorCaught) p.score += 2;
        } else if (impostorCaught) {
            p.score += 1;
        }
    });

    const impostorObj = room.players.find(p => p.id === room.impostorId);
    const impostorName = impostorObj ? impostorObj.name : "The Impostor (Left)";
    const leaderboard = room.players
        .map(p => ({ name: p.name, score: p.score, avatar: p.avatar, isImpostor: p.id === room.impostorId }))
        .sort((a, b) => b.score - a.score);
    const voteBreakdown = buildVoteBreakdown(room);

    io.to(room.code).emit('gameOver', {
        impostorCaught,
        impostorName,
        realQuestion: room.currentQuestion,
        outcome,
        leaderboard,
        voteBreakdown
    });
    room.gameState = 'RESULT';
    return true;
};

module.exports = { resolveVotingResult, buildVoteBreakdown };
