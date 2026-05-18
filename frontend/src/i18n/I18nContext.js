import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STRINGS, DEFAULT_LANG, SUPPORTED_LANGS } from './strings';

const I18nContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => key,
});

const getByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, segment) => (acc && acc[segment] !== undefined ? acc[segment] : undefined), obj);
};

const interpolate = (str, vars) => {
  if (typeof str !== 'string' || !vars) return str;
  return str.replace(/\{(\w+)\}/g, (match, name) => (vars[name] !== undefined ? String(vars[name]) : match));
};

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('sm_lang') : null;
    return SUPPORTED_LANGS.includes(saved) ? saved : DEFAULT_LANG;
  });

  useEffect(() => {
    try { window.localStorage.setItem('sm_lang', lang); } catch (_) {}
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangState(SUPPORTED_LANGS.includes(next) ? next : DEFAULT_LANG);
  }, []);

  const t = useCallback((key, vars) => {
    const primary = getByPath(STRINGS[lang], key);
    if (typeof primary === 'string' && primary.length > 0) {
      return interpolate(primary, vars);
    }

    const fallback = getByPath(STRINGS[DEFAULT_LANG], key);
    if (typeof fallback === 'string' && fallback.length > 0) {
      return interpolate(fallback, vars);
    }

    return key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
