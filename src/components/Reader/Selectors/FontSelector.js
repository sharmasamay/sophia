import React from 'react';

function FontSelector({ availableFonts, selectedFont, isOpen, onToggle, onChange }) {
  return (
    <div className="font-selector">
              <button 
                className="font-toggle"
                id="fontToggle"
                onClick={onToggle}
              >
                Aa
              </button>
              {isOpen && (
                <div className="font-dropdown" id="fontDropdown">
                  <div className="font-dropdown-header">Choose Font</div>
                  {availableFonts.map((font) => (
                    <div
                      key={font.name}
                      className={`font-option ${selectedFont === font.name ? 'selected' : ''}`}
                      style={{ fontFamily: font.family }}
                      onClick={() => onChange(font)}
                    >
                      {font.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
  );
}

export default FontSelector;