import React, { useState, useEffect } from 'react';
import '../App.css';
import './PaperBoard.css';

import paperIn from '../assets/paperIn.webm';
import paperOut from '../assets/paperOut.webm';
import paperStill from '../assets/paperStill.png';

const DURATION = 1500; 

export default function PaperBoard({ children, view, showAnimations }) {
  const [displayedView, setDisplayedView] = useState(view);
  const [displayContent, setDisplayContent] = useState(children);

  const [animState, setAnimState] = useState('STATIC');
  const [videoKey, setVideoKey] = useState(0);

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    if (view !== displayedView && animState === 'STATIC') {
      startCrumpleSequence();
    } else if (view === displayedView && animState === 'STATIC') {
      setDisplayContent(children);
    }
  }, [view, displayedView, animState, children]);

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

      <img
        src={paperStill}
        alt="Paper Background"
        className={`paper-frame-img ${isVideoPlaying ? 'invisible' : ''}`}
      />

      {animState !== 'STATIC' && (
        <video
          key={videoKey}
          src={animState === 'CRUMPLING' ? paperOut : paperIn}
          className="paper-frame-img"
          autoPlay
          muted
          playsInline
          onPlay={(e) => {
            setIsVideoPlaying(true);
          }}
        />
      )}

      <div className={`paper-content-overlay ${animState !== 'STATIC' ? 'hidden' : ''}`}>
        {displayContent}
      </div>

    </div>
  );
}