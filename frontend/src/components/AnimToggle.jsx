import React from 'react';
import './AnimToggle.css';
import { useI18n } from '../i18n/I18nContext';

export default function AnimToggle({ showAnimations, toggleAnimations }) {
  const { t } = useI18n();
  return (
    <div
      className="anim-toggle-container"
      onClick={toggleAnimations}
    >
      <input
        type="checkbox"
        className="anim-checkbox"
        checked={showAnimations}
        readOnly
      />
      <span className="anim-label">{t('ui.animations')}</span>
    </div>
  );
}
