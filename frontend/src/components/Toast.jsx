import React, { useState, useEffect, useMemo } from 'react';
import './Toast.css';
import { useI18n } from '../i18n/I18nContext';

export default function Toast({
  message,
  messageKey,
  messageParams,
  type,
  openKey,
  onClose,
  duration = 3000,
}) {
  const { t } = useI18n();
  const [isExiting, setIsExiting] = useState(false);

  const display = useMemo(() => {
    if (messageKey) {
      return t(`toasts.${messageKey}`, messageParams);
    }
    return message || '';
  }, [messageKey, messageParams, message, t]);

  useEffect(() => {
    setIsExiting(false);

    if (!openKey) return;
    if (!display && !messageKey) return;

    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 500);

    const closeTimer = setTimeout(() => {
      onClose();
      setIsExiting(false);
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [openKey, duration, onClose, display, messageKey]);

  if (!openKey) return null;
  if (!display) return null;

  return (
    <div className="toast-container">
      <div className={`toast-box ${type} ${isExiting ? 'toast-exit' : ''}`}>
        {display}
      </div>
    </div>
  );
}
