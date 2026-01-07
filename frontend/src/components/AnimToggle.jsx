import React from 'react';
import './AnimToggle.css';

export default function AnimToggle({ showAnimations, toggleAnimations }) {
  return (
    <div 
      className="anim-toggle-container" 
      onClick={toggleAnimations} // Clicking the whole box toggles it
    >
      <input 
        type="checkbox" 
        className="anim-checkbox"
        checked={showAnimations}
        readOnly // React handles the click via the parent div
      />
      <span className="anim-label">Animations</span>
    </div>
  );
}