import React from 'react';
import './LangToggle.css';
import { useI18n } from '../i18n/I18nContext';

export default function LangToggle() {
  const { lang, setLang } = useI18n();
  const isEnglish = lang === 'en';

  return (
    <label className="lang-toggle" title="Language">
      <span className={`lang-side lang-left ${!isEnglish ? 'active' : ''}`}>Geo</span>
      <input
        className="lang-switch__input"
        type="checkbox"
        role="switch"
        checked={isEnglish}
        onChange={() => setLang(isEnglish ? 'ka' : 'en')}
      />
      <span className={`lang-side lang-right ${isEnglish ? 'active' : ''}`}>En</span>
    </label>
  );
}
