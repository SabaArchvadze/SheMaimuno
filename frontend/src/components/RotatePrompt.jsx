import React from 'react';
import './RotatePrompt.css';
import { useI18n } from '../i18n/I18nContext';

export default function RotatePrompt() {
  const { t } = useI18n();

  return (
    <div className="rotate-prompt" role="dialog" aria-live="polite">
      <div className="rotate-prompt__icon" aria-hidden="true">📱↻</div>
      <h2 className="rotate-prompt__title">{t('mobile.rotateTitle')}</h2>
      <p className="rotate-prompt__body">{t('mobile.rotateBody')}</p>
    </div>
  );
}
