import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Library from './components/Library';
import { initDb, addBookToDb, getBooksFromDb, getBookContentFromDb, deleteBookFromDb } from './db/indexedDB.js';
const JSZip = window.JSZip;

function App() {
  const [currentBook, setCurrentBook] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [bookContent, setBookContent] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [tableOfContents, setTableOfContents] = useState([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [bookTitle, setBookTitle] = useState('Select a book to start reading');
  const [bookInfo, setBookInfo] = useState('No book loaded');
  const [selectedText, setSelectedText] = useState('Select text from the book to see it here');
  const [showUploadOverlay, setShowUploadOverlay] = useState(true);
  const [showReader, setShowReader] = useState(false);
  const [showPlusBtn, setShowPlusBtn] = useState(false);
  const [showPanelToggle, setShowPanelToggle] = useState(false);
  const [showTocToggle, setShowTocToggle] = useState(false);
  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [books, setBooks] = useState([]);
  const [view, setView] = useState('library'); // 'library' or 'reader'
  
  const fileInputRef = useRef(null);

  const extractBookTitle = async (zip, opfPath) => {
    try {
      const opfContent = await zip.files[opfPath].async('text');
      const parser = new DOMParser();
      const opfDoc = parser.parseFromString(opfContent, 'application/xml');
      
      // Try different metadata selectors
      const titleElement = 
        opfDoc.querySelector('metadata dc\\:title') || 
        opfDoc.querySelector('metadata title') ||
        opfDoc.querySelector('dc\\:title') || 
        opfDoc.querySelector('title');
  
      return titleElement ? titleElement.textContent.trim() : null;
    } catch (error) {
      console.error('Error extracting title:', error);
      return null;
    }
  };

  // Enhanced EPUB parsing function
  const parseEpubContent = async (zip) => {
    let opfPath = '';
    let chapters = [];
    let toc = [];

    // Find the OPF file (content.opf or similar)
    for (const filename in zip.files) {
      if (filename.endsWith('.opf')) {
        opfPath = filename;
        break;
      }
    }

    if (opfPath) {
      try {
        const title = await extractBookTitle(zip, opfPath);
        setBookTitle(title || 'Untitled Book');
        const opfContent = await zip.files[opfPath].async('text');
        const parser = new DOMParser();
        const opfDoc = parser.parseFromString(opfContent, 'text/xml');
        
        // Extract spine order
        const spineItems = opfDoc.querySelectorAll('spine itemref');
        const manifestItems = opfDoc.querySelectorAll('manifest item');
        
        // Create manifest map
        const manifestMap = {};
        manifestItems.forEach(item => {
          manifestMap[item.getAttribute('id')] = item.getAttribute('href');
        });

        // Extract NCX file for TOC
        let ncxPath = '';
        manifestItems.forEach(item => {
          if (item.getAttribute('media-type') === 'application/x-dtbncx+xml') {
            ncxPath = item.getAttribute('href');
          }
        });

        // Parse NCX for table of contents
        if (ncxPath) {
          const basePath = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
          const fullNcxPath = basePath + ncxPath;
          
          if (zip.files[fullNcxPath]) {
            const ncxContent = await zip.files[fullNcxPath].async('text');
            const ncxDoc = parser.parseFromString(ncxContent, 'text/xml');
            const navPoints = ncxDoc.querySelectorAll('navPoint');
            
            navPoints.forEach((navPoint, index) => {
              const navLabel = navPoint.querySelector('navLabel text');
              const content = navPoint.querySelector('content');
              if (navLabel && content) {
                const title = navLabel.textContent.trim();
                const src = content.getAttribute('src').split('#')[0]; // Remove fragment identifier
                toc.push({
                  id: index,
                  title: title,
                  href: src,
                  pageIndex: -1 // Will be set later
                });
              }
            });
          }
        }

        // Process spine items to extract chapter content
        const basePath = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
        
        for (let i = 0; i < spineItems.length; i++) {
          const itemref = spineItems[i];
          const idref = itemref.getAttribute('idref');
          const href = manifestMap[idref];
          
          if (href) {
            const fullPath = basePath + href;
            if (zip.files[fullPath]) {
              const content = await zip.files[fullPath].async('text');
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = content;
              
              // Extract title from h1, h2, or title tags
              let chapterTitle = `Chapter ${i + 1}`;
              const titleElements = tempDiv.querySelectorAll('h1, h2, h3, title');
              if (titleElements.length > 0) {
                chapterTitle = titleElements[0].textContent.trim() || chapterTitle;
              }

              const textContent = tempDiv.textContent || tempDiv.innerText || '';
              if (textContent.trim()) {
                chapters.push({
                  id: i,
                  title: chapterTitle,
                  content: textContent.trim(),
                  href: href
                });
              }
            }
          }
        }
      } catch (error) {
        console.warn('Error parsing EPUB structure:', error);
      }
    }

    // Fallback: extract content from HTML/XHTML files if no proper structure found
    if (chapters.length === 0) {
      let chapterIndex = 0;
      for (const filename in zip.files) {
        if (filename.endsWith('.html') || filename.endsWith('.xhtml')) {
          const content = await zip.files[filename].async('text');
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = content;
          
          let chapterTitle = `Chapter ${chapterIndex + 1}`;
          const titleElements = tempDiv.querySelectorAll('h1, h2, h3, title');
          if (titleElements.length > 0) {
            chapterTitle = titleElements[0].textContent.trim() || chapterTitle;
          }

          const textContent = tempDiv.textContent || tempDiv.innerText || '';
          if (textContent.trim()) {
            chapters.push({
              id: chapterIndex,
              title: chapterTitle,
              content: textContent.trim(),
              href: filename
            });
            chapterIndex++;
          }
        }
      }
    }

    return { chapters, toc };
  };

  // File handling
  const handleFile = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith('.epub')) {
      alert('Please select a valid EPUB file');
      return;
    }

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      const bookTitleText = file.name.replace('.epub', '');
      setBookTitle(bookTitleText);
      
      // Parse EPUB content and structure
      const { chapters: parsedChapters, toc: parsedToc } = await parseEpubContent(contents);
      
      // Create pages from chapters
      const wordsPerPage = 300;
      const newBookContent = [];
      const chapterPages = [];
      let currentPageIndex = 0;

      parsedChapters.forEach((chapter, chapterIndex) => {
        // Mark the start page for this chapter
        const chapterStartPage = currentPageIndex;
        
        // Add chapter heading as first page of chapter
        const chapterHeader = `\n\n--- ${chapter.title} ---\n\n`;
        
        // Split chapter content into words
        const chapterWords = chapter.content.split(' ');
        const chapterWordChunks = [];
        
        // First page gets the chapter header plus some content
        const firstPageWords = chapterWords.slice(0, wordsPerPage - 20); // Reserve space for header
        chapterWordChunks.push(chapterHeader + firstPageWords.join(' '));
        
        // Remaining content
        for (let i = wordsPerPage - 20; i < chapterWords.length; i += wordsPerPage) {
          chapterWordChunks.push(chapterWords.slice(i, i + wordsPerPage).join(' '));
        }

        // Add chapter pages to book content
        chapterWordChunks.forEach(chunk => {
          newBookContent.push(chunk);
          currentPageIndex++;
        });

        // Update TOC with page numbers
        if (parsedToc.length > 0) {
          const tocItem = parsedToc.find(item => item.href === chapter.href);
          if (tocItem) {
            tocItem.pageIndex = chapterStartPage;
          }
        }

        chapterPages.push({
          ...chapter,
          startPage: chapterStartPage,
          endPage: currentPageIndex - 1
        });
      });

      // If no TOC was found in the EPUB, create one from chapters
      let finalToc = parsedToc;
      if (finalToc.length === 0) {
        finalToc = chapterPages.map(chapter => ({
          id: chapter.id,
          title: chapter.title,
          href: chapter.href,
          pageIndex: chapter.startPage
        }));
      }

      if (newBookContent.length === 0) {
        newBookContent.push('Content could not be extracted from this EPUB file.');
      }

      setBookContent(newBookContent);
      setChapters(chapterPages);
      setTableOfContents(finalToc);
      setCurrentPageIndex(0);
      
      // Hide upload overlay and show reader
      setShowUploadOverlay(false);
      setShowReader(true);
      setShowPlusBtn(true);
      setShowPanelToggle(true);
      setShowTocToggle(true);

      // Update book info in panel
      setBookInfo(`
        Title: ${bookTitleText}
        Chapters: ${chapterPages.length}
        Pages: ${Math.ceil(newBookContent.length / 2)}
        File Size: ${(file.size / 1024).toFixed(1)} KB
      `);

    } catch (error) {
      alert('Error reading EPUB file: ' + error.message);
    }
  };

  const updateNavigation = () => {
    const currentPageNum = Math.floor(currentPageIndex / 2) + 1;
    const totalPages = Math.ceil(bookContent.length / 2);
    return { currentPageNum, totalPages };
  };

  const nextPage = () => {
    if (currentPageIndex < bookContent.length - 2) {
      setCurrentPageIndex(currentPageIndex + 2);
    }
  };

  const previousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 2);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowRight') {
        nextPage();
      } else if (event.key === 'ArrowLeft') {
        previousPage();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPageIndex, bookContent]);

  // Panel functionality
  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  // TOC functionality
  const toggleToc = () => {
    setIsTocOpen(!isTocOpen);
  };

  const jumpToChapter = (pageIndex) => {
    setCurrentPageIndex(pageIndex);
    setIsTocOpen(false); // Close TOC after selection
  };

  useEffect(() => {
    initDb()
      .then(() => {
        setIsLoadingDb(false);
        console.log("IndexedDB initialized successfully.");
      })
      .catch((err) => {
        setDbError(err.message);
        setIsLoadingDb(false);
      });
  }, []);

  // Text selection handling
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const selectedTextContent = selection.toString().trim();
      
      if (selectedTextContent) {
        setSelectedText(selectedTextContent);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Close panels when clicking outside
  useEffect(() => {
    const handleClick = (event) => {
      const panel = document.getElementById('slidingPanel');
      const toggle = document.getElementById('panelToggle');
      const tocPanel = document.getElementById('tocPanel');
      const tocToggle = document.getElementById('tocToggle');
      
      if (isPanelOpen && panel && toggle && !panel.contains(event.target) && !toggle.contains(event.target)) {
        togglePanel();
      }
      
      if (isTocOpen && tocPanel && tocToggle && !tocPanel.contains(event.target) && !tocToggle.contains(event.target)) {
        toggleToc();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isPanelOpen, isTocOpen]);

  const handleChooseFile = () => {
    fileInputRef.current.click();
  };

  const handleBookSelect = async (book) => {
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(book.fileData);
      const { chapters, toc } = await parseEpubContent(contents);
      
      setCurrentBook(book);
      setBookContent(chapters.map(ch => ch.content));
      setChapters(chapters);
      setTableOfContents(toc);
      setBookTitle(book.title);
      setView('reader');
      setShowReader(true);
    } catch (error) {
      console.error('Error loading book:', error);
      alert('Failed to load book. Please try again.');
    }
  };

  // Handle new book upload
  const handleNewBookUpload = (book) => {
    handleBookSelect(book);
  };

  // Handle back to library
  const handleBackToLibrary = () => {
    setView('library');
    setShowReader(false);
    setShowPlusBtn(false);
    setShowPanelToggle(false);
    setShowTocToggle(false);
  };

  const { currentPageNum, totalPages } = updateNavigation();

  return (
    <div className="app-container">
      <header className="app-header">
        <button 
          className="back-button" 
          onClick={handleBackToLibrary}
          style={{visibility: view === 'reader' ? 'visible' : 'hidden'}}
        >
          ←
        </button>
        <h1 className="app-name">Sophia</h1>
      </header>
      {view === 'library' ? (
        <Library 
          onBookSelect={handleBookSelect}
          onNewBookUpload={handleNewBookUpload}
        />
      ) : (
      <div className={`reader-container ${showReader ? 'visible' : ''}`} id="readerContainer">
        <div className="reader-header">
          <h1 className="book-title" id="bookTitle">{bookTitle}</h1>
        </div>
        <div className="pages-container">
          <div className="page" id="leftPage">
            {bookContent.length > 0 ? (
              bookContent[currentPageIndex] || ''
            ) : (
              <div className="loading">
                <div className="spinner"></div>
                Upload an EPUB file to begin reading
              </div>
            )}
          </div>
          <div className="page" id="rightPage">
            {bookContent.length > 0 ? (
              bookContent[currentPageIndex + 1] || ''
            ) : (
              <div className="loading">
                <div className="spinner"></div>
                Your book content will appear here
              </div>
            )}
          </div>
        </div>
        <div className="reader-footer">
          <button 
            className="nav-btn" 
            id="prevBtn" 
            onClick={previousPage} 
            disabled={currentPageIndex <= 0}
          >
            ‹
          </button>
          <span className="page-info" id="pageInfo">Page {currentPageNum} of {totalPages}</span>
          <button 
            className="nav-btn" 
            id="nextBtn" 
            onClick={nextPage} 
            disabled={currentPageIndex >= bookContent.length - 2}
          >
            ›
          </button>
        </div>
      </div>
      )}

      {/* Plus Button */}
      <button 
        className={`plus-btn ${showPlusBtn ? 'visible' : ''}`} 
        id="plusBtn" 
        onClick={handleChooseFile}
      >
        +
      </button>

      {/* TOC Toggle Button */}
      <button 
        className={`toc-toggle ${showTocToggle ? 'visible' : ''} ${isTocOpen ? 'toc-open' : ''}`} 
        id="tocToggle" 
        onClick={toggleToc}
      >
        📖
      </button>

      {/* TOC Panel */}
      <div className={`toc-panel ${isTocOpen ? 'open' : ''}`} id="tocPanel">
        <div className="panel-header">Table of Contents</div>
        <div className="toc-content">
          {tableOfContents.length > 0 ? (
            tableOfContents.map((item, index) => (
              <div 
                key={index} 
                className="toc-item"
                onClick={() => jumpToChapter(item.pageIndex)}
              >
                <div className="toc-title">{item.title}</div>
                <div className="toc-page">Page {Math.floor(item.pageIndex / 2) + 1}</div>
              </div>
            ))
          ) : (
            <div className="toc-empty">No table of contents available</div>
          )}
        </div>
      </div>

      {/* Panel Toggle Button */}
      <button 
        className={`panel-toggle ${showPanelToggle ? 'visible' : ''} ${isPanelOpen ? 'panel-open' : ''}`} 
        id="panelToggle" 
        onClick={togglePanel}
      >
        ☰
      </button>

      {/* Sliding Panel */}
      <div className={`sliding-panel ${isPanelOpen ? 'open' : ''}`} id="slidingPanel">
        <div className="panel-header">Reading Panel</div>
        <div>
          <p>Book Information:</p>
          <div id="bookInfo" style={{marginTop: '10px', color: '#666'}}>
            {bookInfo.split('\n').map((line, index) => (
              <React.Fragment key={index}>
                {line.includes(':') ? (
                  <>
                    <strong>{line.split(':')[0]}:</strong> {line.split(':')[1]}
                  </>
                ) : (
                  line
                )}
                {index < bookInfo.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
          <br />
          <p>Selected Text:</p>
          <div 
            id="selectedText" 
            style={{
              marginTop: '10px', 
              padding: '10px', 
              background: 'rgba(102, 126, 234, 0.1)', 
              borderRadius: '8px', 
              fontStyle: 'italic', 
              minHeight: '40px'
            }}
          >
            {selectedText}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;