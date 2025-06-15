const DB_NAME = 'ReadingAppDB';
const DB_VERSION = 1;
const STORE_BOOKS = 'books'; // Object store name for books

let db = null; // Variable to hold the IndexedDB instance

/**
 * Initializes the IndexedDB database.
 * Creates the 'books' object store if it doesn't exist.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 */
export const initDb = () => {
    return new Promise((resolve, reject) => {
        // If the database instance already exists, resolve immediately.
        if (db) {
            resolve(db);
            return;
        }

        // Open the IndexedDB database.
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Handle database errors.
        request.onerror = (event) => {
            console.error("IndexedDB error:", event.target.errorCode, event.target.error);
            reject(new Error("IndexedDB error: " + event.target.errorCode));
        };

        // This event is fired when the database needs to be upgraded (e.g., first time opening, or version change).
        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            // Create the 'books' object store if it doesn't already exist.
            if (!dbInstance.objectStoreNames.contains(STORE_BOOKS)) {
                dbInstance.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
                // No indexes needed for basic CRUD by ID, but could add for title search etc.
            }
        };

        // This event is fired when the database is successfully opened.
        request.onsuccess = (event) => {
            db = event.target.result; // Store the database instance globally.
            resolve(db);
        };
    });
};

/**
 * Adds a new book to the IndexedDB.
 * @param {Object} book - The book object to add. Must have a unique 'id' property.
 * @returns {Promise<Object>} A promise that resolves with the added book object.
 */
export const addBookToDb = async (book) => {
    const dbInstance = await initDb(); // Ensure DB is initialized.
    return new Promise((resolve, reject) => {
        // Start a readwrite transaction on the 'books' object store.
        const transaction = dbInstance.transaction([STORE_BOOKS], 'readwrite');
        const store = transaction.objectStore(STORE_BOOKS);

        // Add the book object to the store.
        const request = store.add(book);

        request.onsuccess = () => {
            console.log(`Book "${book.title}" added successfully.`);
            resolve(book);
        };
        request.onerror = (event) => {
            console.error("Error adding book:", event.target.error);
            reject(event.target.error);
        };
    });
};

/**
 * Retrieves all books from the IndexedDB.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of book objects.
 */
export const getBooksFromDb = async () => {
    const dbInstance = await initDb(); // Ensure DB is initialized.
    return new Promise((resolve, reject) => {
        // Start a readonly transaction on the 'books' object store.
        const transaction = dbInstance.transaction([STORE_BOOKS], 'readonly');
        const store = transaction.objectStore(STORE_BOOKS);

        // Get all objects from the store.
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = (event) => {
            console.error("Error retrieving books:", event.target.error);
            reject(event.target.error);
        };
    });
};

/**
 * Retrieves a single book by its ID from the IndexedDB.
 * @param {string} bookId - The ID of the book to retrieve.
 * @returns {Promise<Object|undefined>} A promise that resolves with the book object if found, otherwise undefined.
 */
export const getBookContentFromDb = async (bookId) => {
    const dbInstance = await initDb(); // Ensure DB is initialized.
    return new Promise((resolve, reject) => {
        // Start a readonly transaction on the 'books' object store.
        const transaction = dbInstance.transaction([STORE_BOOKS], 'readonly');
        const store = transaction.objectStore(STORE_BOOKS);

        // Get the object by its key (ID).
        const request = store.get(bookId);

        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = (event) => {
            console.error(`Error retrieving book with ID ${bookId}:`, event.target.error);
            reject(event.target.error);
        };
    });
};

/**
 * Deletes a book by its ID from the IndexedDB.
 * @param {string} bookId - The ID of the book to delete.
 * @returns {Promise<void>} A promise that resolves when the book is successfully deleted.
 */
export const deleteBookFromDb = async (bookId) => {
    const dbInstance = await initDb(); // Ensure DB is initialized.
    return new Promise((resolve, reject) => {
        // Start a readwrite transaction on the 'books' object store.
        const transaction = dbInstance.transaction([STORE_BOOKS], 'readwrite');
        const store = transaction.objectStore(STORE_BOOKS);

        // Delete the object by its key (ID).
        const request = store.delete(bookId);

        request.onsuccess = () => {
            console.log(`Book with ID ${bookId} deleted successfully.`);
            resolve();
        };
        request.onerror = (event) => {
            console.error(`Error deleting book with ID ${bookId}:`, event.target.error);
            reject(event.target.error);
        };
    });
};

/**
 * Clears all books from the IndexedDB.
 * Use with caution!
 * @returns {Promise<void>} A promise that resolves when the store is cleared.
 */
export const clearAllBooksFromDb = async () => {
    const dbInstance = await initDb(); // Ensure DB is initialized.
    return new Promise((resolve, reject) => {
        const transaction = dbInstance.transaction([STORE_BOOKS], 'readwrite');
        const store = transaction.objectStore(STORE_BOOKS);
        const request = store.clear();

        request.onsuccess = () => {
            console.log("All books cleared from IndexedDB.");
            resolve();
        };
        request.onerror = (event) => {
            console.error("Error clearing books:", event.target.error);
            reject(event.target.error);
        };
    });
};

/**
 * Updates a book's last read page and completion progress in the IndexedDB.
 * @param {string} bookId - The ID of the book to update.
 * @param {number} lastReadPage - The last read page index.
 * @param {number} totalPages - The total number of pages in the book.
 * @returns {Promise<void>} A promise that resolves when the book is successfully updated.
 */
export const updateBookProgress = async (bookId, lastReadPage, totalPages) => {
    const dbInstance = await initDb(); // Ensure DB is initialized.
    return new Promise((resolve, reject) => {
        const transaction = dbInstance.transaction([STORE_BOOKS], 'readwrite');
        const store = transaction.objectStore(STORE_BOOKS);

        // Get the book by its ID.
        const request = store.get(bookId);

        request.onsuccess = () => {
            const book = request.result;
            if (book) {
                book.lastReadPage = lastReadPage;
                book.totalPages = totalPages;
                book.completion = Math.floor((lastReadPage / totalPages) * 100); // Calculate completion percentage.

                // Update the book in the store.
                const updateRequest = store.put(book);
                updateRequest.onsuccess = () => {
                    console.log(`Book progress updated: ${book.title}`);
                    resolve();
                };
                updateRequest.onerror = (event) => {
                    console.error('Error updating book progress:', event.target.error);
                    reject(event.target.error);
                };
            } else {
                reject(new Error(`Book with ID ${bookId} not found.`));
            }
        };

        request.onerror = (event) => {
            console.error(`Error retrieving book with ID ${bookId}:`, event.target.error);
            reject(event.target.error);
        };
    });
};