import React, { useState, useRef, useEffect } from 'react';
import './SettingsPanel.css';
import ThemeToggle from './ThemeToggle';
import AnimToggle from './AnimToggle';
import LangToggle from './LangToggle';
import { useI18n } from '../i18n/I18nContext';

export default function SettingsPanel({
  isDarkMode,
  toggleTheme,
  showAnimations,
  toggleAnimations,
  isFullscreen,
  fsSupported,
  enterFullscreen,
  exitFullscreen,
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div className="settings-panel" ref={panelRef}>
      <button
        type="button"
        className={`settings-panel__cog${open ? ' is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
        aria-expanded={open}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div className="settings-panel__dropdown" role="dialog" aria-label="Settings">
          <div className="settings-panel__row">
            <span className="settings-panel__label">{t('ui.theme')}</span>
            <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
          </div>

          <div className="settings-panel__divider" />

          <div className="settings-panel__row">
            <span className="settings-panel__label">{t('ui.animations')}</span>
            <AnimToggle showAnimations={showAnimations} toggleAnimations={toggleAnimations} compact />
          </div>

          <div className="settings-panel__divider" />

          <div className="settings-panel__row">
            <LangToggle />
          </div>

          {fsSupported && (
            <>
              <div className="settings-panel__divider" />
              <button
                type="button"
                className="settings-panel__fullscreen"
                onClick={() => {
                  if (isFullscreen) exitFullscreen();
                  else enterFullscreen();
                  setOpen(false);
                }}
              >
                {isFullscreen ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                    <path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                    <path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                  </svg>
                )}
                {isFullscreen ? t('ui.exitFullscreen') : t('ui.fullscreen')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
