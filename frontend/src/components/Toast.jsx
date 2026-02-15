import React, { useState, useEffect } from 'react';
import './Toast.css';

export default function Toast({ message, type, onClose, duration = 3000 }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setIsExiting(false);

    if (!message) return;

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
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className="toast-container">
      <div className={`toast-box ${type} ${isExiting ? 'toast-exit' : ''}`}>
        {message}
      </div>
    </div>
  );
}