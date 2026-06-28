import React from 'react';
import './AnimToggle.css';
import { useI18n } from '../i18n/I18nContext';

export default function AnimToggle({ showAnimations, toggleAnimations, compact = false }) {
  const { t } = useI18n();
  return (
    <div
      className={`anim-toggle-container${compact ? ' anim-toggle-compact' : ''}`}
      onClick={toggleAnimations}
      role="button"
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && toggleAnimations()}
      aria-label={`${t('ui.animations')} ${showAnimations ? 'on' : 'off'}`}
    >
      <input
        type="checkbox"
        className="anim-checkbox"
        checked={showAnimations}
        readOnly
        tabIndex={-1}
      />
      <span className="anim-label">
        {compact ? t('ui.animShort') : t('ui.animations')}
      </span>
    </div>
  );
}
