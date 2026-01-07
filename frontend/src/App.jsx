import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import './App.css';
import DoodleMonkey from './components/DoodleMonkey';
import titleImage from './assets/title-img.png';
import PaperBoard from './components/PaperBoard';
import ThemeToggle from './components/ThemeToggle';
import AnimToggle from './components/AnimToggle';

const socket = io('http://localhost:3001');
const MONKEYS = ['🐵', '🙉', '🙊', '🐒'];

function GameApp() {
  const { roomCode: urlRoomCode } = useParams(); // Get room code from URL
  const navigate = useNavigate();

  // --- STATE ---
  const [view, setView] = useState('HOME');
  const [isExiting, setIsExiting] = useState(false); // Controls Crumble Animation

  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState(urlRoomCode || '');
  const [players, setPlayers] = useState([]);
  const [playerId, setPlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);

  // Game Data
  const [myRole, setMyRole] = useState('');
  const [question, setQuestion] = useState('');
  const [myAnswer, setMyAnswer] = useState('');
  const [allAnswers, setAllAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAnimations, setShowAnimations] = useState(true);

  // --- ANIMATED VIEW CHANGER ---
  const changeView = (newView) => {
    if (view === newView) return;
    setIsExiting(true); // Trigger crumble animation
    setTimeout(() => {
      setView(newView);
      setIsExiting(false); // Trigger slide-in animation
      window.scrollTo(0, 0);
    }, 600); // Wait for animation to finish
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
    // Load Theme
    const savedTheme = localStorage.getItem('sm_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.body.classList.add('dark-mode');
    }

    // Load Animation Preference
    const savedAnim = localStorage.getItem('sm_animations');
    if (savedAnim === 'false') {
      setShowAnimations(false); // Only turn off if explicitly 'false'
    }
  }, []);


  useEffect(() => {
    // Handle URL join pre-fill
    if (urlRoomCode) {
      setRoomCode(urlRoomCode);
    }

    const storedId = localStorage.getItem('sm_playerId');
    const storedRoom = localStorage.getItem('sm_roomCode');

    if (storedId && storedRoom) {
      socket.emit('reconnect', { roomCode: storedRoom, playerId: storedId }, (res) => {
        if (res.success) {
          setupSession(res);
          // Determine View
          if (res.gameState === 'LOBBY') setView('LOBBY');
          else if (res.gameState === 'WRITING') {
            setView('GAME');
            setMyRole(res.roundInfo.role);
            setQuestion(res.roundInfo.question);
          }
          else if (res.gameState === 'VOTING') setView('VOTING');

          // Host check
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

    return () => {
      socket.off('updatePlayers');
      socket.off('roundStart');
      socket.off('startVoting');
      socket.off('gameOver');
    };
  }, [urlRoomCode]); // Re-run if URL changes

  // --- ACTIONS ---

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

  const toggleAnimations = () => {
    setShowAnimations(prev => {
      const newValue = !prev;
      localStorage.setItem('sm_animations', newValue);
      return newValue;
    });
  };

  const setupSession = (data) => {
    // Defensive: ensure we have valid data from server callback
    if (!data || !data.playerId || !data.roomCode) {
      console.warn('setupSession called with invalid data:', data);
      return;
    }

    setPlayerId(data.playerId);
    setRoomCode(data.roomCode);
    setPlayers(data.players || []);
    localStorage.setItem('sm_playerId', data.playerId);
    localStorage.setItem('sm_roomCode', data.roomCode);
    // Update URL without reloading to make sharing easy
    navigate(`/join/${data.roomCode}`, { replace: true });
  };

  const handleCreate = () => {
    if (!name) return alert("Enter a name!");
    // Expect a response object from the server; guard if server doesn't respond
    socket.emit('createRoom', name, (res) => {
      if (!res || !res.success) {
        console.error('createRoom callback missing or failed:', res);
        alert('Could not create room (no response). Try again.');
        return;
      }

      setupSession(res);
      setIsHost(true);
      changeView('LOBBY');
    });
  };

  const handleJoin = () => {
    if (!name || !roomCode) return alert("Need name & code!");
    socket.emit('joinRoom', { roomCode, playerName: name }, (res) => {
      if (res.success) {
        setupSession(res);
        setIsHost(false);
        changeView('LOBBY');
      } else {
        alert(res.error);
      }
    });
  };

  const leaveGame = () => {
    // 1. Tell backend to remove us (Network is fast, do this now)
    socket.emit('leaveRoom', { roomCode, playerId });

    // 2. Start the Animation VISUALLY
    // We change the view, which triggers PaperBoard to start crumpling
    changeView('HOME');

    // 3. DELAY the heavy cleanup
    // We wait 300ms (while the paper is being thrown) to clear the data.
    // This prevents the "stutter" at the start of the animation.
    setTimeout(() => {
      localStorage.clear();
      setPlayerId(null);
      setRoomCode('');
      setPlayers([]);
      setIsHost(false);
      setMyRole('');
      setQuestion('');
      setResult(null);

      // Update URL silently without forcing a hard refresh lag
      navigate('/');
    }, 500);
  };

  const copyInvite = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Link copied! Send it to a monkey.");
  };

  // --- RENDER ---
  return (
    <div className="app-container">

      <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <AnimToggle
        showAnimations={showAnimations}
        toggleAnimations={toggleAnimations}
      />

      <img src={titleImage} alt="title image" className='title-img' />

      <PaperBoard view={view} showAnimations={showAnimations}>

        {view === 'HOME' && (
          <>
            <input placeholder="შენი სახელი" value={name} onChange={e => setName(e.target.value)} />

            {/* If we have a room code from URL, show Join directly */}
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

        {view === 'LOBBY' && (
          <>
            <h2>Room: {roomCode}</h2>
            <button className="btn-link" onClick={copyInvite}>🔗 დააკოპირე ლინკი</button>

            <div style={{ margin: '20px 0' }}>
              {players.map(p => (
                <div key={p.id} className="player-row">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="avatar-circle">{MONKEYS[p.avatar]}</span>
                    {p.name} {p.id === playerId && "(You)"}
                  </div>
                  {p.isHost && <span style={{ color: 'orange' }}>👑</span>}
                </div>
              ))}
            </div>

            {isHost ? (
              <button className="btn-doodle" onClick={() => socket.emit('startGame', roomCode)}>დაიწყე თამაში</button>
            ) : (
              <p>დაელოდე ოთახის შემქმნელს...</p>
            )}
            <br />
            <button className="btn-doodle btn-leave" onClick={leaveGame}>Leave</button>
          </>
        )}

        {view === 'GAME' && (
          <>
            <div className="subtitle">
              {myRole === 'IMPOSTOR' ? <span style={{ color: 'var(--red)' }}>შენ ხარ მაიმუნი!</span> : <span>ნორმალური მოთამაშე</span>}
            </div>
            <h2>{question}</h2>
            <div className="speech-bubble">
              <input placeholder="Write something clever..." value={myAnswer} onChange={e => setMyAnswer(e.target.value)} style={{ width: '90%', borderBottom: 'none' }} />
            </div>
            <button className="btn-doodle" onClick={() => {
              if (!myAnswer) return;
              socket.emit('submitAnswer', { roomCode, playerId, answer: myAnswer });
              changeView('WAITING');
            }}>Done!</button>
          </>
        )}

        {view === 'WAITING' && (
          <>
            <h2>ფიქრის დრო...</h2>
            <p>დაელოდე სხვებს...</p>
            <div style={{ fontSize: '3rem', animation: 'spin 2s infinite' }}>🍌</div>
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
            <button className="btn-doodle btn-leave" onClick={leaveGame}>გადი თამაშიდან</button>
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
      <DoodleMonkey view={view} winState={result ? result.impostorCaught : null} />
    </div>
  );
}

// Router Wrapper
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