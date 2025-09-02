import React, { useState } from 'react';
import './SetupModal.css';

const SetupModal = ({ onSetupComplete }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('Please enter your Gemini API key');
      return;
    }

    // Basic validation for Gemini API key format
    if (!apiKey.startsWith('AIza') || apiKey.length < 35) {
      setError('Please enter a valid Gemini API key (should start with "AIza")');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Test the API key by making a simple request
      const testResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
      
      if (!testResponse.ok) {
        throw new Error('Invalid API key or network error');
      }

      // If successful, save the API key and complete setup
      await onSetupComplete(apiKey);
    } catch (error) {
      console.error('API key validation error:', error);
      setError('Invalid API key. Please check your key and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Allow user to skip setup, but they won't have AI features
    onSetupComplete(null);
  };

  return (
    <div className="setup-overlay">
      <div className="setup-modal">
        <div className="setup-header">
          <h2>Welcome to Sophia! 📚</h2>
          <p>To enable AI-powered explanations and chat features, please provide your Gemini API key.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="setup-form">
          <div className="input-group">
            <label htmlFor="apiKey">Gemini API Key:</label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key (AIza...)"
              className={error ? 'error' : ''}
            />
            {error && <span className="error-message">{error}</span>}
          </div>
          
          <div className="setup-info">
            <p>
              Don't have an API key? 
              <a 
                href="https://makersuite.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Get one from Google AI Studio
              </a>
            </p>
          </div>
          
          <div className="setup-buttons">
            <button 
              type="button" 
              onClick={handleSkip}
              className="skip-button"
              disabled={isLoading}
            >
              Skip for now
            </button>
            <button 
              type="submit" 
              className="submit-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  Validating...
                </>
              ) : (
                'Save & Continue'
              )}
            </button>
          </div>
        </form>
        
        <div className="setup-footer">
          <p>Your API key will be stored locally and securely in your browser.</p>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;
