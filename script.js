// ===============================
// CONFIGURATION ET VARIABLES GLOBALES
// ===============================

// Configuration de l'API Open Library
const OPEN_LIBRARY_API = 'https://openlibrary.org/search.json';

// Variables globales pour la gestion de l'état
let allBooks = []; // Tous les livres stockés localement
let currentSelectedBook = null; // Livre actuellement sélectionné dans le modal
let searchTimeout = null; // Timer pour le debouncing des recherches

// ===============================
// GESTIONNAIRE D'ÉVÉNEMENTS AU CHARGEMENT
// ===============================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de l\'application...');
    loadBooksFromStorage();
    setupEventListeners();
    updateUI();
    console.log('✅ Application initialisée avec succès');
});

// ===============================
// CONFIGURATION DES ÉVÉNEMENTS
// ===============================

function setupEventListeners() {
    // ✅ Recherche Open Library avec debouncing (300ms)
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        if (searchTimeout) clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (query.length >= 2) {
                searchOpenLibrary(query);
            } else {
                hideSuggestions();
            }
        }, 300);
    });

    document.addEventListener('click', function(e) {
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer.contains(e.target)) hideSuggestions();
    });

    document.getElementById('wishlistSearch').addEventListener('input', e => {
        filterBooks('wishlist', e.target.value.trim().toLowerCase());
    });

    document.getElementById('librarySearch').addEventListener('input', e => {
        filterBooks('bibliotheque', e.target.value.trim().toLowerCase());
    });

    document.getElementById('bookForm').addEventListener('submit', e => {
        e.preventDefault();
        addBookToCollection();
    });

    document.getElementById('bookStatus').addEventListener('change', e => {
        const readingStateGroup = document.getElementById('readingStateGroup');
        readingStateGroup.style.display = e.target.value === 'bibliotheque' ? 'block' : 'none';
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });
}

// ===============================
// STOCKAGE LOCAL
// ===============================

function loadBooksFromStorage() {
    try {
        const savedBooks = localStorage.getItem('books-collection');
        allBooks = savedBooks ? JSON.parse(savedBooks) : [];
        console.log(`📚 ${allBooks.length} livres chargés depuis le stockage local`);
    } catch (error) {
        console.error('❌ Erreur chargement:', error);
        allBooks = [];
        showToast('Erreur', 'Impossible de charger vos livres', 'destructive');
    }
}

function saveBooksToStorage() {
    try {
        localStorage.setItem('books-collection', JSON.stringify(allBooks));
        console.log(`💾 ${allBooks.length} livres sauvegardés`);
    } catch (error) {
        console.error('❌ Erreur sauvegarde:', error);
        showToast('Erreur', 'Impossible de sauvegarder vos livres', 'destructive');
    }
}

// ===============================
// API OPEN LIBRARY
// ===============================

async function searchOpenLibrary(query) {
    console.log(`🔍 Recherche Open Library: "${query}"`);
    showLoadingSpinner();
    try {
        const url = `${OPEN_LIBRARY_API}?q=${encodeURIComponent(query)}&limit=8`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
        const data = await response.json();
        console.log(`📖 ${data.numFound || 0} livres trouvés`);
        displaySuggestions(data.docs || []);
    } catch (error) {
        console.error('❌ Erreur recherche:', error);
        showToast('Erreur', 'Impossible de rechercher des livres', 'destructive');
        hideSuggestions();
    } finally {
        hideLoadingSpinner();
    }
}

// ===============================
// UI : SUGGESTIONS
// ===============================

function displaySuggestions(books) {
    const container = document.getElementById('suggestions');
    if (books.length === 0) {
        container.innerHTML = `<div style="padding:1rem;text-align:center;color:var(--muted-foreground);">Aucun livre trouvé</div>`;
        container.classList.add('show');
        return;
    }
    const html = books.map(book => {
        const title = book.title || 'Titre inconnu';
        const authors = book.author_name ? book.author_name.join(', ') : 'Auteur inconnu';
        const pageCount = book.number_of_pages_median ? `${book.number_of_pages_median} pages` : '';
        const coverUrl = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : '';
        return `
            <button class="suggestion-item" onclick="selectBook('${book.key}', ${JSON.stringify(book).replace(/"/g, '&quot;')})">
                ${coverUrl ? `<img src="${coverUrl}" alt="${title}" class="suggestion-cover" onerror="this.style.display='none';">`
                            : `<div class="suggestion-placeholder"><span class="icon">📖</span></div>`}
                <div class="suggestion-info">
                    <div class="suggestion-title">${escapeHtml(title)}</div>
                    <div class="suggestion-author">${escapeHtml(authors)}</div>
                    ${pageCount ? `<div class="suggestion-pages">${pageCount}</div>` : ''}
                </div>
            </button>`;
    }).join('');
    container.innerHTML = html;
    container.classList.add('show');
}

function selectBook(bookId, bookData) {
    console.log(`📖 Livre sélectionné: ${bookData.title}`);
    currentSelectedBook = bookData;
    openBookModal(bookData);
    document.getElementById('searchInput').value = '';
    hideSuggestions();
}

function hideSuggestions() {
    document.getElementById('suggestions').classList.remove('show');
}

function showLoadingSpinner() {
    document.getElementById('loadingSpinner').style.display = 'block';
}

function hideLoadingSpinner() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

// ===============================
// MODAL DE DÉTAILS
// ===============================

function openBookModal(bookData) {
    const modal = document.getElementById('bookModal');
    const content = document.getElementById('modalBookContent');
    const title = bookData.title || 'Titre inconnu';
    const authors = bookData.author_name ? bookData.author_name.join(', ') : 'Auteur inconnu';
    const pageCount = bookData.number_of_pages_median || 'Non spécifié';
    const coverUrl = bookData.cover_i ? `https://covers.openlibrary.org/b/id/${bookData.cover_i}-L.jpg` : '';
    const year = bookData.first_publish_year || '';
    content.innerHTML = `
        ${coverUrl ? `<img src="${coverUrl}" alt="${title}" class="modal-book-cover">`
                   : `<div class="book-placeholder" style="width:6rem;height:9rem;"><span class="icon" style="font-size:2rem;">📖</span></div>`}
        <div class="modal-book-info">
            <h4 class="modal-book-title">${escapeHtml(title)}</h4>
            <p class="modal-book-author">Par ${escapeHtml(authors)}</p>
            <div class="badges">
                <span class="badge badge-secondary">${pageCount} pages</span>
                ${year ? `<span class="badge badge-outline">${year}</span>` : ''}
            </div>
            <p style="font-size:0.875rem;color:var(--muted-foreground);margin-top:0.5rem;line-height:1.4;">
                ${bookData.subject ? escapeHtml(bookData.subject.slice(0,5).join(', ')) : 'Aucune description disponible'}
            </p>
        </div>`;
    document.getElementById('bookForm').reset();
    document.getElementById('readingStateGroup').style.display = 'none';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('bookModal').classList.remove('show');
    document.body.style.overflow = 'auto';
    currentSelectedBook = null;
}

// ===============================
// COLLECTION
// ===============================

function addBookToCollection() {
    if (!currentSelectedBook) return console.error('❌ Aucun livre sélectionné');
    const formData = {
        series: document.getElementById('bookSeries').value.trim(),
        seriesNumber: parseInt(document.getElementById('bookSeriesNumber').value) || null,
        format: document.getElementById('bookFormat').value,
        status: document.getElementById('bookStatus').value,
        readingState: document.getElementById('bookReadingState').value
    };
    const newBook = {
        id: Date.now(),
        olid: currentSelectedBook.key,
        title: currentSelectedBook.title || 'Titre inconnu',
        author: currentSelectedBook.author_name ? currentSelectedBook.author_name.join(', ') : 'Auteur inconnu',
        isbn: currentSelectedBook.isbn ? currentSelectedBook.isbn[0] : null,
        pages: currentSelectedBook.number_of_pages_median || null,
        cover_url: currentSelectedBook.cover_i ? `https://covers.openlibrary.org/b/id/${currentSelectedBook.cover_i}-M.jpg` : null,
        format: formData.format,
        series: formData.series || null,
        series_number: formData.seriesNumber,
        status: formData.status,
        reading_state: formData.status === 'wishlist' ? 'a_lire' : formData.readingState,
        created_at: new Date().toISOString()
    };
    const index = allBooks.findIndex(b => b.olid === newBook.olid);
    if (index !== -1) {
        allBooks[index] = { ...newBook, id: allBooks[index].id };
        showToast('Livre mis à jour', `"${newBook.title}" existait déjà et a été mis à jour.`);
    } else {
        allBooks.push(newBook);
        showToast('Livre ajouté !', `"${newBook.title}" a été ajouté à votre ${newBook.status === 'wishlist' ? 'wishlist' : 'bibliothèque'}.`);
    }
    saveBooksToStorage();
    updateUI();
    closeModal();
}

function updateBookStatus(bookId, newStatus) {
    const index = allBooks.findIndex(b => b.id === bookId);
    if (index === -1) return console.error('❌ Livre introuvable');
    allBooks[index].status = newStatus;
    if (newStatus === 'wishlist') allBooks[index].reading_state = 'a_lire';
    const book = allBooks[index];
    showToast('Statut mis à jour', `"${book.title}" a été déplacé vers ${newStatus === 'wishlist' ? 'la wishlist' : 'la bibliothèque'}.`);
    saveBooksToStorage();
    updateUI();
}

function updateReadingState(bookId, newState) {
    const index = allBooks.findIndex(b => b.id === bookId);
    if (index === -1) return console.error('❌ Livre introuvable');
    allBooks[index].reading_state = newState;
    const book = allBooks[index];
    showToast('État de lecture mis à jour', `"${book.title}" a été marqué comme ${newState === 'lu' ? 'lu' : 'non lu'}.`);
    saveBooksToStorage();
    updateUI();
}

function deleteBook(bookId) {
    const index = allBooks.findIndex(b => b.id === bookId);
    if (index === -1) return console.error('❌ Livre introuvable');
    const book = allBooks[index];
    if (!confirm(`Supprimer "${book.title}" ?`)) return;
    allBooks.splice(index, 1);
    showToast('Livre supprimé', `"${book.title}" a été supprimé.`, 'destructive');
    saveBooksToStorage();
    updateUI();
}

// ===============================
// UI : COLLECTION
// ===============================

function updateUI() {
    const wishlistBooks = allBooks.filter(b => b.status === 'wishlist');
    const libraryBooks = allBooks.filter(b => b.status === 'bibliotheque');
    updateSectionCounts(wishlistBooks.length, libraryBooks.length);
    displayBooks('wishlist', wishlistBooks);
    displayBooks('bibliotheque', libraryBooks);
    toggleWelcomeMessage(allBooks.length === 0);
}

function updateSectionCounts(wishlistCount, libraryCount) {
    document.getElementById('wishlistCount').textContent = wishlistCount;
    document.getElementById('libraryCount').textContent = libraryCount;
}

function toggleWelcomeMessage(show) {
    document.getElementById('welcomeMessage').style.display = show ? 'block' : 'none';
}

function displayBooks(sectionType, books) {
    const gridId = sectionType === 'wishlist' ? 'wishlistGrid' : 'libraryGrid';
    const grid = document.getElementById(gridId);
    if (books.length === 0) {
        grid.innerHTML = `<div class="no-books">${sectionType === 'wishlist' ? 'Aucun livre dans votre wishlist' : 'Aucun livre dans votre bibliothèque'}</div>`;
        return;
    }
    const sorted = [...books].sort((a, b) => {
        if (a.series && b.series) {
            const cmp = a.series.localeCompare(b.series);
            if (cmp !== 0) return cmp;
            if (a.series_number && b.series_number) return a.series_number - b.series_number;
        }
        return a.title.localeCompare(b.title);
    });
    grid.innerHTML = sorted.map(createBookCardHTML).join('');
}

function createBookCardHTML(book) {
    const statusIcon = book.status === 'wishlist' ? '💝' : '📚';
    const statusText = book.status === 'wishlist' ? 'Wishlist' : 'Bibliothèque';
    const statusClass = book.status === 'wishlist' ? 'badge-wishlist' : 'badge-library';
    const readingStateIcon = book.reading_state === 'lu' ? '✅' : '⏰';
    const readingStateText = book.reading_state === 'lu' ? 'Lu' : 'À lire';
    const readingStateClass = book.reading_state === 'lu' ? 'badge-read' : 'badge-unread';
    const primaryAction = book.status === 'wishlist'
        ? `<button class="btn btn-library btn-sm" onclick="updateBookStatus(${book.id}, 'bibliotheque')"><span class="icon">📚</span> Ajouter à la bibliothèque</button>`
        : `<button class="btn btn-wishlist btn-sm" onclick="updateBookStatus(${book.id}, 'wishlist')"><span class="icon">💝</span> Remettre en wishlist</button>`;
    const readingAction = book.status === 'bibliotheque'
        ? `<button class="btn ${book.reading_state === 'lu' ? 'btn-unread' : 'btn-read'} btn-sm" onclick="updateReadingState(${book.id}, '${book.reading_state === 'lu' ? 'a_lire' : 'lu'}')"><span class="icon">${book.reading_state === 'lu' ? '⏰' : '✅'}</span>${book.reading_state === 'lu' ? 'Non lu' : 'Marquer lu'}</button>`
        : '';
    return `
        <div class="book-card">
            <div class="book-content">
                ${book.cover_url ? `<img src="${book.cover_url}" alt="${book.title}" class="book-cover" onerror="this.style.display='none';">`
                                   : `<div class="book-placeholder"><span class="icon" style="font-size:2rem;">📖</span></div>`}
                <div class="book-info">
                    <h3 class="book-title">${escapeHtml(book.title)}</h3>
                    <p class="book-author">${escapeHtml(book.author)}</p>
                    <div class="badges">
                        <span class="badge badge-secondary">${book.format}</span>
                        ${book.pages ? `<span class="badge badge-outline">${book.pages} pages</span>` : ''}
                        ${book.series ? `<span class="badge badge-outline">${escapeHtml(book.series)} #${book.series_number || '?'}</span>` : ''}
                    </div>
                    <div class="status-badges">
                        <span class="badge ${statusClass}"><span class="icon">${statusIcon}</span> ${statusText}</span>
                        ${book.status === 'bibliotheque' ? `<span class="badge ${readingStateClass}"><span class="icon">${readingStateIcon}</span> ${readingStateText}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="book-actions">
                ${primaryAction}
                ${readingAction}
                <button class="btn btn-destructive btn-sm btn-icon" onclick="deleteBook(${book.id})"><span class="icon">🗑️</span></button>
            </div>
        </div>`;
}

// ===============================
// RECHERCHE LOCALE
// ===============================

function filterBooks(sectionType, query) {
    const books = allBooks.filter(b => b.status === sectionType);
    if (!query) return displayBooks(sectionType, books);
    const filtered = books.filter(b => {
        const txt = query.toLowerCase();
        return b.title.toLowerCase().includes(txt) ||
               b.author.toLowerCase().includes(txt) ||
               (b.series && b.series.toLowerCase().includes(txt)) ||
               (b.isbn && b.isbn.toLowerCase().includes(txt));
    });
    displayBooks(sectionType, filtered);
}

// ===============================
// TOAST
// ===============================

function showToast(title, description, variant = 'default') {
    const toast = document.getElementById('toast');
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastDescription').textContent = description;
    toast.className = `toast ${variant === 'destructive' ? 'toast-destructive' : ''}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}

// ===============================
// UTILITAIRES
// ===============================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debugStats() {
    console.log('📊 Stats: ', {
        total: allBooks.length,
        wishlist: allBooks.filter(b => b.status === 'wishlist').length,
        library: allBooks.filter(b => b.status === 'bibliotheque').length,
        lus: allBooks.filter(b => b.reading_state === 'lu').length
    });
}