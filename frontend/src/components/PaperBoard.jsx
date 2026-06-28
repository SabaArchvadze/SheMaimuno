import React, { useState, useEffect, useRef } from 'react';
import '../App.css';
import './PaperBoard.css';

import paperIn from '../assets/paperIn.webm';
import paperOut from '../assets/paperOut.webm';
import paperStill from '../assets/paperStill.png';

const DURATION = 1500;

export default function PaperBoard({ children, view, showAnimations, isMobileLite = false }) {
  const usePaperVideo = showAnimations && !isMobileLite;

  const [displayedView, setDisplayedView] = useState(view);
  const [displayContent, setDisplayContent] = useState(children);
  const [animState, setAnimState] = useState('STATIC');
  const [videoKey, setVideoKey] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [mobileFading, setMobileFading] = useState(false);

  const latestViewRef = useRef(view);
  const latestChildrenRef = useRef(children);
  const crumbleTimerRef = useRef(null);
  const uncrumpleTimerRef = useRef(null);
  const mobileFadeTimerRef = useRef(null);
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

      if (isMobileLite) {
        setMobileFading(true);
        if (mobileFadeTimerRef.current) clearTimeout(mobileFadeTimerRef.current);
        mobileFadeTimerRef.current = setTimeout(() => {
          setDisplayedView(view);
          setDisplayContent(children);
          setMobileFading(false);
        }, 120);
        return;
      }

      if (isInitialRefresh || !usePaperVideo) {
        setDisplayedView(view);
        setDisplayContent(children);
        setAnimState('STATIC');
        setIsVideoPlaying(false);
        return;
      }

      if (crumbleTimerRef.current) clearTimeout(crumbleTimerRef.current);
      if (uncrumpleTimerRef.current) clearTimeout(uncrumpleTimerRef.current);

      setIsVideoPlaying(false);
      setAnimState('CRUMPLING');
      setVideoKey((prev) => prev + 1);

      crumbleTimerRef.current = setTimeout(() => {
        setDisplayedView(latestViewRef.current);
        setDisplayContent(latestChildrenRef.current);
        setAnimState('UNCRUMPLING');
        setVideoKey((prev) => prev + 1);

        uncrumpleTimerRef.current = setTimeout(() => {
          setAnimState('STATIC');
          setIsVideoPlaying(false);
          setDisplayedView(latestViewRef.current);
          setDisplayContent(latestChildrenRef.current);
        }, DURATION);
      }, DURATION);
    } else if (view === displayedView && animState === 'STATIC') {
      setDisplayContent(children);
    }
  }, [view, displayedView, animState, children, usePaperVideo, isMobileLite]);

  useEffect(() => () => {
    if (crumbleTimerRef.current) clearTimeout(crumbleTimerRef.current);
    if (uncrumpleTimerRef.current) clearTimeout(uncrumpleTimerRef.current);
    if (mobileFadeTimerRef.current) clearTimeout(mobileFadeTimerRef.current);
  }, []);

  if (isMobileLite) {
    return (
      <div className="mobile-game-panel" data-view={view}>
        <div className={`mobile-panel-content${mobileFading ? ' mobile-panel-fade' : ''}`}>
          {displayContent}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`paper-board-container ${animState.toLowerCase()} ${!usePaperVideo ? 'simple-mode' : ''}`}
      data-view={view}
    >
      <img
        src={paperStill}
        alt=""
        className={`paper-frame-img ${isVideoPlaying ? 'invisible' : ''}`}
      />

      {animState !== 'STATIC' && usePaperVideo && (
        <video
          key={videoKey}
          src={animState === 'CRUMPLING' ? paperOut : paperIn}
          className="paper-frame-img"
          autoPlay
          muted
          playsInline
          onPlay={() => setIsVideoPlaying(true)}
        />
      )}

      <div className={`paper-content-overlay ${animState !== 'STATIC' ? 'hidden' : ''}`}>
        {displayContent}
      </div>
    </div>
  );
}
