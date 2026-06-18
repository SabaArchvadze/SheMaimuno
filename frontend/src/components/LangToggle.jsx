import React from 'react';
import './LangToggle.css';
import { useI18n } from '../i18n/I18nContext';

export default function LangToggle() {
  const { lang, setLang } = useI18n();

  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button
        type="button"
        className={`lang-toggle__btn ${lang === 'ka' ? 'lang-toggle__btn--active' : ''}`}
        onClick={() => setLang('ka')}
        aria-pressed={lang === 'ka'}
      >
        Geo
      </button>
      <button
        type="button"
        className={`lang-toggle__btn ${lang === 'en' ? 'lang-toggle__btn--active' : ''}`}
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
      >
        En
      </button>
    </div>
  );
}
