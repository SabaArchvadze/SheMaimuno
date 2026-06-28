import React from 'react';
import './LangToggle.css';
import { useI18n } from '../i18n/I18nContext';

export default function LangToggle() {
  const { lang, setLang } = useI18n();
  const isGeorgian = lang === 'ka';

  const geoLabel = isGeorgian ? 'ქარ' : 'Geo';
  const enLabel = isGeorgian ? 'ინგ' : 'En';

  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button
        type="button"
        className={`lang-toggle__btn ${isGeorgian ? 'lang-toggle__btn--active' : ''}`}
        onClick={() => setLang('ka')}
        aria-pressed={isGeorgian}
      >
        {geoLabel}
      </button>
      <button
        type="button"
        className={`lang-toggle__btn ${!isGeorgian ? 'lang-toggle__btn--active' : ''}`}
        onClick={() => setLang('en')}
        aria-pressed={!isGeorgian}
      >
        {enLabel}
      </button>
    </div>
  );
}
