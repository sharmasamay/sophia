import React from "react";

function FontSizeSelector({availableFontSizes,selectedFontSize,isOpen, onToggle, onChange}){
    return (
    <div className="font-size-selector">
      <button 
        className="font-size-toggle"
        id="fontSizeToggle"
        onClick={onToggle}
      >
        {selectedFontSize}
      </button>
      {isOpen && (
        <div className="font-size-dropdown" id="fontSizeDropdown">
          <div className="font-size-dropdown-header">Font Size</div>
          {availableFontSizes.map((fontSizeOption) => (
            <div
              key={fontSizeOption.size}
              className={`font-size-option ${selectedFontSize === fontSizeOption.size ? 'selected' : ''}`}
              onClick={() => onChange(fontSizeOption.size)}
            >
              <span className="font-size-label">{fontSizeOption.label}</span>
              <span className="font-size-value">{fontSizeOption.size}px</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export default FontSizeSelector;