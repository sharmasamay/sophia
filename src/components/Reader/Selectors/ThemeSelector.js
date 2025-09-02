import React from "react";

function ThemeSelector({availableThemes,selectedTheme,isOpen, onToggle, onChange, getCurrent}){
    return (
    <div className="theme-selector">
        <button 
        className="theme-toggle"
        id="themeToggle"
        onClick={onToggle}
        >
        {getCurrent().icon}
        </button>
        {isOpen && (
        <div className="theme-dropdown" id="themeDropdown">
            <div className="theme-dropdown-header">Choose Theme</div>
            {availableThemes.map((theme) => (
            <div
                key={theme.id}
                className={`theme-option ${selectedTheme === theme.id ? 'selected' : ''}`}
                onClick={() => onChange(theme)}
            >
                <div className="theme-preview">
                <div 
                    className="theme-color-preview"
                    style={{ 
                    backgroundColor: theme.background,
                    color: theme.text,
                    border: `1px solid ${theme.text}20`
                    }}
                >
                    {theme.icon}
                </div>
                <span className="theme-name">{theme.name}</span>
                </div>
            </div>
            ))}
        </div>
        )}
    </div>
  );
}
export default ThemeSelector;