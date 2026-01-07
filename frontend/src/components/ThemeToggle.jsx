import React from 'react';
import './ThemeToggle.css';

export default function ThemeToggle({ isDarkMode, toggleTheme }) {
  return (
    <label className="doodle-switch">
      <input 
        className="switch__input" 
        type="checkbox" 
        role="switch"
        checked={isDarkMode} 
        onChange={toggleTheme}
      />

      <span className="switch__sr">Toggle Dark Mode</span>
    </label>
  );
}