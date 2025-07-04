import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Library from './components/Library';
import { initDb, addBookToDb, getBooksFromDb, getBookContentFromDb, deleteBookFromDb, updateBookProgress } from './db/indexedDB.js'; // Import the new function
const JSZip = window.JSZip;

function App() {
  const [currentBook, setCurrentBook] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [bookContent, setBookContent] = useState([]);
  const [bookContentChunks, setBookContentChunks] = useState([]); // New state for chunk storage
  const [chapters, setChapters] = useState([]);
  const [tableOfContents, setTableOfContents] = useState([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [bookTitle, setBookTitle] = useState('Select a book to start reading');
  const [bookInfo, setBookInfo] = useState('No book loaded');
  const [selectedText, setSelectedText] = useState('Select text from the book to see it here');
  const [selectedWord, setSelectedWord] = useState('');
  const [wordDefinition, setWordDefinition] = useState('Select a single word to see its definition');
  const [textExplanation, setTextExplanation] = useState('Select multiple words to see an explanation');
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [showUploadOverlay, setShowUploadOverlay] = useState(true);
  const [showReader, setShowReader] = useState(false);
  const [showPanelToggle, setShowPanelToggle] = useState(false);
  const [showTocToggle, setShowTocToggle] = useState(false);
  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [books, setBooks] = useState([]);
  const [view, setView] = useState('library'); // 'library' or 'reader'
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [selectedFont, setSelectedFont] = useState('Georgia'); // Add font state
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false); // Add dropdown state
  const [selectedTheme, setSelectedTheme] = useState('classic'); // Add theme state
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false); // Add theme dropdown state
  const [fontSize, setFontSize] = useState(16); // Add font size state
  const [isFontSizeDropdownOpen, setIsFontSizeDropdownOpen] = useState(false); // Add font size dropdown state

  const fileInputRef = useRef(null);

  const [isMobile, setIsMobile] = useState(false);

  // Available fonts for selection
  const availableFonts = [
    { name: 'Georgia', family: 'Georgia, serif' },
    { name: 'Times New Roman', family: '"Times New Roman", serif' },
    { name: 'Garamond', family: 'Garamond, serif' },
    { name: 'Palatino', family: 'Palatino, serif' },
    { name: 'Book Antiqua', family: '"Book Antiqua", serif' },
    { name: 'Crimson Text', family: '"Crimson Text", serif' },
    { name: 'Libre Baskerville', family: '"Libre Baskerville", serif' },
    { name: 'Source Serif Pro', family: '"Source Serif Pro", serif' },
    { name: 'Open Sans', family: '"Open Sans", sans-serif' },
    { name: 'Lato', family: 'Lato, sans-serif' },
    { name: 'Roboto', family: 'Roboto, sans-serif' },
    { name: 'Nunito', family: 'Nunito, sans-serif' },
    { name: 'Inter', family: 'Inter, sans-serif' },
    { name: 'Merriweather', family: 'Merriweather, serif' },
    { name: 'Playfair Display', family: '"Playfair Display", serif' },
    { name: 'Lora', family: 'Lora, serif' }
  ];

  // Available font sizes for selection
  const availableFontSizes = [
    { size: 12, label: 'Extra Small' },
    { size: 14, label: 'Small' },
    { size: 16, label: 'Medium' },
    { size: 18, label: 'Large' },
    { size: 20, label: 'Extra Large' },
    { size: 22, label: 'Huge' },
    { size: 24, label: 'Extra Huge' }
  ];

  // Available themes for selection
  const availableThemes = [
    { 
      id: 'classic', 
      name: 'Classic', 
      background: '#ffffff',
      text: '#333333',
      icon: '📖'
    },
    { 
      id: 'sepia', 
      name: 'Sepia', 
      background: '#f4f1ea',
      text: '#5c4b37',
      icon: '📜'
    },
    { 
      id: 'dark', 
      name: 'Dark', 
      background: '#1a1a1a',
      text: '#e8e8e8',
      icon: '🌙'
    },
    { 
      id: 'midnight', 
      name: 'Midnight', 
      background: '#0f0f23',
      text: '#cccccc',
      icon: '🌃'
    },
    { 
      id: 'forest', 
      name: 'Forest', 
      background: '#1a2f1a',
      text: '#c8e6c9',
      icon: '🌲'
    },
    { 
      id: 'ocean', 
      name: 'Ocean', 
      background: '#0d1b2a',
      text: '#b3d9ff',
      icon: '🌊'
    },
    { 
      id: 'warm', 
      name: 'Warm', 
      background: '#2d1b2e',
      text: '#f0e68c',
      icon: '🔥'
    },
    { 
      id: 'paper', 
      name: 'Paper', 
      background: '#f7f3e9',
      text: '#2c2c2c',
      icon: '📄'
    },
    { 
      id: 'contrast', 
      name: 'High Contrast', 
      background: '#000000',
      text: '#ffffff',
      icon: '⚫'
    }
  ];

  const handleFontChange = (font) => {
    setSelectedFont(font.name);
    setIsFontDropdownOpen(false);
  };

  const toggleFontDropdown = () => {
    setIsFontDropdownOpen(!isFontDropdownOpen);
  };

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    setIsFontSizeDropdownOpen(false);
  };

  const toggleFontSizeDropdown = () => {
    setIsFontSizeDropdownOpen(!isFontSizeDropdownOpen);
  };

  const handleThemeChange = (theme) => {
    setSelectedTheme(theme.id);
    setIsThemeDropdownOpen(false);
  };

  const toggleThemeDropdown = () => {
    setIsThemeDropdownOpen(!isThemeDropdownOpen);
  };

  const getCurrentTheme = () => {
    return availableThemes.find(theme => theme.id === selectedTheme) || availableThemes[0];
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = (event) => {
      const fontDropdown = document.getElementById('fontDropdown');
      const fontToggle = document.getElementById('fontToggle');
      const themeDropdown = document.getElementById('themeDropdown');
      const themeToggle = document.getElementById('themeToggle');
      const fontSizeDropdown = document.getElementById('fontSizeDropdown');
      const fontSizeToggle = document.getElementById('fontSizeToggle');
      
      if (isFontDropdownOpen && fontDropdown && fontToggle && 
          !fontDropdown.contains(event.target) && !fontToggle.contains(event.target)) {
        setIsFontDropdownOpen(false);
      }

      if (isThemeDropdownOpen && themeDropdown && themeToggle && 
          !themeDropdown.contains(event.target) && !themeToggle.contains(event.target)) {
        setIsThemeDropdownOpen(false);
      }

      if (isFontSizeDropdownOpen && fontSizeDropdown && fontSizeToggle && 
          !fontSizeDropdown.contains(event.target) && !fontSizeToggle.contains(event.target)) {
        setIsFontSizeDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isFontDropdownOpen, isThemeDropdownOpen, isFontSizeDropdownOpen]);

  // Get the current font family
  const getCurrentFontFamily = () => {
    const font = availableFonts.find(f => f.name === selectedFont);
    return font ? font.family : 'Georgia, serif';
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const saveLastReadPage = async (bookId, pageIndex, totalPages) => {
    try {
      await updateBookProgress(bookId, pageIndex, totalPages); // Save progress in IndexedDB
    } catch (error) {
      console.error('Error saving last read page:', error);
    }
  };

  const getLastReadPage = async (bookId) => {
    try {
      const books = await getBooksFromDb();
      const book = books.find(b => b.id === bookId);
      return book ? book.lastReadPage || 0 : 0; // Default to page 0 if not found
    } catch (error) {
      console.error('Error retrieving last read page:', error);
      return 0;
    }
  };

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

              // Replace image references with base64 data
              const images = tempDiv.querySelectorAll('img');
              for (const img of images) {
                const src = img.getAttribute('src');
                const imagePath = basePath + src;
                if (zip.files[imagePath]) {
                  const imageData = await zip.files[imagePath].async('base64');
                  img.setAttribute('src', `data:image/*;base64,${imageData}`);
                }
              }

              chapters.push({
                id: i,
                title: `Chapter ${i + 1}`,
                content: tempDiv.innerHTML.trim(), // Preserve original HTML with images
                href: href
              });
            }
          }
        }
      } catch (error) {
        console.warn('Error parsing EPUB structure:', error);
      }
    }

    const wordsPerPage = 300; // Words per page for current display method
    const chunkSize = 1000; // Words per chunk for storage
    const newBookContent = [];
    const newBookContentChunks = []; // New chunks array
    const chapterPages = [];
    let currentPageIndex = 0;

    chapters.forEach((chapter, chapterIndex) => {
      const chapterWords = chapter.content.split(/\s+/); // Split content into words
      let pageContent = '';
      let chunkContent = '';
      let chunkWordCount = 0;

      for (let i = 0; i < chapterWords.length; i++) {
        const word = chapterWords[i];
        pageContent += `${word} `;
        chunkContent += `${word} `;
        chunkWordCount++;

        // Create page chunks for current display method
        if ((i + 1) % wordsPerPage === 0 || i === chapterWords.length - 1) {
          newBookContent.push(pageContent.trim());
          pageContent = '';
          currentPageIndex++;
        }

        // Create storage chunks
        if (chunkWordCount >= chunkSize || i === chapterWords.length - 1) {
          newBookContentChunks.push({
            id: newBookContentChunks.length,
            chapterIndex: chapterIndex,
            content: chunkContent.trim(),
            wordCount: chunkWordCount,
            startWordIndex: i - chunkWordCount + 1,
            endWordIndex: i
          });
          chunkContent = '';
          chunkWordCount = 0;
        }
      }

      chapterPages.push({
        ...chapter,
        startPage: currentPageIndex - Math.ceil(chapterWords.length / wordsPerPage),
        endPage: currentPageIndex - 1,
        totalWords: chapterWords.length
      });
    });

    return { 
      chapters: chapterPages, 
      toc, 
      bookContent: newBookContent,
      bookContentChunks: newBookContentChunks 
    };
  };

  const getCurrentChapterTitle = () => {
    const currentChapter = chapters.find(
      (chapter) =>
        currentPageIndex >= chapter.startPage && currentPageIndex <= chapter.endPage
    );

    if (currentChapter) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = currentChapter.content;

      // Look for headings (h1, h2, h3, etc.) in the current chapter's content
      const heading = tempDiv.querySelector('h1, h2, h3, h4, h5, h6');
      const rawTitle = heading ? heading.textContent.trim() : currentChapter.title;

      // Ensure proper formatting by adding a space between concatenated elements
      return rawTitle.replace(/([a-z])([A-Z])/g, '$1 $2');
    }

    return 'Unknown Chapter';
  };

  const getLeftPageChapterTitle = () => {
    const currentChapter = chapters.find(
      (chapter) =>
        currentPageIndex >= chapter.startPage && currentPageIndex <= chapter.endPage
    );
    return currentChapter ? currentChapter.title : 'Unknown Chapter';
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
      const { chapters: parsedChapters, toc: parsedToc, bookContent: newBookContent, bookContentChunks: newBookContentChunks } = await parseEpubContent(contents);
      
      setBookContent(newBookContent);
      setBookContentChunks(newBookContentChunks); // Set the chunks
      setChapters(parsedChapters);
      setTableOfContents(parsedToc);
      setCurrentPageIndex(0);
      
      // Hide upload overlay and show reader
      setShowUploadOverlay(false);
      setShowReader(true);
      setShowPanelToggle(true);
      setShowTocToggle(true);

      // Update book info in panel
      setBookInfo(`
        Title: ${bookTitleText}
        Chapters: ${parsedChapters.length}
        Pages: ${Math.ceil(newBookContent.length / 2)}
        Total Chunks: ${newBookContentChunks.length}
        File Size: ${(file.size / 1024).toFixed(1)} KB
      `);

    } catch (error) {
      alert('Error reading EPUB file: ' + error.message);
    }
  };

  const updateNavigation = () => {
    if (isMobile) {
      // Mobile: single page navigation
      const currentPageNum = currentPageIndex + 1;
      const totalPages = bookContent.length;
      return { currentPageNum, totalPages };
    } else {
      // Desktop: two-page spread navigation
      const currentPageNum = Math.floor(currentPageIndex / 2) + 1;
      const totalPages = Math.ceil(bookContent.length / 2);
      return { currentPageNum, totalPages };
    }
  };

  const nextPage = () => {
    if (isMobile) {
      // Mobile: advance by 1 page
      if (currentPageIndex < bookContent.length - 1) {
        const newPageIndex = currentPageIndex + 1;
        setCurrentPageIndex(newPageIndex);
        if (currentBook?.id) {
          saveLastReadPage(currentBook.id, newPageIndex, bookContent.length);
        }
      }
    } else {
      // Desktop: advance by 2 pages
      if (currentPageIndex < bookContent.length - 2) {
        const newPageIndex = currentPageIndex + 2;
        setCurrentPageIndex(newPageIndex);
        if (currentBook?.id) {
          saveLastReadPage(currentBook.id, newPageIndex, Math.ceil(bookContent.length / 2));
        }
      }
    }
  };

  const previousPage = () => {
    if (isMobile) {
      // Mobile: go back by 1 page
      if (currentPageIndex > 0) {
        const newPageIndex = currentPageIndex - 1;
        setCurrentPageIndex(newPageIndex);
        if (currentBook?.id) {
          saveLastReadPage(currentBook.id, newPageIndex, bookContent.length);
        }
      }
    } else {
      // Desktop: go back by 2 pages
      if (currentPageIndex > 0) {
        const newPageIndex = currentPageIndex - 2;
        setCurrentPageIndex(newPageIndex);
        if (currentBook?.id) {
          saveLastReadPage(currentBook.id, newPageIndex, Math.ceil(bookContent.length / 2));
        }
      }
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

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsLoadingChat(true);

    try {
      // Extract content chunks for context
      const contentChunks = bookContentChunks.map(chunk => chunk.content);
      
      const response = await fetch('http://localhost:5000/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selected_text: chatInput,
          book_title: bookTitle,
          book_chunks: contentChunks
        })
      });
      
      const data = await response.json();
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: data.error ? `Error: ${data.error}` : (data.explanation || 'No response available.'),
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error in chat:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Error connecting to chat service. Make sure the server is running.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleChatKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendChatMessage();
    }
  };

  const clearChat = () => {
    setChatMessages([]);
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

  // Function to fetch word definition from Flask API
  const fetchWordDefinition = async (word) => {
    setIsLoadingDefinition(true);
    try {
      const response = await fetch(`http://localhost:5001/api/definition?word=${encodeURIComponent(word)}`);
      const data = await response.json();
      
      if (data.error) {
        return `Word "${word}" not found in dictionary.`;
      }
      
      // Format the definition response
      let formattedDefinition = `**${data.word}**\n\n`;
      
      data.meanings.forEach((meaning, index) => {
        formattedDefinition += `**${meaning.partOfSpeech}:**\n`;
        meaning.definitions.forEach((def, defIndex) => {
          formattedDefinition += `${defIndex + 1}. ${def.definition}\n`;
          if (def.example) {
            formattedDefinition += `   Example: "${def.example}"\n`;
          }
        });
        if (index < data.meanings.length - 1) {
          formattedDefinition += '\n';
        }
      });
      
      return formattedDefinition;
    } catch (error) {
      console.error('Error fetching definition:', error);
      return `Error fetching definition for "${word}". Make sure the dictionary server is running on port 5001.`;
    } finally {
      setIsLoadingDefinition(false);
    }
  };

  // Function to fetch text explanation from Flask API
  const fetchTextExplanation = async (selectedText) => {
    setIsLoadingExplanation(true);
    try {
      // Extract content chunks for context
      const contentChunks = bookContentChunks.map(chunk => chunk.content);
      
      const response = await fetch('http://localhost:5000/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selected_text: selectedText,
          book_title: bookTitle,
          book_chunks: contentChunks
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        return `Error: ${data.error}`;
      }
      
      return data.explanation || 'No explanation available.';
    } catch (error) {
      console.error('Error fetching explanation:', error);
      return `Error fetching explanation. Make sure the Flask server is running on port 5000.`;
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  // Text selection handling
  useEffect(() => {
    const handleMouseUp = async () => {
      const selection = window.getSelection();
      const selectedTextContent = selection.toString().trim();
      
      if (selectedTextContent) {
        setSelectedText(selectedTextContent);
        
        // Check if it's a single word (no spaces)
        const words = selectedTextContent.split(/\s+/);
        if (words.length === 1 && words[0].length > 0) {
          // Single word - fetch definition
          const cleanWord = words[0].replace(/[^\w]/g, '').toLowerCase(); // Remove punctuation
          setSelectedWord(cleanWord);
          setWordDefinition('Loading definition...');
          setTextExplanation('Select multiple words to see an explanation'); // Reset explanation
          const definition = await fetchWordDefinition(cleanWord);
          setWordDefinition(definition);
          
          // Scroll to the word definition section if panel is open
          if (isPanelOpen) {
            setTimeout(() => {
              const wordDefElement = document.getElementById('wordDefinition');
              if (wordDefElement) {
                wordDefElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }, 100);
          }
        } else if (words.length > 1) {
          // Multiple words - fetch explanation
          setSelectedWord(''); // Reset single word state
          setWordDefinition('Select a single word to see its definition'); // Reset definition
          setTextExplanation('Loading explanation...');
          const explanation = await fetchTextExplanation(selectedTextContent);
          setTextExplanation(explanation);
          
          // Scroll to the text explanation section if panel is open
          if (isPanelOpen) {
            setTimeout(() => {
              const textExplElement = document.getElementById('textExplanation');
              if (textExplElement) {
                textExplElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }, 100);
          }
        } else {
          // Reset both states if no valid selection
          setSelectedWord('');
          setWordDefinition('Select a single word to see its definition');
          setTextExplanation('Select multiple words to see an explanation');
        }
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [bookContentChunks, bookTitle, isPanelOpen]); // Add isPanelOpen to dependencies

  // Close panels when clicking outside
  useEffect(() => {
    const handleClick = (event) => {
      const panel = document.getElementById('slidingPanel');
      const toggle = document.getElementById('panelToggle');
      const tocPanel = document.getElementById('tocPanel');
      const tocToggle = document.getElementById('tocToggle');
      const chatPanel = document.getElementById('chatPanel');
      const chatToggle = document.getElementById('chatToggle');
      
      if (isPanelOpen && panel && toggle && !panel.contains(event.target) && !toggle.contains(event.target)) {
        togglePanel();
      }
      
      if (isTocOpen && tocPanel && tocToggle && !tocPanel.contains(event.target) && !tocToggle.contains(event.target)) {
        toggleToc();
      }

      if (isChatOpen && chatPanel && chatToggle && !chatPanel.contains(event.target) && !chatToggle.contains(event.target)) {
        toggleChat();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isPanelOpen, isTocOpen, isChatOpen]); // Add isChatOpen to dependencies

  const handleChooseFile = () => {
    fileInputRef.current.click();
  };

  const handleBookSelect = async (book) => {
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(book.fileData);
      const { chapters, toc, bookContent, bookContentChunks } = await parseEpubContent(contents);

      const lastReadPage = await getLastReadPage(book.id); // Retrieve last read page

      setCurrentBook(book);
      setBookContent(bookContent);
      setBookContentChunks(book.contentChunks || bookContentChunks); // Use stored chunks if available
      setChapters(chapters);
      setTableOfContents(toc);
      setBookTitle(book.title);
      setCurrentPageIndex(lastReadPage); // Open at last read page
      setView('reader');
      setShowReader(true);
      setShowPanelToggle(true);
      setShowTocToggle(true); // Add this line to show the TOC toggle

      // Update book info to show stored chunk information
      setBookInfo(`
        Title: ${book.title}
        Author: ${book.author || 'Unknown Author'}
        Chapters: ${chapters.length}
        Total Chunks: ${book.contentChunks ? book.contentChunks.length : 0}
        File Size: ${(book.fileSize / 1024).toFixed(1)} KB
      `);
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
    setShowPanelToggle(false);
    setShowTocToggle(false);
  };

  const { currentPageNum, totalPages } = updateNavigation();

  return (
    <div className="app-container">
      {view === 'library' ? (
        <Library 
          onBookSelect={handleBookSelect}
          onNewBookUpload={handleNewBookUpload}
        />
      ) : (
      <div className={`reader-container ${showReader ? 'visible' : ''}`} id="readerContainer">
        <div className="reader-header">
          <div className="header-left">
            <button 
              className="back-button" 
              onClick={handleBackToLibrary}
            >
              ←
            </button>
            {showTocToggle && (
              <button 
                className={`toc-toggle-header ${isTocOpen ? 'toc-open' : ''}`} 
                id="tocToggle" 
                onClick={toggleToc}
              >
                📑
              </button>
            )}
          </div>
          <div className="header-center">
            <h1 className="book-title" id="bookTitle">{bookTitle}</h1>
            <p className="chapter-title" id="chapterTitle">{getCurrentChapterTitle()}</p>
          </div>
          <div className="header-right">
            <div className="font-selector">
              <button 
                className="font-toggle"
                id="fontToggle"
                onClick={toggleFontDropdown}
              >
                Aa
              </button>
              {isFontDropdownOpen && (
                <div className="font-dropdown" id="fontDropdown">
                  <div className="font-dropdown-header">Choose Font</div>
                  {availableFonts.map((font) => (
                    <div
                      key={font.name}
                      className={`font-option ${selectedFont === font.name ? 'selected' : ''}`}
                      style={{ fontFamily: font.family }}
                      onClick={() => handleFontChange(font)}
                    >
                      {font.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="font-size-selector">
              <button 
                className="font-size-toggle"
                id="fontSizeToggle"
                onClick={toggleFontSizeDropdown}
              >
                {fontSize}
              </button>
              {isFontSizeDropdownOpen && (
                <div className="font-size-dropdown" id="fontSizeDropdown">
                  <div className="font-size-dropdown-header">Font Size</div>
                  {availableFontSizes.map((fontSizeOption) => (
                    <div
                      key={fontSizeOption.size}
                      className={`font-size-option ${fontSize === fontSizeOption.size ? 'selected' : ''}`}
                      onClick={() => handleFontSizeChange(fontSizeOption.size)}
                    >
                      <span className="font-size-label">{fontSizeOption.label}</span>
                      <span className="font-size-value">{fontSizeOption.size}px</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="theme-selector">
              <button 
                className="theme-toggle"
                id="themeToggle"
                onClick={toggleThemeDropdown}
              >
                {getCurrentTheme().icon}
              </button>
              {isThemeDropdownOpen && (
                <div className="theme-dropdown" id="themeDropdown">
                  <div className="theme-dropdown-header">Choose Theme</div>
                  {availableThemes.map((theme) => (
                    <div
                      key={theme.id}
                      className={`theme-option ${selectedTheme === theme.id ? 'selected' : ''}`}
                      onClick={() => handleThemeChange(theme)}
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
          </div>
        </div>
        <div className="pages-container">
          <div 
            className="page" 
            id="leftPage"
            style={{ 
              fontFamily: getCurrentFontFamily(),
              backgroundColor: getCurrentTheme().background,
              color: getCurrentTheme().text,
              fontSize: `${fontSize}px`
            }}
          >
            {bookContent.length > 0 ? (
              <div dangerouslySetInnerHTML={{ __html: bookContent[currentPageIndex] || '' }} />
            ) : (
              <div className="loading">
                <div className="spinner"></div>
                Upload an EPUB file to begin reading
              </div>
            )}
          </div>
          {!isMobile && (
            <div 
              className="page" 
              id="rightPage"
              style={{ 
                fontFamily: getCurrentFontFamily(),
                backgroundColor: getCurrentTheme().background,
                color: getCurrentTheme().text,
                fontSize: `${fontSize}px`
              }}
            >
              {bookContent.length > 0 ? (
                <div dangerouslySetInnerHTML={{ __html: bookContent[currentPageIndex + 1] || '' }} />
              ) : (
                <div className="loading">
                  <div className="spinner"></div>
                  Your book content will appear here
                </div>
              )}
            </div>
          )}
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
            disabled={isMobile ? currentPageIndex >= bookContent.length - 1 : currentPageIndex >= bookContent.length - 2}
          >
            ›
          </button>
        </div>
      </div>
      )}

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

      {/* Chat Toggle Button */}
      <button 
        className={`chat-toggle ${showTocToggle ? 'visible' : ''} ${isChatOpen ? 'chat-open' : ''}`} 
        id="chatToggle" 
        onClick={toggleChat}
      >
        💬
      </button>

      {/* Chat Panel */}
      <div className={`chat-panel ${isChatOpen ? 'open' : ''}`} id="chatPanel">
        <div className="panel-header">
          Chat with Sophia
          <button className="clear-chat-btn" onClick={clearChat}>Clear</button>
        </div>
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
                  className={`chat-message ${message.type === 'user' ? 'user-message' : 'bot-message'}`}
                >
                  <div className="message-content">
                    {message.content}
                  </div>
                  <div className="message-timestamp">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
            {isLoadingChat && (
              <div className="chat-message bot-message">
                <div className="message-content">
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <div className="spinner" style={{width: '16px', height: '16px'}}></div>
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
              onKeyPress={handleChatKeyPress}
              placeholder="Ask me about the book..."
              rows="2"
            />
            <button 
              className="chat-send-btn" 
              onClick={sendChatMessage}
              disabled={!chatInput.trim() || isLoadingChat}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;