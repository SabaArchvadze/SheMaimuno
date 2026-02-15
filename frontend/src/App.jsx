import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import './App.css';
import DoodleMonkey from './components/DoodleMonkey';
import titleImage from './assets/title-img.png';
import PaperBoard from './components/PaperBoard';
import ThemeToggle from './components/ThemeToggle';
import AnimToggle from './components/AnimToggle';
import Toast from './components/Toast';

const socket = io('http://localhost:3001');
const MONKEYS = ['🐵', '🙉', '🙊', '🐒'];

function GameApp() {
  const { roomCode: urlRoomCode } = useParams(); 
  const navigate = useNavigate();

  // --- STATE ---
  const [view, setView] = useState('HOME');
  const [isExiting, setIsExiting] = useState(false); 

  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState(urlRoomCode || '');
  const [players, setPlayers] = useState([]);
  const [playerId, setPlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);

  const [toast, setToast] = useState({ message: '', type: '' });

  // Game Data
  const [myRole, setMyRole] = useState('');
  const [question, setQuestion] = useState('');
  const [myAnswer, setMyAnswer] = useState('');
  const [allAnswers, setAllAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAnimations, setShowAnimations] = useState(true);

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);

  // --- ANIMATED VIEW CHANGER ---
  const changeView = (newView) => {
    if (view === newView) return;
    setIsExiting(true);
    setTimeout(() => {
      setView(newView);
      setIsExiting(false);
      window.scrollTo(0, 0);
    }, 600);
  };

  const showToast = (msg, type = 'info') => {
    setToast({ message: msg, type });
  };

  // --- EFFECTS ---

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
          showToast(`Room ${urlRoomCode} not found`, 'error');
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

          if (res.gameState === 'LOBBY') {
            setView('LOBBY');
          }
          else if (res.gameState === 'WRITING') {
            if (res.hasSubmitted) {
              setView('WAITING');
            } else {
              setView('GAME');
            }
            if (res.roundInfo) {
              setMyRole(res.roundInfo.role);
              setQuestion(res.roundInfo.question);
            }
          }
          else if (res.gameState === 'VOTING') {
            setView('VOTING');
          }
          else if (res.gameState === 'RESULT') {
            setView('RESULT');
          }

          const me = res.players.find(p => p.id === storedId);
          if (me && me.isHost) setIsHost(true);
        } else {
          localStorage.clear();
        }
      });
    }

    socket.on('updatePlayers', (list) => setPlayers(list));
    socket.on('roundStart', ({ role, question }) => {
      setMyRole(role);
      setQuestion(question);
      changeView('GAME');
      setMyAnswer('');
      setResult(null);
      setHasSubmitted(false);
      setSubmittedCount(0);
    });
    socket.on('startVoting', (answers) => {
      setAllAnswers(answers);
      changeView('VOTING');
      setHasVoted(false);
    });
    socket.on('gameOver', (res) => {
      setResult(res);
      changeView('RESULT');
    });
    socket.on('updateAnswerCount', (submittedIds) => {
      setSubmittedCount(submittedIds.length);
    });
    socket.on('gameReset', ({ message }) => {
      showToast(message, 'info')
      changeView('LOBBY'); 
      setMyAnswer('');
      setHasSubmitted(false);
      setResult(null);
    });

    return () => {
      socket.off('updatePlayers');
      socket.off('roundStart');
      socket.off('startVoting');
      socket.off('gameOver');
      socket.off('gameReset');
      socket.off('updateAnswerCount');
      socket.off('playerAnswered');
    };
  }, [urlRoomCode]);


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
  };

  const toggleAnimations = () => {
    setShowAnimations(prev => {
      const newValue = !prev;
      localStorage.setItem('sm_animations', newValue);
      return newValue;
    });
  };

  const setupSession = (data) => {
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
  };

  const handleCreate = () => {
    if (!name) return showToast("Enter a name!", "error");

    socket.emit('createRoom', name, (res) => {
      if (!res || !res.success) {
        showToast('Server Error. Try again.', 'error');
        return;
      }
      setupSession(res);
      setIsHost(true);
      changeView('LOBBY');
    });
  };

  const handleJoin = () => {
    if (!name || !roomCode) return showToast("Need name & code!", "error");


    socket.emit('joinRoom', { roomCode, playerName: name }, (res) => {
      if (res.success) {
        setupSession(res);
        setIsHost(false);
        changeView('LOBBY');
      } else {
        showToast(res.error || "Room not found", "error");

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
      setQuestion('');
      setResult(null);
      setHasSubmitted(false);

      navigate('/');
    }, 300);
  };

  const copyInvite = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    showToast('Link copied! Send it to a monkey.', 'success')
  };

  // --- RENDER ---
  return (
    <div className="app-container">

      <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <AnimToggle
        showAnimations={showAnimations}
        toggleAnimations={toggleAnimations}
      />

      <img
        src={titleImage}
        alt="title image"
        className={`title-img ${view !== 'HOME' ? 'hidden' : ''}`}
      />
      <div className={`paper-wrapper ${view !== 'HOME' ? 'expanded' : ''}`}>
        <PaperBoard view={view} showAnimations={showAnimations}>

          {view === 'HOME' && (
            <>
              <input placeholder="შენი სახელი" value={name} onChange={e => setName(e.target.value)} />

              {urlRoomCode ? (
                <button className="btn-doodle" onClick={handleJoin}>შედი ოთახში {urlRoomCode}</button>
              ) : (
                <>
                  <button className="btn-doodle" onClick={handleCreate}>ახალი ოთახი</button>
                  <div style={{ margin: '20px' }}>— ან —</div>
                  <input placeholder="ოთახის კოდი" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} />
                  <button className="btn-doodle btn-secondary" onClick={handleJoin}>შედი ოთახში</button>
                </>
              )}
              <div style={{ marginTop: '30px', fontSize: '0.9rem', opacity: 0.7 }}>
                <span
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => changeView('CREDITS')}
                >
                  კრედიტები და ატრიბუტები
                </span>
              </div>
            </>
          )}

          {view !== 'HOME' && (
            <div
              onClick={leaveGame}
              style={{
                position: 'absolute',
                top: '15px',
                left: '15px',
                cursor: 'pointer',
                zIndex: 100,
                opacity: 0.6,
                transition: '0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
              title="Leave Game"
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </div>
          )}

          {view === 'LOBBY' && (
            <>
              <h2>Room: {roomCode === '...' ? <span style={{ opacity: 0.5 }}>Loading...</span> : roomCode}</h2>

              <button className="btn-link" onClick={copyInvite}>🔗 Copy Invite Link</button>

              <div style={{ margin: '20px 0' }}>
                {players.length === 0 ? (
                  <div style={{ opacity: 0.5 }}>Connecting to server...</div>
                ) : (
                  players.map(p => (
                    <div key={p.id} className="player-row">
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="avatar-circle">{MONKEYS[p.avatar]}</span>
                        {p.name} {p.id === playerId && "(You)"}
                      </div>
                      {p.isHost && <span style={{ color: 'orange' }}>👑</span>}
                    </div>
                  ))
                )}
              </div>

              {isHost ? (
                <button className="btn-doodle" onClick={() => socket.emit('startGame', roomCode)}>დაიწყე თამაში</button>
              ) : (
                <p>დაელოდე ოთახის შემქმნელს...</p>
              )}
              <br />
            </>
          )}

          {view === 'GAME' && (
            <>
              <div style={{
                position: 'absolute',
                top: '5%',
                right: '-10%',
                fontFamily: "'Mandys Sketch', cursive",
                fontSize: '1.2rem',
                border: '2px solid var(--ink)',
                padding: '5px 10px',
                borderRadius: '50% 20% / 10% 40%',
                transform: 'rotate(5deg)'
              }}>
                {submittedCount}/{players.length} Ready
              </div>

              <div className="subtitle">
                {myRole === 'IMPOSTOR' ? <span style={{ color: 'var(--red)' }}>YOU ARE THE IMPOSTOR!</span> : <span>NORMAL PLAYER</span>}
              </div>

              <h2>{question}</h2>

              <div className="speech-bubble">
                <input
                  placeholder="Write something clever..."
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
                }}>Done!</button>
              ) : (
                <div style={{ animation: 'fade-in 0.3s' }}>
                  <button className="btn-doodle btn-secondary" onClick={handleEdit}>
                    Edit Answer
                  </button>
                </div>
              )}
            </>
          )}

          {view === 'VOTING' && (
            <>
              <h2>ვინ არის მაიმუნი?</h2>
              {!hasVoted ? (
                <div>
                  {allAnswers.map(ans => (
                    <div key={ans.playerId} className="vote-card" onClick={() => {
                      if (ans.playerId !== playerId) {
                        socket.emit('submitVote', { roomCode, voterId: playerId, targetId: ans.playerId });
                        setHasVoted(true);
                      }
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                        <span className="avatar-circle" style={{ width: '30px', height: '30px', fontSize: '18px' }}>{MONKEYS[ans.avatar]}</span>
                        <strong>{ans.name}:</strong>
                      </div>
                      <div style={{ fontSize: '1.4rem' }}>"{ans.text}"</div>
                      {ans.playerId !== playerId && <div style={{ color: '#ccc', fontSize: '0.8rem' }}>(დააჭირე ხმის მისაცემად)</div>}
                    </div>
                  ))}
                </div>
              ) : <h2>პასუხი მიღებულია! 🍌</h2>}
            </>
          )}

          {view === 'RESULT' && result && (
            <>
              <h1 style={{ color: result.impostorCaught ? 'var(--leaf)' : 'var(--red)' }}>
                {result.impostorCaught ? "CAUGHT 'EM!" : "THEY ESCAPED!"}
              </h1>
              <p>მაიმუნი იყო:</p>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{result.impostorName}</div>
              <hr style={{ borderTop: '2px dashed var(--ink)', margin: '20px 0' }} />
              <p>კითხვა იყო:</p>
              <div style={{ fontSize: '1.5rem' }}>"{result.realQuestion}"</div>

              {isHost && <button className="btn-doodle" onClick={() => socket.emit('startGame', roomCode)}>შემდეგი რაუნდი</button>}
            </>
          )}
          {view === 'CREDITS' && (
            <>
              <h1>კრედიტები</h1>
              <div style={{ textAlign: 'left', margin: '0 auto', maxWidth: '400px', lineHeight: '1.2' }}>

                <p><strong>საიტის შემქმნელი:</strong> <br />საბა არჩვაძე - sabaarchvadze@gmail.com </p>

                <p><strong>ფონტები:</strong> <br />
                  <a href="https://www.dafont.com/mkhedruli-grunge.font?text=%26%234328%3B%26%234308%3B+%26%234315%3B%26%234304%3B%26%234312%3B%26%234315%3B%26%234323%3B%26%234316%3B%26%234317%3B" style={{ color: "black" }} target='_blank'> Mkhedruli Grunge </a> <br />
                  <a href="https://www.fontspace.com/mandys-sketch-font-f41128" style={{ color: "black" }} target='_blank'> Mandy's Sketch </a> <br />
                  <a href="https://ggbot.itch.io/first-time-writing-font?download" style={{ color: "black" }} target='_blank'> First Time Writing </a>
                </p>

                <p><strong>ქაღალდის ანიმაციის ლიცენზია:</strong> <br />
                  <a href="https://www.vecteezy.com/free-videos/abstract" style={{ color: "black" }} target='_blank'>Abstract Stock Videos by Vecteezy</a>
                </p>
              </div>

              <button className="btn-doodle" style={{ marginTop: '20px' }} onClick={() => changeView('HOME')}>
                უკან დაბრუნება
              </button>
            </>
          )}

        </PaperBoard>
      </div>

      <DoodleMonkey view={view} winState={result ? result.impostorCaught : null} showAnimations={showAnimations} />

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: '' })}
      />

    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GameApp />} />
        <Route path="/join/:roomCode" element={<GameApp />} />
      </Routes>
    </BrowserRouter>
  );
}