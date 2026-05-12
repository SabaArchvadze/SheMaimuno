import React, { useState, useEffect, useRef } from 'react';
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
  const latestViewRef = useRef(view);
  const latestChildrenRef = useRef(children);
  const crumbleTimerRef = useRef(null);
  const uncrumpleTimerRef = useRef(null);
  const mountTimeRef = useRef(Date.now());
  const hasInitialTransitionedRef = useRef(false);

  useEffect(() => {
    latestViewRef.current = view;
    latestChildrenRef.current = children;
  }, [view, children]);

  useEffect(() => {
    if (view !== displayedView && animState === 'STATIC') {
      const elapsedSinceMount = Date.now() - mountTimeRef.current;
      const isInitialRefresh = !hasInitialTransitionedRef.current && elapsedSinceMount < 1500;
      hasInitialTransitionedRef.current = true;

      if (isInitialRefresh || !showAnimations) {
        setDisplayedView(view);
        setDisplayContent(children);
        setAnimState('STATIC');
        setIsVideoPlaying(false);
        return;
      }

      startCrumpleSequence();
    } else if (view === displayedView && animState === 'STATIC') {
      setDisplayContent(children);
    }
  }, [view, displayedView, animState, children, showAnimations]);

  useEffect(() => {
    return () => {
      if (crumbleTimerRef.current) clearTimeout(crumbleTimerRef.current);
      if (uncrumpleTimerRef.current) clearTimeout(uncrumpleTimerRef.current);
    };
  }, []);

  const startCrumpleSequence = () => {
    if (crumbleTimerRef.current) clearTimeout(crumbleTimerRef.current);
    if (uncrumpleTimerRef.current) clearTimeout(uncrumpleTimerRef.current);

    setIsVideoPlaying(false);
    setAnimState('CRUMPLING');
    setVideoKey(prev => prev + 1);

    crumbleTimerRef.current = setTimeout(() => {
      setDisplayedView(latestViewRef.current);
      setDisplayContent(latestChildrenRef.current);
      
      setAnimState('UNCRUMPLING');
      setVideoKey(prev => prev + 1);

      uncrumpleTimerRef.current = setTimeout(() => {
        setAnimState('STATIC');
        setIsVideoPlaying(false);
        setDisplayedView(latestViewRef.current);
        setDisplayContent(latestChildrenRef.current);
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

      {animState !== 'STATIC' && showAnimations && (
        <video
          key={videoKey}
          src={animState === 'CRUMPLING' ? paperOut : paperIn}
          className="paper-frame-img"
          autoPlay
          muted
          playsInline
          onPlay={() => {
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