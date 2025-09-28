import React, { useState, useEffect, useRef } from 'react';
import { addBookToDb, getBooksFromDb, deleteBookFromDb } from '../db/indexedDB.js';
import './Library.css';

const JSZip = window.JSZip;

const Library = ({ onBookSelect, onNewBookUpload }) => {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadOverlay, setShowUploadOverlay] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // Track active menu
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const booksFromDb = await getBooksFromDb();
      setBooks(booksFromDb);
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractBookMetadata = async (zip) => {
    let opfPath = '';
    let metadata = {
      title: 'Untitled Book',
      author: 'Unknown Author',
      description: '',
      coverImage: null
    };

    // Find the OPF file
    for (const filename in zip.files) {
      if (filename.endsWith('.opf')) {
        opfPath = filename;
        break;
      }
    }

    if (opfPath) {
      try {
        const opfContent = await zip.files[opfPath].async('text');
        const parser = new DOMParser();
        const opfDoc = parser.parseFromString(opfContent, 'text/xml');
        
        // Extract title
        const titleElement = 
          opfDoc.querySelector('metadata dc\\:title') || 
          opfDoc.querySelector('metadata title') ||
          opfDoc.querySelector('dc\\:title') || 
          opfDoc.querySelector('title');
        
        if (titleElement) {
          metadata.title = titleElement.textContent.trim();
        }

        // Extract author
        const authorElement = 
          opfDoc.querySelector('metadata dc\\:creator') || 
          opfDoc.querySelector('metadata creator') ||
          opfDoc.querySelector('dc\\:creator') || 
          opfDoc.querySelector('creator');
        
        if (authorElement) {
          metadata.author = authorElement.textContent.trim();
        }

        // Extract description
        const descElement = 
          opfDoc.querySelector('metadata dc\\:description') || 
          opfDoc.querySelector('metadata description') ||
          opfDoc.querySelector('dc\\:description') || 
          opfDoc.querySelector('description');
        
        if (descElement) {
          metadata.description = descElement.textContent.trim();
        }

        // Try to find cover image
        const manifestItems = opfDoc.querySelectorAll('manifest item');
        const basePath = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
        
        for (const item of manifestItems) {
          const id = item.getAttribute('id');
          const href = item.getAttribute('href');
          const mediaType = item.getAttribute('media-type');
          
          if ((id && id.toLowerCase().includes('cover')) || 
              (href && href.toLowerCase().includes('cover'))) {
            if (mediaType && mediaType.startsWith('image/')) {
              const fullPath = basePath + href;
              if (zip.files[fullPath]) {
                try {
                  const imageData = await zip.files[fullPath].async('base64');
                  metadata.coverImage = `data:${mediaType};base64,${imageData}`;
                  break;
                } catch (error) {
                  console.warn('Error extracting cover image:', error);
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn('Error extracting metadata:', error);
      }
    }

    return metadata;
  };

  const handleBookClick = async (book) => {
    try {
      const books = await getBooksFromDb();
      const bookData = books.find(b => b.id === book.id);

      if (!bookData || !bookData.fileData) {
        throw new Error('Book data not found');
      }

      const blob = new Blob([bookData.fileData]);
      const arrayBuffer = await blob.arrayBuffer();

      onBookSelect({
        ...bookData,
        fileData: arrayBuffer,
        totalPages: Math.ceil(bookData.fileData.length / 250) // Calculate total pages
      });
    } catch (error) {
      console.error('Error loading book:', error);
      alert('Error loading book. Please try again.');
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.epub')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const zip = new JSZip();
        const contents = await zip.loadAsync(arrayBuffer);

        const metadata = await extractBookMetadata(contents);

        // Process content into chunks for storage
        const { bookContentChunks } = await processBookContent(contents);

        const book = {
          id: Date.now(),
          title: metadata.title || file.name.replace('.epub', ''),
          author: metadata.author || 'Unknown Author',
          description: metadata.description || 'No description available.',
          fileData: arrayBuffer,
          coverUrl: metadata.coverImage, // Store as base64 string
          dateAdded: new Date(),
          fileSize: file.size,
          contentChunks: bookContentChunks, // Store chunks directly in book object
          chunksCount: bookContentChunks.length
        };

        await addBookToDb(book);
        onNewBookUpload({ ...book });
        setShowUploadOverlay(false);
      } catch (error) {
        console.error('Error processing EPUB:', error);
      }
    }
  };

  const processBookContent = async (zip) => {
    let chapters = [];
    let opfPath = '';

    // Find the OPF file
    for (const filename in zip.files) {
      if (filename.endsWith('.opf')) {
        opfPath = filename;
        break;
      }
    }

    if (opfPath) {
      try {
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

              chapters.push({
                id: i,
                title: `Chapter ${i + 1}`,
                content: tempDiv.innerHTML.trim(),
                href: href
              });
            }
          }
        }
      } catch (error) {
        console.warn('Error parsing EPUB structure:', error);
      }
    }

    // Create content chunks
    const chunkSize = 1000; // Words per chunk
    const bookContentChunks = [];

    chapters.forEach((chapter, chapterIndex) => {
      const chapterWords = chapter.content.split(/\s+/);
      let chunkContent = '';
      let chunkWordCount = 0;

      for (let i = 0; i < chapterWords.length; i++) {
        const word = chapterWords[i];
        chunkContent += `${word} `;
        chunkWordCount++;

        // Create storage chunks
        if (chunkWordCount >= chunkSize || i === chapterWords.length - 1) {
          bookContentChunks.push({
            id: bookContentChunks.length,
            chapterIndex: chapterIndex,
            chapterTitle: chapter.title,
            content: chunkContent.trim(),
            wordCount: chunkWordCount,
            startWordIndex: i - chunkWordCount + 1,
            endWordIndex: i
          });
          chunkContent = '';
          chunkWordCount = 0;
        }
      }
    });

    return { bookContentChunks };
  };

  const handleDeleteBook = async (bookId, event) => {
    event.stopPropagation(); // Prevent book from opening when delete is clicked
    
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        await deleteBookFromDb(bookId);
        await loadBooks(); // Refresh the library
      } catch (error) {
        console.error('Error deleting book:', error);
        alert('Error deleting book');
      }
    }
  };

  const handleChooseFile = () => {
    fileInputRef.current.click();
  };

  const formatFileSize = (bytes) => {
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const sanitizeDescription = (description) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = description;
    let textContent = tempDiv.textContent || tempDiv.innerText || '';
    textContent = textContent.replace(/(SUMMARY|Synopsis)\s*:/i, '').trim();
    return textContent;
  };

  const calculateCompletionPercentage = (book) => {
    return book.completion || 0; // Use the saved completion percentage
  };

  const toggleMenu = (bookId) => {
    setActiveMenu(activeMenu === bookId ? null : bookId); // Toggle menu visibility
  };

  const handleViewDescription = (description) => {
    alert(description || 'No description available.');
  };

  // Filter books based on search query
  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="library-container">
        <div className="library-loading">
          <div className="spinner"></div>
          <p>Loading your library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="library-container">
    {/* Upload Section */}
    <div className="upload-section">
      <div className="upload-content">
        <h2 className="upload-title">Welcome to</h2>
        <h1 className="apptitle">Sophia</h1>
        <p className="upload-text">Upload your EPUB files to start reading</p>
        <input 
          type="file" 
          className="file-input" 
          ref={fileInputRef}
          accept=".epub"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        <button className="upload-btn" onClick={() => fileInputRef.current.click()}>
          Choose File
        </button>
      </div>
    </div>

    {/* Books Grid Section */}
    <div className="books-section">
      <div className="section-header">
        <h2 className="section-title">My Library</h2>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search books by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="search-icon">🔍</div>
        </div>
      </div>
      <div className="books-grid">
        {filteredBooks.map((book) => (
          <div 
            key={book.id} 
            className="book-card" 
            onClick={() => handleBookClick(book)}
          >
            <div className="book-cover">
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} />
              ) : (
                <div className="default-cover">
                  <span className="book-icon">📚</span>
                </div>
              )}
            </div>
            <div className="book-info">
              <h3 className="book-title">{book.title}</h3>
              <p className="book-author">{book.author || 'Unknown Author'}</p>
            </div>
            <div className="completion-bar">
              <div 
                className="completion-bar-fill" 
                style={{ width: `${calculateCompletionPercentage(book)}%` }}
              ></div>
            </div>
            <p className="completion-percentage">
              {calculateCompletionPercentage(book)}% completed
            </p>
            <div 
              className={`book-card-menu ${activeMenu === book.id ? 'show' : ''}`}
              onClick={(e) => e.stopPropagation()} // Prevent card click
            >
              <button onClick={() => handleViewDescription(book.description)}>
                View Description
              </button>
              <button onClick={(event) => handleDeleteBook(book.id, event)}>
                Delete Book
              </button>
            </div>
            <button 
              className="menu-toggle-btn" 
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                toggleMenu(book.id);
              }}
            >
              ⋮
            </button>
          </div>
        ))}
        {filteredBooks.length === 0 && searchQuery && (
          <div className="no-results">
            <p>No books found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

export default Library;