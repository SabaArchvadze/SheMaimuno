import React, { useState, useEffect, useCallback, useMemo } from 'react';
import io from 'socket.io-client';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import './App.css';
import DoodleMonkey from './components/DoodleMonkey';
import titleImage from './assets/title-img.png';
import face1 from './assets/monkey-face1.svg';
import face2 from './assets/monkey-face2.svg';
import face3 from './assets/monkey-face3.svg';
import PaperBoard from './components/PaperBoard';
import ThemeToggle from './components/ThemeToggle';
import AnimToggle from './components/AnimToggle';
import LangToggle from './components/LangToggle';
import Toast from './components/Toast';
import { I18nProvider, useI18n } from './i18n/I18nContext';

const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001');
const MONKEY_HEADS = [face1, face2, face3];

function GameApp() {
  const { roomCode: urlRoomCode } = useParams(); 
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  const [view, setView] = useState('HOME');

  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState(urlRoomCode || '');
  const [players, setPlayers] = useState([]);
  const [playerId, setPlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);

  const [toast, setToast] = useState({
    message: '',
    type: '',
    messageKey: undefined,
    messageParams: undefined,
    openKey: 0,
  });

  const [myRole, setMyRole] = useState('');
  const [questionByLang, setQuestionByLang] = useState({ ka: '', en: '' });
  const [myAnswer, setMyAnswer] = useState('');
  const [allAnswers, setAllAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAnimations, setShowAnimations] = useState(true);

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [lastVoteBreakdown, setLastVoteBreakdown] = useState([]);
  const [votingQuestionByLang, setVotingQuestionByLang] = useState({ ka: '', en: '' });
  const [kickConfirmPlayerId, setKickConfirmPlayerId] = useState(null);

  const changeView = useCallback((newView) => {
    setView(currentView => {
      if (currentView === newView) return currentView;
      window.scrollTo(0, 0);
      return newView;
    });
  }, []);

  const showToast = useCallback((msgOrOpts, type = 'info') => {
    const openKey = Date.now();
    if (typeof msgOrOpts === 'string') {
      setToast({
        message: msgOrOpts,
        messageKey: undefined,
        messageParams: undefined,
        type,
        openKey,
      });
      return;
    }
    const opts = msgOrOpts || {};
    setToast({
      message: opts.message || '',
      messageKey: opts.messageKey,
      messageParams: opts.messageParams,
      type: opts.type ?? type,
      openKey,
    });
  }, []);

  const setupSession = useCallback((data) => {
    if (!data || !data.playerId || !data.roomCode) {
      console.warn('setupSession called with invalid data:', data);
      return;
    }

    setPlayerId(data.playerId);
    setRoomCode(data.roomCode);
    setPlayers(data.players || []);
    localStorage.setItem('sm_playerId', data.playerId);
    localStorage.setItem('sm_roomCode', data.roomCode);
    navigate(`/join/${data.roomCode}`, { replace: true });
  }, [navigate]);

  const resetToHomeState = useCallback(() => {
    localStorage.removeItem('sm_playerId');
    localStorage.removeItem('sm_roomCode');
    setPlayerId(null);
    setRoomCode('');
    setPlayers([]);
    setIsHost(false);
    setMyRole('');
    setQuestionByLang({ ka: '', en: '' });
    setMyAnswer('');
    setAllAnswers([]);
    setResult(null);
    setHasSubmitted(false);
    setSubmittedCount(0);
    setHasVoted(false);
    setVotingQuestionByLang({ ka: '', en: '' });
    navigate('/');
    changeView('HOME');
  }, [changeView, navigate]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('sm_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.body.classList.add('dark-mode');
    }
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('sm_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.body.classList.add('dark-mode');
    }

    const savedAnim = localStorage.getItem('sm_animations');
    if (savedAnim === 'false') {
      setShowAnimations(false); 
    }
  }, []);


  useEffect(() => {
    if (urlRoomCode) {
      setRoomCode(urlRoomCode);

      socket.emit('checkRoom', urlRoomCode, (exists) => {
        if (!exists) {
          showToast(t('toasts.roomNotFound', { roomCode: urlRoomCode }), 'error');
          navigate('/');
          setRoomCode('');
        }
      });
    }
    const storedId = localStorage.getItem('sm_playerId');
    const storedRoom = localStorage.getItem('sm_roomCode');

    if (storedId && storedRoom) {
      socket.emit('reconnect', { roomCode: storedRoom, playerId: storedId }, (res) => {
        if (res.success) {
          setupSession(res);
          if (res.roundInfo) {
            setMyRole(res.roundInfo.role);
            const ka = res.roundInfo.questionKa ?? res.roundInfo.question ?? '';
            const en = res.roundInfo.questionEn ?? res.roundInfo.question ?? '';
            setQuestionByLang({ ka, en });
          } else if (res.gameState === 'LOBBY') {
            setQuestionByLang({ ka: '', en: '' });
          }

          if (res.gameState === 'LOBBY') {
            setView('LOBBY');
          }
          else if (res.gameState === 'WRITING') {
            if (typeof res.submittedCount === 'number') {
              setSubmittedCount(res.submittedCount);
            }
            if (res.hasSubmitted) {
              setHasSubmitted(true);
              setView('WAITING');
            } else {
              setHasSubmitted(false);
              setView('GAME');
            }
          }
          else if (res.gameState === 'VOTING') {
            const base = res.normalQuestion || '';
            const ka = res.normalQuestionKa ?? base;
            const en = res.normalQuestionEn ?? base;
            setVotingQuestionByLang({ ka, en });
            if (typeof res.hasVoted === 'boolean') setHasVoted(res.hasVoted);
            setView('VOTING');
          }
          else if (res.gameState === 'RESULT') {
            if (res.result) {
              setResult(res.result);
              if (Array.isArray(res.result.voteBreakdown)) {
                setLastVoteBreakdown(res.result.voteBreakdown);
              }
            }
            setView('RESULT');
          }

          const me = res.players.find(p => p.id === storedId);
          if (me && me.isHost) setIsHost(true);
        } else {
          localStorage.clear();
        }
      });
    }

    socket.on('updatePlayers', (list) => {
      setPlayers(list);
      setAllAnswers(prev => prev.filter(ans => list.some(p => p.id === ans.playerId)));
      setKickConfirmPlayerId(prev => (prev && !list.some(p => p.id === prev) ? null : prev));
    });
    socket.on('roundStart', ({ role, question, questionKa, questionEn }) => {
      setMyRole(role);
      const ka = questionKa ?? question ?? '';
      const en = questionEn ?? question ?? '';
      setQuestionByLang({ ka, en });
      changeView('GAME');
      setMyAnswer('');
      setResult(null);
      setHasSubmitted(false);
      setSubmittedCount(0);
      setVotingQuestionByLang({ ka: '', en: '' });
    });
    socket.on('startVoting', (payload) => {
      const answers = Array.isArray(payload) ? payload : payload.answers || [];
      const base = Array.isArray(payload) ? '' : (payload.normalQuestion || '');
      const ka = Array.isArray(payload) ? '' : (payload.normalQuestionKa ?? base);
      const en = Array.isArray(payload) ? '' : (payload.normalQuestionEn ?? base);
      const yourHasVoted = Array.isArray(payload) ? false : Boolean(payload?.yourHasVoted);
      setAllAnswers(answers);
      setVotingQuestionByLang({ ka: ka || base, en: en || base });
      changeView('VOTING');
      setHasVoted(yourHasVoted);
    });
    socket.on('gameOver', (res) => {
      setResult(res);
      if (Array.isArray(res.voteBreakdown)) {
        setLastVoteBreakdown(res.voteBreakdown);
      }
      changeView('RESULT');
    });
    socket.on('updateAnswerCount', (submittedIds) => {
      setSubmittedCount(submittedIds.length);
    });
    socket.on('gameReset', ({ messageKey, message }) => {
      if (messageKey) showToast({ messageKey }, 'info');
      else showToast({ message: message || '' }, 'info');
      changeView('LOBBY');
      setMyAnswer('');
      setHasSubmitted(false);
      setResult(null);
      setVotingQuestionByLang({ ka: '', en: '' });
    });
    socket.on('kicked', ({ messageKey, message }) => {
      if (messageKey) showToast({ messageKey }, 'error');
      else if (message) showToast({ message }, 'error');
      else showToast({ messageKey: 'kicked' }, 'error');
      resetToHomeState();
    });

    return () => {
      socket.off('updatePlayers');
      socket.off('roundStart');
      socket.off('startVoting');
      socket.off('gameOver');
      socket.off('gameReset');
      socket.off('kicked');
      socket.off('updateAnswerCount');
      socket.off('playerAnswered');
    };
  }, [changeView, navigate, resetToHomeState, setupSession, showToast, t, urlRoomCode]);

  useEffect(() => {
    const me = players.find(p => p.id === playerId);
    setIsHost(!!(me && me.isHost));
  }, [players, playerId]);

  useEffect(() => {
    if (!isHost) setKickConfirmPlayerId(null);
  }, [isHost]);


  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);

    if (newMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('sm_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('sm_theme', 'light');
    }
  };

  const handleEdit = () => {
    setHasSubmitted(false); 
    socket.emit('retractAnswer', { roomCode, playerId });
    if (view === 'WAITING') {
      changeView('GAME');
    }
  };

  const toggleAnimations = () => {
    setShowAnimations(prev => {
      const newValue = !prev;
      localStorage.setItem('sm_animations', newValue);
      return newValue;
    });
  };

  const handleCreate = () => {
    if (!name) return showToast(t('toasts.enterName'), "error");

    socket.emit('createRoom', name, (res) => {
      if (!res || !res.success) {
        showToast(t('toasts.serverError'), 'error');
        return;
      }
      setupSession(res);
      setIsHost(true);
      changeView('LOBBY');
    });
  };

  const handleJoin = () => {
    if (!name || !roomCode) return showToast(t('toasts.needNameAndCode'), "error");


    socket.emit('joinRoom', { roomCode, playerName: name }, (res) => {
      if (res.success) {
        setupSession(res);
        setIsHost(false);
        changeView('LOBBY');
      } else {
        showToast(res.error || t('toasts.roomNotFound', { roomCode }), "error");

      }
    });
  };

  const leaveGame = () => {
    localStorage.removeItem('sm_playerId');
    localStorage.removeItem('sm_roomCode');
    socket.off('gameReset');
    socket.emit('leaveRoom', { roomCode, playerId });

    socket.disconnect();
    socket.connect();
    changeView('HOME');

    setTimeout(() => {
      localStorage.clear();
      setPlayerId(null);
      setRoomCode('');
      setPlayers([]);
      setIsHost(false);
      setMyRole('');
      setQuestionByLang({ ka: '', en: '' });
      setResult(null);
      setHasSubmitted(false);

      navigate('/');
    }, 300);
  };

  const copyInvite = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    showToast(t('toasts.linkCopied'), 'success')
  };

  const requestKickPlayer = (targetPlayerId) => {
    const target = players.find(p => p.id === targetPlayerId);
    if (!target) {
      showToast(t('toasts.playerNotFound'), 'error');
      return;
    }

    socket.emit('kickPlayer', { roomCode, targetPlayerId }, (res = {}) => {
      if (!res.success) {
        showToast(res.error || t('toasts.kickFailed'), 'error');
      } else {
        showToast({ messageKey: 'kickedBy', messageParams: { name: res.kickedName || target.name } }, 'success');
        setKickConfirmPlayerId(null);
      }
    });
  };

  const getAvatarHead = (avatarIndex) => {
    const numericIndex = Number.isInteger(avatarIndex) ? avatarIndex : Number(avatarIndex) || 0;
    return MONKEY_HEADS[Math.abs(numericIndex) % MONKEY_HEADS.length];
  };

  const didIWin = result
    ? (myRole === 'IMPOSTOR' ? !result.impostorCaught : result.impostorCaught)
    : null;

  const roundQuestionText = useMemo(
    () => questionByLang[lang] || questionByLang.ka || '',
    [questionByLang, lang],
  );
  const votingQuestionText = useMemo(
    () => votingQuestionByLang[lang] || votingQuestionByLang.ka || '',
    [votingQuestionByLang, lang],
  );
  const resultQuestionText = useMemo(() => {
    if (!result) return '';
    if (result.realQuestionKa != null && result.realQuestionEn != null) {
      return lang === 'en' ? result.realQuestionEn : result.realQuestionKa;
    }
    return result.realQuestion || '';
  }, [result, lang]);
  const lobbyGridClass = players.length <= 3
    ? 'lobby-grid-1'
    : players.length <= 6
      ? 'lobby-grid-2'
      : 'lobby-grid-3';
  const voteGridClass = allAnswers.length <= 3
    ? 'vote-grid-1'
    : allAnswers.length <= 6
      ? 'vote-grid-2'
      : 'vote-grid-3';
  const canStartGame = players.length >= 3;
  const kickDensityClass = players.length <= 3
    ? 'kick-ui-roomy'
    : players.length <= 6
      ? 'kick-ui-regular'
      : 'kick-ui-compact';

  return (
    <div className="app-container">

      <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <AnimToggle
        showAnimations={showAnimations}
        toggleAnimations={toggleAnimations}
      />
      <LangToggle />
      <aside className={`vote-side-drawer ${view === 'RESULT' && lastVoteBreakdown.length > 0 ? 'visible' : ''}`}>
        <h3>{t('result.voteResults')}</h3>
        {lastVoteBreakdown.map((entry) => (
          <div key={entry.playerId} className="vote-side-row">
            <span>{entry.name}</span>
            <span>{entry.votes} {t('result.voteSuffix')}</span>
          </div>
        ))}
      </aside>

      <img
        src={titleImage}
        alt="She Maimuno title"
        className={`title-img ${view !== 'HOME' ? 'hidden' : ''}`}
      />
      <div className={`paper-wrapper ${view !== 'HOME' ? 'expanded' : ''}`}>
        <PaperBoard view={view} showAnimations={showAnimations}>

          {view === 'HOME' && (
            <>
              <input placeholder={t('home.namePlaceholder')} value={name} onChange={e => setName(e.target.value)} />

              {urlRoomCode ? (
                <button className="btn-doodle" onClick={handleJoin}>{t('home.joinUrlRoom', { roomCode: urlRoomCode })}</button>
              ) : (
                <>
                  <button className="btn-doodle" onClick={handleCreate}>{t('home.newRoom')}</button>
                  <div style={{ margin: '20px' }}>{t('home.or')}</div>
                  <input placeholder={t('home.roomCodePlaceholder')} value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} />
                  <button className="btn-doodle btn-secondary" onClick={handleJoin}>{t('home.joinRoom')}</button>
                </>
              )}
              <div style={{ marginTop: '30px', fontSize: '0.9rem', opacity: 0.7 }}>
                <span
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => changeView('CREDITS')}
                >
                  {t('home.credits')}
                </span>
              </div>
            </>
          )}

          {view !== 'HOME' && (
            <div
              onClick={leaveGame}
              className="leave-game-btn"
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
              title={t('lobby.leaveGame')}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </div>
          )}

          {view === 'LOBBY' && (
            <>
              <h2>{t('lobby.roomLabel')} {roomCode === '...' ? <span style={{ opacity: 0.5 }}>{t('lobby.loading')}</span> : roomCode}</h2>

              <button className="btn-link" onClick={copyInvite}>{t('lobby.copyInvite')}</button>

              <div style={{ margin: '20px 0' }} className={`lobby-player-grid ${lobbyGridClass}`}>
                {players.length === 0 ? (
                  <div style={{ opacity: 0.5 }}>{t('lobby.connecting')}</div>
                ) : (
                  players.map(p => (
                    <div key={p.id} className={`player-row ${isHost && p.id !== playerId ? 'kickable-player' : ''}`}>
                      {kickConfirmPlayerId === p.id ? (
                        <div className={`kick-confirm-inline ${kickDensityClass}`}>
                          <span>{players.length <= 3 ? t('lobby.kickPromptLong') : t('lobby.kickPromptShort')}</span>
                          <button className="kick-confirm-action" onClick={() => requestKickPlayer(p.id)}>{t('lobby.kickYes')}</button>
                          <button className="kick-confirm-action kick-confirm-cancel" onClick={() => setKickConfirmPlayerId(null)}>{t('lobby.kickNo')}</button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <img src={getAvatarHead(p.avatar)} alt="" className="player-avatar" />
                            {p.name}{p.id === playerId && t('lobby.youSuffix')}
                          </div>
                          {p.isHost && <span style={{ color: 'orange' }}>👑</span>}
                          {isHost && p.id !== playerId && (
                            <button
                              className={`kick-overlay-btn ${kickDensityClass}`}
                              onClick={() => setKickConfirmPlayerId(p.id)}
                              title={`${t('lobby.kickPromptShort')} ${p.name}`}
                            >
                              ✕
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              {isHost ? (
                <>
                  <button
                    className={`btn-doodle ${!canStartGame ? 'btn-disabled' : ''}`}
                    onClick={() => canStartGame && socket.emit('startGame', roomCode)}
                    disabled={!canStartGame}
                  >
                    {t('lobby.startGame')}
                  </button>
                  {!canStartGame && <div className="min-players-note">{t('lobby.minPlayersNote')}</div>}
                </>
              ) : (
                <p>{t('lobby.waitingForHost')}</p>
              )}
              <br />
            </>
          )}

          {view === 'GAME' && (
            <>
              <div className="ready-counter">
                {t('game.readyCounter', { x: submittedCount, total: players.length })}
              </div>

              <h2>{roundQuestionText}</h2>

              <div className="speech-bubble">
                <input
                  placeholder={t('game.writePlaceholder')}
                  value={myAnswer}
                  onChange={e => setMyAnswer(e.target.value)}
                  disabled={hasSubmitted}
                  style={{
                    width: '90%',
                    color: hasSubmitted ? '#666' : 'var(--ink)',
                    cursor: hasSubmitted ? 'not-allowed' : 'text'
                  }}
                  autoFocus
                />
              </div>

              {!hasSubmitted ? (
                <button className="btn-doodle" onClick={() => {
                  if (!myAnswer.trim()) return;
                  socket.emit('submitAnswer', { roomCode, playerId, answer: myAnswer });
                  setHasSubmitted(true);
                }}>{t('game.done')}</button>
              ) : (
                <div style={{ animation: 'fade-in 0.3s' }}>
                  <button className="btn-doodle btn-secondary" onClick={handleEdit}>
                    {t('game.editAnswer')}
                  </button>
                </div>
              )}
            </>
          )}

          {view === 'WAITING' && (
            <>
              <h2>{t('waiting.answerReceived')} 🍌</h2>
              <p>{t('waiting.waitForAll')}</p>
              <div style={{ marginTop: '20px', fontSize: '1.1rem', opacity: 0.8 }}>
                {submittedCount}/{players.length} {t('waiting.readySuffix')}
              </div>
              <button className="btn-doodle btn-secondary" style={{ marginTop: '16px' }} onClick={handleEdit}>
                {t('waiting.editAnswer')}
              </button>
            </>
          )}

          {view === 'VOTING' && (
            <>
              <h2 className="voting-title">{t('voting.title')}</h2>
              {votingQuestionText && <p className="voting-question">"{votingQuestionText}"</p>}
              {!hasVoted ? (
                <div className={`vote-grid ${voteGridClass}`}>
                  {allAnswers.map(ans => (
                    <div
                      key={ans.playerId}
                      className="vote-card"
                      onClick={() => {
                      if (ans.playerId !== playerId) {
                        socket.emit('submitVote', { roomCode, voterId: playerId, targetId: ans.playerId });
                        setHasVoted(true);
                      }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                        <img src={getAvatarHead(ans.avatar)} alt="" className="player-avatar vote-avatar" />
                        <strong>{ans.name}:</strong>
                      </div>
                      <div className="vote-answer-text">"{ans.text}"</div>
                      {ans.playerId !== playerId && (
                        <div className={`vote-hint ${voteGridClass === 'vote-grid-3' ? 'vote-hint--compact' : ''}`}>
                          {t('voting.tapToVote')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : <h2>{t('voting.voteRecorded')} 🍌</h2>}
            </>
          )}

          {view === 'RESULT' && result && (
            <>
              <h1 style={{ color: (myRole === 'IMPOSTOR' ? !result.impostorCaught : result.impostorCaught) ? 'var(--leaf)' : 'var(--red)' }}>
                {myRole === 'IMPOSTOR'
                  ? (result.impostorCaught ? t('result.youGotCaught') : t('result.youRanAway'))
                  : (result.impostorCaught ? t('result.youCaughtThem') : t('result.theyGotAway'))}
              </h1>
              <p>{t('result.monkeyWas')}</p>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{result.impostorName}</div>
              <hr style={{ borderTop: '2px dashed var(--ink)', margin: '20px 0' }} />
              <p>{t('result.questionWas')}</p>
              <div style={{ fontSize: '1.5rem' }}>"{resultQuestionText}"</div>

              {isHost && (
                <div className="result-action-row">
                  <button className="btn-doodle btn-compact" onClick={() => socket.emit('startGame', roomCode)}>{t('result.nextRound')}</button>
                  <button className="btn-doodle btn-secondary btn-compact" onClick={() => socket.emit('backToLobby', roomCode)}>
                    {t('result.backToLobby')}
                  </button>
                </div>
              )}
            </>
          )}
          {view === 'CREDITS' && (
            <>
              <h1>{t('credits.title')}</h1>
              <div style={{ textAlign: 'left', margin: '0 auto', maxWidth: '400px', lineHeight: '1.2' }}>

                <p><strong>{t('credits.siteAuthor')}</strong> <br />საბა არჩვაძე - sabaarchvadze@gmail.com </p>

                <p><strong>{t('credits.fonts')}</strong> <br />
                  <a href="https://www.dafont.com/mkhedruli-grunge.font?text=%26%234328%3B%26%234308%3B+%26%234315%3B%26%234304%3B%26%234312%3B%26%234315%3B%26%234323%3B%26%234316%3B%26%234317%3B" style={{ color: "black" }} target='_blank' rel="noreferrer"> Mkhedruli Grunge </a> <br />
                  <a href="https://www.fontspace.com/mandys-sketch-font-f41128" style={{ color: "black" }} target='_blank' rel="noreferrer"> Mandy's Sketch </a> <br />
                  <a href="https://ggbot.itch.io/first-time-writing-font?download" style={{ color: "black" }} target='_blank' rel="noreferrer"> First Time Writing </a>
                </p>

                <p><strong>{t('credits.paperLicense')}</strong> <br />
                  <a href="https://www.vecteezy.com/free-videos/abstract" style={{ color: "black" }} target='_blank' rel="noreferrer">Abstract Stock Videos by Vecteezy</a>
                </p>
              </div>

              <button className="btn-doodle" style={{ marginTop: '20px' }} onClick={() => changeView('HOME')}>
                {t('credits.back')}
              </button>
            </>
          )}

        </PaperBoard>
      </div>

      <DoodleMonkey view={view} winState={didIWin} showAnimations={showAnimations} />

      <Toast
        message={toast.message}
        messageKey={toast.messageKey}
        messageParams={toast.messageParams}
        type={toast.type}
        openKey={toast.openKey}
        onClose={() => setToast({
          message: '',
          type: '',
          messageKey: undefined,
          messageParams: undefined,
          openKey: 0,
        })}
      />

    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<GameApp />} />
          <Route path="/join/:roomCode" element={<GameApp />} />
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  );
}