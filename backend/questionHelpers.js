/**
 * Room.currentPair is always { id, ka: { normal, impostor }, en: { normal, impostor } }
 * after questions.js normalization.
 */
const getNormalQuestionByLang = (room) => {
    const pair = room.currentPair;
    if (pair && pair.ka && pair.en) {
        return { ka: pair.ka.normal, en: pair.en.normal };
    }
    const fallback = room.currentQuestion || '';
    return { ka: fallback, en: fallback };
};

const startVotingPayloadExtras = (room) => {
    const { ka, en } = getNormalQuestionByLang(room);
    return { normalQuestionKa: ka, normalQuestionEn: en };
};

/** Fields merged into gameOver / impostor-left payloads */
const getResultQuestionFields = (room) => {
    const { ka, en } = getNormalQuestionByLang(room);
    return { realQuestion: ka, realQuestionKa: ka, realQuestionEn: en };
};

module.exports = { getNormalQuestionByLang, startVotingPayloadExtras, getResultQuestionFields };
