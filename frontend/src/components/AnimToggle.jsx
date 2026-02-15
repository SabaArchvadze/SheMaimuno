import React from 'react';
import './AnimToggle.css';

export default function AnimToggle({ showAnimations, toggleAnimations }) {
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
      <span className="anim-label">Animations</span>
    </div>
  );
}