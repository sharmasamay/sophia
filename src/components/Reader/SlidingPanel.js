import React,{useState} from 'react';
import './SlidingPanel.css'
function SlidingPanel({isOpen,selectedText,selectedWord,wordDefinition,isLoadingDefinition, textExplanation,isLoadingExplanation,chatMessages,chatInput,setChatInput,sendChatMessage,clearChat,isLoadingChat,onStartingPointChange,onFamiliarityLevelChange,onPromptChange,fetchTextExplanation,setTextExplanation}){
    const [activeTab, setActiveTab] = useState('understand');
    const [startingPoint,setStartingPoint] = useState('')
    const [familiarityLevel, setfamiliarityLevel] = useState(null);
    const [selectedPrompt,setselectedPrompt] = useState(null); // Track the selected bubble
    const [currentQuestion,setCurrentQuestion] = useState(1);

    // const fetchTextExplanation = async (selectedText) => {
    //     if (!geminiApiKey) {
    //     return "AI features are not available. Please set up your Gemini API key in settings.";
    //     }
    //     isLoadingExplanation(true);
    //     try {
    //     const contentChunks = bookContentChunks.map(chunk => chunk.content);
        
    //     const response = await fetch('https://sophia-7tkw.onrender.com/explain', {
    //         method: 'POST',
    //         headers: {
    //         'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify({
    //         selected_text: selectedText,
    //         book_title: bookTitle,
    //         book_chunks: contentChunks,
    //         api_key: geminiApiKey,
    //         starting_point: startingPoint,
    //         familiarity: familiarityLevel,
    //         prompt: selectedPrompt,
    //         })
    //     });
        
    //     const data = await response.json();
        
    //     if (data.error) {
    //         return `Error: ${data.error}`;
    //     }
        
    //     return data.explanation || 'No explanation available.';
    //     } catch (error) {
    //     console.error('Error fetching explanation:', error);
    //     return `Error fetching explanation. Make sure the Flask server is running on port 5000.`;
    //     } finally {
    //     isLoadingExplanation(false);
    //     }
    // };

    return(
        <div className={`sliding-panel ${isOpen ? 'open' : ''}`} id="slidingPanel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
                <button
                className={`tab-button ${activeTab === 'understand' ? 'active' : ''}`}
                onClick={() => setActiveTab('understand')}
                >
                Understand
                </button>
                <button
                className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
                >
                Chat
                </button>
            </div>
        
                
            <div className="panel-content">
                {activeTab === 'understand' && (
                <div>
                    <div id="selectionText" style={{
                        color: '#333',
                        fontWeight: '600',
                        fontSize: '1rem',
                        marginBottom: '20px' // Add bottom margin
                        }}>
                        <p style={{color: '#333', fontWeight: '600', fontSize: '1.1rem'}}>Selected Text:</p>
                        <div 
                            id="selectedText" 
                            style={{
                            marginTop: '10px', 
                            padding: '12px', 
                            background: 'rgba(102, 126, 234, 0.08)', 
                            borderRadius: '8px', 
                            fontStyle: 'italic', 
                            minHeight: '50px',
                            color: '#444',
                            border: '1px solid rgba(102, 126, 234, 0.2)',
                            fontSize: '0.95rem'
                            }}
                        >
                            {selectedText}
                        </div>
                    </div>

                    <div id="curatePrompt">
                        <p style={{color: '#333', fontWeight: '600', fontSize: '1.1rem', marginBottom:'10px'}}>Curate Your Own Prompt:</p>
                        {currentQuestion===1 && (
                            <>
                            <p style={{ color: '#333', fontWeight: '600', fontSize: '1rem', marginBottom:'7px' }}>Why don't we begin with what YOU think the author is trying to say here? Even a few words would be delightful.</p>
                            <p style={{ color: '#333', fontWeight: '600', fontSize: '0.8rem' }}>(You can skip this question, though it's highly recommended)</p>
                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <textarea
                                    className="huge-textbox"
                                    placeholder="Let your mind run free..."
                                    value = {startingPoint}
                                    onChange={(e) => {setStartingPoint(e.target.value)
                                        if (onStartingPointChange) {
                                            onStartingPointChange(startingPoint);
                                        }
                                    }}
                                    rows="10" // Number of visible rows
                                    style={{
                                    width: '90%', // Full width with some margin
                                    height: '200px', // Height of the textbox
                                    padding: '12px', // Padding inside the textbox
                                    fontSize: '1rem', // Font size for the text
                                    border: '1px solid rgba(102, 126, 234, 0.5)', // Border color
                                    borderRadius: '8px', // Rounded corners
                                    resize: 'none', // Disable resizing
                                    outline: 'none', // Remove focus outline
                                    }}
                                />
                            </div>
                            </>
                        )}
                        {currentQuestion===2 && (
                            <><p style={{ color: '#333', fontWeight: '600', fontSize: '1rem' }}>How familiar are you with the content of this text?</p><div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap', marginBottom: '10px', flexDirection: 'column', alignItems: 'center' }}>
                                    <button
                                        className={`bubble-option ${familiarityLevel === 'Not Familiar' ? 'selected' : ''}`}
                                        onClick={() => {
                                            setfamiliarityLevel('Not familiar')
                                            if (onFamiliarityLevelChange) {
                                                onFamiliarityLevelChange(familiarityLevel); 
                                            }
                                        }}
                                    >
                                        Not Familiar
                                    </button>
                                    <button
                                        className={`bubble-option ${familiarityLevel === 'Somewhat familiar' ? 'selected' : ''}`}
                                        onClick={() => {
                                            setfamiliarityLevel('Somewhat familiar')
                                            if (onFamiliarityLevelChange) {
                                                onFamiliarityLevelChange(familiarityLevel); 
                                            }
                                        
                                        }}
                                    >
                                        Somewhat Familiar
                                    </button>
                                    <button
                                        className={`bubble-option ${familiarityLevel === 'Very familiar' ? 'selected' : ''}`}
                                        onClick={() => {
                                            setfamiliarityLevel('Very familiar')
                                            if (onFamiliarityLevelChange) {
                                                onFamiliarityLevelChange(familiarityLevel); 
                                            }
                                        }}
                                    >
                                        Very Familiar
                                    </button>
                                </div></>
                        )}

                        {currentQuestion===3 &&(
                            <><p style={{color: '#333', fontWeight: '600', fontSize: '1rem'}}>How do you wish to understand the selected text?</p>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap',flexDirection:'column',alignItems:'center' }}>
                                <button
                                className={`bubble-option ${selectedPrompt === 'Give me an example' ? 'selected' : ''}`}
                                onClick={async () => {
                                    setselectedPrompt('Give me an example')
                                    if (onPromptChange) {
                                        onPromptChange('Give me an example'); 
                                    }
                                    // const explanation = await fetchTextExplanation(selectedTextContent);
                                }}
                                >
                                Give me an example
                                </button>
                                <button
                                className={`bubble-option ${selectedPrompt === 'Explain in a 100 words' ? 'selected' : ''}`}
                                onClick={async () => {
                                    setselectedPrompt('Explain in a 100 words')
                                    if (onPromptChange) {
                                        onPromptChange('Explain in a 100 words'); 
                                    }
                                }}
                                >
                                Explain in a 100 words
                                </button>
                                <button
                                className={`bubble-option ${selectedPrompt === 'Paraphrase it in simpler language' ? 'selected' : ''}`}
                                onClick={async () => {
                                    setselectedPrompt('Paraphrase it in easier language')
                                    if (onPromptChange) {
                                        onPromptChange('Paraphrase it in easier language'); 
                                    }
                                }}
                                >
                                Paraphrase it in easier language
                                </button>
                                <button
                                className={`bubble-option ${selectedPrompt === 'Summarize it concisely' ? 'selected' : ''}`}
                                onClick={async () => {
                                    setselectedPrompt('Summarize it concisely')
                                    if (onPromptChange) {
                                        onPromptChange('Summarize it concisely'); 
                                    }
                                }}
                                >
                                Summarize it concisely
                                </button>
                                <button
                                className={`bubble-option ${selectedPrompt === 'Give me analogies and metaphors' ? 'selected' : ''}`}
                                onClick={async () => {
                                    setselectedPrompt('Give me analogies and metaphors')
                                    if (onPromptChange) {
                                        onPromptChange('Give me analogies and metaphors'); 
                                    }
                                }}
                                >
                                Give me analogies and metaphors
                                </button>
                                <button
                                className={`bubble-option ${selectedPrompt === 'Give me a run through of the key words' ? 'selected' : ''}`}
                                onClick={async () => {
                                    setselectedPrompt('Give me a run through of the key words')
                                    if (onPromptChange) {
                                        onPromptChange('Give me a run through of the key words'); 
                                    }
                                }}
                                >
                                Give me a run through of the key words
                                </button>
                            </div></>
                        )}
                        <div style={{textAlign: 'center',marginTop: '20px', display: 'flex', justifyContent: 'center',alignItems: 'center', gap:'10px'}}>
                            <button
                                className="forward-back-button"
                                onClick={() => {
                                if (currentQuestion > 1) {
                                    setCurrentQuestion(currentQuestion - 1); // Go back to the previous question
                                }
                                }}
                                disabled={currentQuestion === 1} // Disable the button if on the first question
                            >
                                ←
                            </button>
                            <button
                                className="forward-back-button"
                                onClick={async () => {
                                   if (currentQuestion < 3) {
                                        setCurrentQuestion(currentQuestion + 1);
                                        return;
                                    }
                                    else {
                                        setTextExplanation('Loading explanation...');
                                        const explanation = await fetchTextExplanation(selectedText, {
                                            startingPoint: startingPoint || '',
                                            familiarity: familiarityLevel || '',
                                            prompt: selectedPrompt || ''
                                        });
                                        if (typeof setTextExplanation === 'function') {
                                            setTextExplanation(explanation);
                                        }
                                        // optional: open panel / scroll into view here if needed
                                    }

                                }}
                            >
                            →    
                            </button>
                        </div>
                    </div>

                    {selectedWord && (
                        <>
                        <br />
                        <p style={{color: '#333', fontWeight: '600', fontSize: '1rem'}}>Word Definition:</p>
                        <div 
                            id="wordDefinition" 
                            style={{
                            marginTop: '10px', 
                            padding: '12px', 
                            background: 'rgba(118, 75, 162, 0.08)', 
                            borderRadius: '8px', 
                            fontStyle: 'normal', 
                            minHeight: '50px',
                            fontSize: '0.9rem',
                            color: '#444',
                            border: '1px solid rgba(118, 75, 162, 0.2)',
                            whiteSpace: 'pre-line', // Preserve line breaks
                            fontFamily: 'inherit'
                            }}
                        >
                            {isLoadingDefinition ? (
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                <div className="spinner" style={{width: '16px', height: '16px'}}></div>
                                Loading definition...
                            </div>
                            ) : (
                            wordDefinition
                            )}
                        </div>
                        </>
                    )}
                    {selectedText!=="Select text from the book to see it here" && selectedText.split(/\s+/).length > 1 && (
                        <>
                        <br />
                        <p style={{color: '#333', fontWeight: '600', fontSize: '1rem'}}>Text Explanation:</p>
                        <div 
                            id="textExplanation" 
                            style={{
                            marginTop: '10px', 
                            padding: '12px', 
                            background: 'rgba(46, 125, 50, 0.08)', 
                            borderRadius: '8px', 
                            fontStyle: 'normal', 
                            minHeight: '50px',
                            fontSize: '0.9rem',
                            color: '#444',
                            border: '1px solid rgba(46, 125, 50, 0.2)',
                            whiteSpace: 'pre-line',
                            fontFamily: 'inherit',
                            lineHeight: '1.5'
                            }}
                        >
                            {isLoadingExplanation ? (
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                <div className="spinner" style={{width: '16px', height: '16px'}}></div>
                                Loading explanation...
                            </div>
                            ) : (
                            textExplanation
                            )}
                        </div>
                        </>
                    )}
                </div>
                )}
                {activeTab === 'chat' && (
                    <div className="chat-content">
                        <div className="chat-messages">
                            {chatMessages.length === 0 ? (
                                <div className="chat-welcome">
                                <p>👋 Hi! I'm Sophia, your reading assistant.</p>
                                <p>Ask me questions about the book you're reading!</p>
                                </div>
                            ) : (
                                chatMessages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`chat-message ${
                                    message.type === 'user' ? 'user-message' : 'bot-message'
                                    }`}
                                >
                                    <div className="message-content">{message.content}</div>
                                    <div className="message-timestamp">
                                    {message.timestamp.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                    </div>
                                </div>
                                ))
                            )}
                            {isLoadingChat && (
                                <div className="chat-message bot-message">
                                <div className="message-content">
                                    <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                    }}
                                    >
                                    <div
                                        className="spinner"
                                        style={{ width: '16px', height: '16px' }}
                                    ></div>
                                    Thinking...
                                    </div>
                                </div>
                                </div>
                            )}
                        </div>
                        <div className="chat-input-container">
                            <textarea
                                className="chat-input"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Ask me anything..."
                                rows="2"
                            />
                            <button
                                className="chat-send-btn"
                                onClick={sendChatMessage}
                                disabled={!chatInput.trim() || isLoadingChat}
                            >
                                Send
                            </button>
                            <button className="clear-chat-btn" onClick={clearChat}>
                                Clear
                            </button>
                        </div>
                    </div>
                    )}
            </div>
            </div>
            
    );
}

export default SlidingPanel;