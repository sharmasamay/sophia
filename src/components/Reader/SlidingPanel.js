import React from 'react';

function SlidingPanel({isOpen,bookInfo,selectedText,selectedWord,wordDefinition,isLoadingDefinition, textExplanation,isLoadingExplanation}){
    return(
        <div className={`sliding-panel ${isOpen ? 'open' : ''}`} id="slidingPanel">
                <div className="panel-header">Reading Panel</div>
                <div>
                <p style={{color: '#333', fontWeight: '600', fontSize: '1rem'}}>Book Information:</p>
                <div 
                    id="bookInfo" 
                    style={{
                    marginTop: '10px', 
                    color: '#555',
                    background: 'rgba(102, 126, 234, 0.05)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(102, 126, 234, 0.1)'
                    }}
                >
                    {bookInfo.split('\n').map((line, index) => (
                    <React.Fragment key={index}>
                        {line.includes(':') ? (
                        <>
                            <strong style={{color: '#667eea'}}>{line.split(':')[0]}:</strong> 
                            <span style={{color: '#333'}}>{line.split(':')[1]}</span>
                        </>
                        ) : (
                        <span style={{color: '#333'}}>{line}</span>
                        )}
                        {index < bookInfo.split('\n').length - 1 && <br />}
                    </React.Fragment>
                    ))}
                </div>
                <br />
                <p style={{color: '#333', fontWeight: '600', fontSize: '1rem'}}>Selected Text:</p>
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
                {selectedText && selectedText.split(/\s+/).length > 1 && (
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
            </div>
    );
}

export default SlidingPanel;