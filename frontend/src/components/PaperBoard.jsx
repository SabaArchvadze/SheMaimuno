import React, { useState, useEffect } from 'react';
import '../App.css';
import './PaperBoard.css';

// --- IMPORTS ---
import paperIn from '../assets/paperIn.webm';
import paperOut from '../assets/paperOut.webm';
import paperStill from '../assets/paperStill.png';

// CONFIG
const DURATION = 1500; 

export default function PaperBoard({ children, view, showAnimations }) {
  const [displayedView, setDisplayedView] = useState(view);
  const [displayContent, setDisplayContent] = useState(children);

  // States: 'STATIC', 'CRUMPLING', 'UNCRUMPLING'
  const [animState, setAnimState] = useState('STATIC');
  const [videoKey, setVideoKey] = useState(0);

  // New State: Is the video actually playing yet?
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // --- VIEW CHANGE DETECTOR ---
  useEffect(() => {
    if (view !== displayedView && animState === 'STATIC') {
      startCrumpleSequence();
    } else if (view === displayedView && animState === 'STATIC') {
      setDisplayContent(children);
    }
  }, [view, displayedView, animState, children]);

  // --- ANIMATION LOGIC ---
  const startCrumpleSequence = () => {
    setIsVideoPlaying(false);
    setAnimState('CRUMPLING');
    setVideoKey(prev => prev + 1);

    setTimeout(() => {
      setDisplayedView(view);
      setDisplayContent(children);
      
      setAnimState('UNCRUMPLING');
      setVideoKey(prev => prev + 1);

      setTimeout(() => {
        setAnimState('STATIC');
        setIsVideoPlaying(false);
      }, DURATION); 

    }, DURATION); 
  };

  return (
    <div className={`paper-board-container ${animState.toLowerCase()} ${!showAnimations ? 'simple-mode' : ''}`}>

      {/* 1. THE STILL IMAGE (Always in DOM) */}
      {/* We only hide it (opacity 0) if the video is confirmed playing */}
      <img
        src={paperStill}
        alt="Paper Background"
        className={`paper-frame-img ${isVideoPlaying ? 'invisible' : ''}`}
      />

      {/* 2. THE VIDEO (Overlay) */}
      {animState !== 'STATIC' && (
        <video
          key={videoKey}
          src={animState === 'CRUMPLING' ? paperOut : paperIn}
          className="paper-frame-img"
          autoPlay
          muted
          playsInline
          // MAGIC FIX: When video actually starts moving, hide the image behind it
          onPlay={(e) => {
            setIsVideoPlaying(true);
          }}
        />
      )}

      {/* 3. CONTENT */}
      <div className={`paper-content-overlay ${animState !== 'STATIC' ? 'hidden' : ''}`}>
        {displayContent}
      </div>

    </div>
  );
}