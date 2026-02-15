import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- ASSETS ---
import face1 from '../assets/monkey-face1.svg';
import face2 from '../assets/monkey-face2.svg';
import face3 from '../assets/monkey-face3.svg';

// --- CONSTANTS ---
const POSES = {
  IDLE: {
    body: "M 25,30 Q 38,45 25,60 Q 12,45 25,30",
    arms: "M 25,32 Q 10,45 10,65 M 25,32 Q 40,45 40,65",
    legs: "M 25,60 L 15,85 M 25,60 L 35,85",
    tail: "M 25,63 C 20,35 -5,65 8,70 S 22,55 15,58",
    headY: 30
  },
  RUN_A: {
    body: "M 25,35 Q 38,50 30,60 Q 18,50 25,35",
    arms: "M 26,36 L 45,50 M 26,36 L 10,50",
    legs: "M 30,60 L 45,80 M 30,60 L 10,80",
    tail: "M 25,55 Q 18,55 12,55 C -8,55 0,35 10,35 S 16,55 7,45",
    headY: 35
  },
  RUN_B: {
    body: "M 25,34 Q 38,49 30,59 Q 18,49 25,34",
    arms: "M 26,35 L 10,50 M 26,35 L 45,50",
    legs: "M 30,59 L 25,80 M 30,59 L 35,80",
    tail: "M 25,55 Q 18,56 12,56 C -8,56 0,36 10,36 S 16,56 7,46",
    headY: 34
  },
  WAVE_A: {
    body: "M 25,30 Q 38,45 25,60 Q 12,45 25,30",
    arms: "M 25,32 Q 10,45 10,65 M 25,32 L 55,15",
    legs: "M 25,60 L 15,85 M 25,60 L 35,85",
    tail: "M 25,63 C 20,35 -5,65 8,70 S 22,55 15,58",
    headY: 30
  },
  WAVE_B: {
    body: "M 25,30 Q 38,45 25,60 Q 12,45 25,30",
    arms: "M 25,32 Q 10,45 10,65 M 25,32 L 60,35",
    legs: "M 25,60 L 15,85 M 25,60 L 35,85",
    tail: "M 25,63 C 20,35 -5,65 8,70 S 22,55 15,58",
    headY: 30
  },
  SCARED: {
    body: "M 25,45 Q 38,55 25,65 Q 12,55 25,45",
    arms: "M 25,45 Q 10,40 18,28 M 25,45 Q 40,40 32,28",
    legs: "M 25,65 L 15,85 M 25,65 L 35,85",
    tail: "M 25,63 C 20,35 -5,65 8,70 S 22,55 15,58",
    headY: 45
  },
  JUMP: {
    body: "M 25,30 Q 35,45 25,60 Q 15,45 25,30",
    arms: "M 25,32 Q 10,30 5,10 M 25,32 Q 40,30 45,10",
    legs: "M 25,60 L 15,70 M 25,60 L 35,70",
    tail: "M 25,55 C 30,70 15,90 5,85 S 18,70 12,75",
    headY: 30
  }
};

function SingleMonkey({ view, winState, headSrc, initialPos, sizeScale, depthOffset, showAnimations }) {

  const [pos, setPos] = useState(initialPos);
  const [direction, setDirection] = useState(Math.random() > 0.5 ? 1 : -1);
  const [offsetY, setOffsetY] = useState(0);
  const [poseKey, setPoseKey] = useState('IDLE');
  const [frame, setFrame] = useState(0);

  const loopRef = useRef();
  const logicRef = useRef();
  const isBusyRef = useRef(false);

  useEffect(() => {
    if (logicRef.current) clearInterval(logicRef.current);
    if (loopRef.current) clearInterval(loopRef.current); 
    isBusyRef.current = false;

    if (view === 'CREDITS') {
      setPoseKey('WAVE_A');
      loopRef.current = setInterval(() => {
        setPoseKey(prev => prev === 'WAVE_A' ? 'WAVE_B' : 'WAVE_A');
      }, 200); 
      return; 
    }

    let intervalTime = 1500 + Math.random() * 2000;
    if (view === 'RESULT' && winState === true) intervalTime = 800;

    const think = () => {
      if (isBusyRef.current) return;
      if (view === 'LOBBY' || view === 'HOME' || view === 'VOTING') {
        const dice = Math.random();

        if (dice < 0.05) setPoseKey('SCARED');
        else if (dice < 0.10) {
          isBusyRef.current = true;
          setPoseKey('JUMP');
          setTimeout(() => {
            setOffsetY(30 + Math.random() * 40);
            setTimeout(() => {
              setOffsetY(0);
              setPoseKey('IDLE');
              isBusyRef.current = false;
            }, 300);
          }, 100);
        }
        else if (dice < 0.20) wave();
        else if (dice < 0.60) {
          const dest = 5 + Math.random() * 90;
          runTo(dest, 'normal');
        }
        else setPoseKey('IDLE');
      }

      else if (view === 'GAME') {
        const dest = Math.random() > 0.5 ? 10 : 90;
        const noise = (Math.random() * 20) - 10;
        runTo(dest + noise, 'fast');
      }

      else if (view === 'WAITING') {
        setPoseKey('IDLE');
      }

      else if (view === 'RESULT') {
        if (winState === true) {
          setPoseKey('JUMP');
          setOffsetY(30 + Math.random() * 40);
          setTimeout(() => {
            setOffsetY(0);
            setPoseKey('IDLE');
          }, 400);
        } else {
          setPoseKey('SCARED');
          setOffsetY(0);
        }
      }
    };

    logicRef.current = setInterval(think, intervalTime);
    setTimeout(think, Math.random() * 500);

    return () => {
      clearInterval(logicRef.current);
      clearInterval(loopRef.current);
    };
  }, [view, winState]);


  const wave = () => {
    if (loopRef.current) clearInterval(loopRef.current);
    isBusyRef.current = true;

    let count = 0;
    setPoseKey('WAVE_A');

    loopRef.current = setInterval(() => {
      setPoseKey(prev => prev === 'WAVE_A' ? 'WAVE_B' : 'WAVE_A');
      count++;
      if (count > 8) { 
        clearInterval(loopRef.current);
        setPoseKey('IDLE');
        isBusyRef.current = false;
      }
    }, 100);
  };

  const runTo = (destination, speedMode) => {
    isBusyRef.current = true;

    setPos((currentX) => {
      const dist = destination - currentX;
      if (Math.abs(dist) < 2) {
         isBusyRef.current = false; 
         return currentX;
      }

      const dir = dist > 0 ? 1 : -1;
      setDirection(dir);

      const baseSpeed = speedMode === 'fast' ? 0.6 : 0.2;
      const speed = baseSpeed + (Math.random() * 0.1);

      if (loopRef.current) clearInterval(loopRef.current);

      loopRef.current = setInterval(() => {
        setPos((prev) => {
          if ((dir === 1 && prev >= destination) || (dir === -1 && prev <= destination)) {
            clearInterval(loopRef.current);
            setPoseKey('IDLE');
            isBusyRef.current = false;
            return destination;
          }
          setFrame(f => f + 1);
          return prev + (dir * speed);
        });
      }, 16);

      return currentX;
    });
  };

  useEffect(() => {
    if (loopRef.current && (poseKey.startsWith('RUN') || poseKey === 'IDLE')) {
      setPoseKey(frame % 10 < 5 ? 'RUN_A' : 'RUN_B');
    }
  }, [frame]);

  const currentPath = POSES[poseKey];
  const width = 50 * sizeScale;
  const height = 90 * sizeScale;

  if (!showAnimations) return null;

  return (
    <div
      className="monkey-wrapper"
      style={{
        left: `${pos}%`,
        bottom: 20 + depthOffset + offsetY,
        width: width,
        height: height,
        transform: `scaleX(${direction})`,
        zIndex: -1,
      }}
    >
      <svg className="monkey-svg" viewBox="0 0 50 90">
        <g fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d={currentPath.tail} className={['IDLE', 'SCARED', 'WAVE_A', 'WAVE_B'].includes(poseKey) ? 'tail-idle' : ''} />
          <path d={currentPath.legs} />
          <path d={currentPath.body} fill="#FAF5E7" />
          <path d={currentPath.arms} />
          <image
            href={headSrc}
            x="5"
            y={currentPath.headY - 35}
            width="40"
            height="40"
            style={{
              transform: poseKey === 'SCARED' ? 'rotate(10deg)' : 'none',
              transformBox: 'fill-box',
              transformOrigin: 'center'
            }}
          />
        </g>
      </svg>
    </div >
  );
}

export default function DoodleMonkey({ view, winState, showAnimations }) {
  const monkeys = useMemo(() => {
    const troop = [];
    for (let i = 0; i < 5; i++) {
      const r = Math.random();
      let head;
      if (r < 0.333) head = face1;
      else if (r < 0.666) head = face2;
      else head = face3;

      troop.push({
        id: i,
        headSrc: head,
        initialPos: 10 + (Math.random() * 80),
        sizeScale: 0.7 + (Math.random() * 0.5),
        depthOffset: Math.random() * 40
      });
    }
    return troop.sort((a, b) => b.depthOffset - a.depthOffset);
  }, []);

  return (
    <>
      {monkeys.map(m => (
        <SingleMonkey key={m.id} view={view} winState={winState} headSrc={m.headSrc} initialPos={m.initialPos} sizeScale={m.sizeScale} depthOffset={m.depthOffset} showAnimations={showAnimations} />
      ))}
    </>
  );
}