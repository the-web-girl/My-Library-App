// async function addBook(book) {
//   let response = await fetch("books.php?action=add", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(book)
//   });
//   let result = await response.json();
//   console.log(result);
// }

// // Exemple d'objet à envoyer
// addBook({
//   google_id: "abcd1234",
//   title: "1984",
//   author: "George Orwell",
//   isbn: "0451524934",
//   pages: 328,
//   cover_url: "https://example.com/cover.jpg",
//   format: "poche",
//   series: "Classiques",
//   series_number: 1,
//   status: "wishlist",
//   reading_state: "a_lire"
// });

// async function getBooks(status = null) {
//   let url = "books.php?action=list";
//   if (status) url += "&status=" + status;
//   let response = await fetch(url);
//   let books = await response.json();
//   console.log(books);
// }

// getBooks("wishlist"); // Liste seulement la wishlist

// ===============================
// CONFIGURATION ET VARIABLES GLOBALES
// ===============================

// Configuration de l'API Google Books
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

// Variables globales pour la gestion de l'état
let allBooks = []; // Tous les livres stockés localement
let currentSelectedBook = null; // Livre actuellement sélectionné dans le modal
let searchTimeout = null; // Timer pour le debouncing des recherches

// ===============================
// GESTIONNAIRE D'ÉVÉNEMENTS AU CHARGEMENT
// ===============================

// Initialisation de l'application au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de l\'application...');
    
    // Charger les livres depuis le localStorage
    loadBooksFromStorage();
    
    // Configurer les gestionnaires d'événements
    setupEventListeners();
    
    // Afficher l'interface initiale
    updateUI();
    
    console.log('✅ Application initialisée avec succès');
});

// ===============================
// CONFIGURATION DES ÉVÉNEMENTS
// ===============================

function setupEventListeners() {
    // ✅ Recherche Google Books avec debouncing (délai de 300ms)
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        
        // Annuler la recherche précédente si elle existe
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Démarrer une nouvelle recherche après 300ms de délai
        searchTimeout = setTimeout(() => {
            if (query.length >= 2) {
                searchGoogleBooks(query);
            } else {
                hideSuggestions();
            }
        }, 300);
    });

    // ✅ Masquer les suggestions quand on clique ailleurs
    document.addEventListener('click', function(e) {
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer.contains(e.target)) {
            hideSuggestions();
        }
    });

    // ✅ Recherche locale dans la wishlist
    const wishlistSearch = document.getElementById('wishlistSearch');
    wishlistSearch.addEventListener('input', function(e) {
        const query = e.target.value.trim().toLowerCase();
        filterBooks('wishlist', query);
    });

    // ✅ Recherche locale dans la bibliothèque
    const librarySearch = document.getElementById('librarySearch');
    librarySearch.addEventListener('input', function(e) {
        const query = e.target.value.trim().toLowerCase();
        filterBooks('bibliotheque', query);
    });

    // ✅ Gestion du formulaire d'ajout de livre
    const bookForm = document.getElementById('bookForm');
    bookForm.addEventListener('submit', function(e) {
        e.preventDefault();
        addBookToCollection();
    });

    // ✅ Afficher/masquer l'état de lecture selon le statut sélectionné
    const bookStatus = document.getElementById('bookStatus');
    bookStatus.addEventListener('change', function(e) {
        const readingStateGroup = document.getElementById('readingStateGroup');
        if (e.target.value === 'bibliotheque') {
            readingStateGroup.style.display = 'block';
        } else {
            readingStateGroup.style.display = 'none';
        }
    });

    // ✅ Fermer le modal avec la touche Échap
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// ===============================
// GESTION DU STOCKAGE LOCAL
// ===============================

// 📦 Charger les livres depuis le localStorage
function loadBooksFromStorage() {
    try {
        const savedBooks = localStorage.getItem('books-collection');
        if (savedBooks) {
            allBooks = JSON.parse(savedBooks);
            console.log(`📚 ${allBooks.length} livres chargés depuis le stockage local`);
        } else {
            allBooks = [];
            console.log('📚 Aucun livre trouvé dans le stockage local');
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des livres:', error);
        allBooks = [];
        showToast('Erreur', 'Impossible de charger vos livres', 'destructive');
    }
}

// 💾 Sauvegarder les livres dans le localStorage
function saveBooksToStorage() {
    try {
        localStorage.setItem('books-collection', JSON.stringify(allBooks));
        console.log(`💾 ${allBooks.length} livres sauvegardés`);
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde:', error);
        showToast('Erreur', 'Impossible de sauvegarder vos livres', 'destructive');
    }
}

// ===============================
// API GOOGLE BOOKS
// ===============================

// 🔍 Rechercher des livres sur Google Books API
async function searchGoogleBooks(query) {
    console.log(`🔍 Recherche Google Books: "${query}"`);
    
    // Afficher le spinner de chargement
    showLoadingSpinner();
    
    try {
        // Construire l'URL de l'API avec paramètres de recherche
        const url = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&maxResults=8&printType=books&projection=full`;
        
        // Effectuer la requête HTTP
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`📖 ${data.totalItems || 0} livres trouvés`);
        
        // Afficher les suggestions
        displaySuggestions(data.items || []);
        
    } catch (error) {
        console.error('❌ Erreur lors de la recherche:', error);
        showToast('Erreur', 'Impossible de rechercher des livres', 'destructive');
        hideSuggestions();
    } finally {
        // Masquer le spinner dans tous les cas
        hideLoadingSpinner();
    }
}

// ===============================
// INTERFACE UTILISATEUR - SUGGESTIONS
// ===============================

// 📝 Afficher les suggestions de livres
function displaySuggestions(books) {
    const suggestionsContainer = document.getElementById('suggestions');
    
    if (books.length === 0) {
        // Aucun résultat trouvé
        suggestionsContainer.innerHTML = `
            <div style="padding: 1rem; text-align: center; color: var(--muted-foreground);">
                Aucun livre trouvé pour cette recherche
            </div>
        `;
        suggestionsContainer.classList.add('show');
        return;
    }
    
    // Générer le HTML pour chaque suggestion
    const suggestionsHTML = books.map(book => {
        const volumeInfo = book.volumeInfo;
        const title = volumeInfo.title || 'Titre inconnu';
        const authors = volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Auteur inconnu';
        const pageCount = volumeInfo.pageCount ? `${volumeInfo.pageCount} pages` : '';
        const thumbnail = volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || '';
        
        return `
            <button class="suggestion-item" onclick="selectBook('${book.id}', ${JSON.stringify(book).replace(/"/g, '&quot;')})">
                ${thumbnail ? 
                    `<img src="${thumbnail}" alt="${title}" class="suggestion-cover" onerror="this.style.display='none';">` :
                    `<div class="suggestion-placeholder"><span class="icon">📖</span></div>`
                }
                <div class="suggestion-info">
                    <div class="suggestion-title">${escapeHtml(title)}</div>
                    <div class="suggestion-author">${escapeHtml(authors)}</div>
                    ${pageCount ? `<div class="suggestion-pages">${pageCount}</div>` : ''}
                </div>
            </button>
        `;
    }).join('');
    
    suggestionsContainer.innerHTML = suggestionsHTML;
    suggestionsContainer.classList.add('show');
}

// 🎯 Sélectionner un livre depuis les suggestions
function selectBook(bookId, bookData) {
    console.log(`📖 Livre sélectionné: ${bookData.volumeInfo.title}`);
    
    // Stocker le livre sélectionné pour le modal
    currentSelectedBook = bookData;
    
    // Ouvrir le modal de détails
    openBookModal(bookData);
    
    // Nettoyer la recherche
    document.getElementById('searchInput').value = '';
    hideSuggestions();
}

// 🙈 Masquer les suggestions
function hideSuggestions() {
    const suggestionsContainer = document.getElementById('suggestions');
    suggestionsContainer.classList.remove('show');
}

// ⏳ Afficher le spinner de chargement
function showLoadingSpinner() {
    document.getElementById('loadingSpinner').style.display = 'block';
}

// ⏹️ Masquer le spinner de chargement
function hideLoadingSpinner() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

// ===============================
// MODAL DE DÉTAILS DU LIVRE
// ===============================

// 📖 Ouvrir le modal avec les détails du livre
function openBookModal(bookData) {
    const modal = document.getElementById('bookModal');
    const modalContent = document.getElementById('modalBookContent');
    
    const volumeInfo = bookData.volumeInfo;
    const title = volumeInfo.title || 'Titre inconnu';
    const authors = volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Auteur inconnu';
    const pageCount = volumeInfo.pageCount || 'Non spécifié';
    const thumbnail = volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || '';
    const description = volumeInfo.description || 'Aucune description disponible';
    
    // Remplir le contenu du modal
    modalContent.innerHTML = `
        ${thumbnail ? 
            `<img src="${thumbnail}" alt="${title}" class="modal-book-cover">` :
            `<div class="book-placeholder" style="width: 6rem; height: 9rem;"><span class="icon" style="font-size: 2rem;">📖</span></div>`
        }
        <div class="modal-book-info">
            <h4 class="modal-book-title">${escapeHtml(title)}</h4>
            <p class="modal-book-author">Par ${escapeHtml(authors)}</p>
            <div class="badges">
                <span class="badge badge-secondary">${pageCount} pages</span>
                ${volumeInfo.publishedDate ? `<span class="badge badge-outline">${volumeInfo.publishedDate.split('-')[0]}</span>` : ''}
            </div>
            <p style="font-size: 0.875rem; color: var(--muted-foreground); margin-top: 0.5rem; line-height: 1.4;">
                ${escapeHtml(description.substring(0, 200))}${description.length > 200 ? '...' : ''}
            </p>
        </div>
    `;
    
    // Réinitialiser le formulaire
    document.getElementById('bookForm').reset();
    document.getElementById('readingStateGroup').style.display = 'none';
    
    // Afficher le modal
    modal.classList.add('show');
    
    // Empêcher le scroll de la page
    document.body.style.overflow = 'hidden';
}

// ❌ Fermer le modal
function closeModal() {
    const modal = document.getElementById('bookModal');
    modal.classList.remove('show');
    
    // Réactiver le scroll de la page
    document.body.style.overflow = 'auto';
    
    // Réinitialiser les données
    currentSelectedBook = null;
}

// ===============================
// GESTION DE LA COLLECTION
// ===============================

// ➕ Ajouter un livre à la collection
function addBookToCollection() {
    if (!currentSelectedBook) {
        console.error('❌ Aucun livre sélectionné');
        return;
    }
    
    const volumeInfo = currentSelectedBook.volumeInfo;
    
    // Récupérer les données du formulaire
    const formData = {
        series: document.getElementById('bookSeries').value.trim(),
        seriesNumber: parseInt(document.getElementById('bookSeriesNumber').value) || null,
        format: document.getElementById('bookFormat').value,
        status: document.getElementById('bookStatus').value,
        readingState: document.getElementById('bookReadingState').value
    };
    
    // Créer l'objet livre
    const newBook = {
        id: Date.now(), // ID unique basé sur timestamp
        google_id: currentSelectedBook.id,
        title: volumeInfo.title || 'Titre inconnu',
        author: volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Auteur inconnu',
        isbn: volumeInfo.industryIdentifiers?.[0]?.identifier || null,
        pages: volumeInfo.pageCount || null,
        cover_url: volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
        format: formData.format,
        series: formData.series || null,
        series_number: formData.seriesNumber,
        status: formData.status,
        reading_state: formData.status === 'wishlist' ? 'a_lire' : formData.readingState,
        created_at: new Date().toISOString()
    };
    
    // Vérifier si le livre existe déjà (éviter les doublons par google_id)
    const existingBookIndex = allBooks.findIndex(book => book.google_id === newBook.google_id);
    
    if (existingBookIndex !== -1) {
        // Mettre à jour le livre existant
        allBooks[existingBookIndex] = { ...newBook, id: allBooks[existingBookIndex].id };
        console.log(`📝 Livre mis à jour: ${newBook.title}`);
        showToast('Livre mis à jour', `"${newBook.title}" existait déjà et a été mis à jour.`);
    } else {
        // Ajouter un nouveau livre
        allBooks.push(newBook);
        console.log(`➕ Nouveau livre ajouté: ${newBook.title}`);
        showToast('Livre ajouté !', `"${newBook.title}" a été ajouté à votre ${newBook.status === 'wishlist' ? 'wishlist' : 'bibliothèque'}.`);
    }
    
    // Sauvegarder et mettre à jour l'interface
    saveBooksToStorage();
    updateUI();
    closeModal();
}

// 🔄 Changer le statut d'un livre (wishlist ↔ bibliothèque)
function updateBookStatus(bookId, newStatus) {
    const bookIndex = allBooks.findIndex(book => book.id === bookId);
    
    if (bookIndex === -1) {
        console.error('❌ Livre introuvable');
        return;
    }
    
    const oldStatus = allBooks[bookIndex].status;
    allBooks[bookIndex].status = newStatus;
    
    // Réinitialiser l'état de lecture si on met en wishlist
    if (newStatus === 'wishlist') {
        allBooks[bookIndex].reading_state = 'a_lire';
    }
    
    const book = allBooks[bookIndex];
    console.log(`🔄 Statut changé: ${book.title} (${oldStatus} → ${newStatus})`);
    
    showToast('Statut mis à jour', `"${book.title}" a été déplacé vers ${newStatus === 'wishlist' ? 'la wishlist' : 'la bibliothèque'}.`);
    
    saveBooksToStorage();
    updateUI();
}

// 📚 Changer l'état de lecture d'un livre
function updateReadingState(bookId, newState) {
    const bookIndex = allBooks.findIndex(book => book.id === bookId);
    
    if (bookIndex === -1) {
        console.error('❌ Livre introuvable');
        return;
    }
    
    allBooks[bookIndex].reading_state = newState;
    const book = allBooks[bookIndex];
    
    console.log(`📖 État de lecture changé: ${book.title} → ${newState}`);
    
    showToast('État de lecture mis à jour', `"${book.title}" a été marqué comme ${newState === 'lu' ? 'lu' : 'non lu'}.`);
    
    saveBooksToStorage();
    updateUI();
}

// 🗑️ Supprimer un livre de la collection
function deleteBook(bookId) {
    const bookIndex = allBooks.findIndex(book => book.id === bookId);
    
    if (bookIndex === -1) {
        console.error('❌ Livre introuvable');
        return;
    }
    
    // Demander confirmation
    const book = allBooks[bookIndex];
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${book.title}" de votre collection ?`)) {
        return;
    }
    
    // Supprimer le livre
    allBooks.splice(bookIndex, 1);
    
    console.log(`🗑️ Livre supprimé: ${book.title}`);
    showToast('Livre supprimé', `"${book.title}" a été supprimé de votre collection.`, 'destructive');
    
    saveBooksToStorage();
    updateUI();
}

// ===============================
// INTERFACE UTILISATEUR - AFFICHAGE
// ===============================

// 🔄 Mettre à jour toute l'interface utilisateur
function updateUI() {
    console.log('🔄 Mise à jour de l\'interface...');
    
    // Séparer les livres par statut
    const wishlistBooks = allBooks.filter(book => book.status === 'wishlist');
    const libraryBooks = allBooks.filter(book => book.status === 'bibliotheque');
    
    // Mettre à jour les compteurs
    updateSectionCounts(wishlistBooks.length, libraryBooks.length);
    
    // Afficher les livres
    displayBooks('wishlist', wishlistBooks);
    displayBooks('bibliotheque', libraryBooks);
    
    // Afficher/masquer le message d'accueil
    toggleWelcomeMessage(allBooks.length === 0);
}

// 🔢 Mettre à jour les compteurs de sections
function updateSectionCounts(wishlistCount, libraryCount) {
    document.getElementById('wishlistCount').textContent = wishlistCount;
    document.getElementById('libraryCount').textContent = libraryCount;
}

// 👋 Afficher/masquer le message d'accueil
function toggleWelcomeMessage(show) {
    const welcomeMessage = document.getElementById('welcomeMessage');
    welcomeMessage.style.display = show ? 'block' : 'none';
}

// 📚 Afficher les livres dans une section donnée
function displayBooks(sectionType, books) {
    const gridId = sectionType === 'wishlist' ? 'wishlistGrid' : 'libraryGrid';
    const grid = document.getElementById(gridId);
    
    if (books.length === 0) {
        // Aucun livre dans cette section
        const message = sectionType === 'wishlist' ? 
            'Aucun livre dans votre wishlist' : 
            'Aucun livre dans votre bibliothèque';
        grid.innerHTML = `<div class="no-books">${message}</div>`;
        return;
    }
    
    // Trier les livres par série puis par numéro, puis par titre
    const sortedBooks = [...books].sort((a, b) => {
        // D'abord par série
        if (a.series && b.series) {
            const seriesCompare = a.series.localeCompare(b.series);
            if (seriesCompare !== 0) return seriesCompare;
            
            // Puis par numéro dans la série
            if (a.series_number && b.series_number) {
                return a.series_number - b.series_number;
            }
        }
        
        // Sinon par titre
        return a.title.localeCompare(b.title);
    });
    
    // Générer le HTML pour chaque livre
    const booksHTML = sortedBooks.map(book => createBookCardHTML(book)).join('');
    grid.innerHTML = booksHTML;
}

// 🎴 Créer le HTML d'une carte de livre
function createBookCardHTML(book) {
    const statusIcon = book.status === 'wishlist' ? '💝' : '📚';
    const statusText = book.status === 'wishlist' ? 'Wishlist' : 'Bibliothèque';
    const statusClass = book.status === 'wishlist' ? 'badge-wishlist' : 'badge-library';
    
    const readingStateIcon = book.reading_state === 'lu' ? '✅' : '⏰';
    const readingStateText = book.reading_state === 'lu' ? 'Lu' : 'À lire';
    const readingStateClass = book.reading_state === 'lu' ? 'badge-read' : 'badge-unread';
    
    // Boutons d'action selon le statut
    const primaryAction = book.status === 'wishlist' ?
        `<button class="btn btn-library btn-sm" onclick="updateBookStatus(${book.id}, 'bibliotheque')">
            <span class="icon">📚</span> Ajouter à la bibliothèque
        </button>` :
        `<button class="btn btn-wishlist btn-sm" onclick="updateBookStatus(${book.id}, 'wishlist')">
            <span class="icon">💝</span> Remettre en wishlist
        </button>`;
    
    const readingAction = book.status === 'bibliotheque' ?
        `<button class="btn ${book.reading_state === 'lu' ? 'btn-unread' : 'btn-read'} btn-sm" onclick="updateReadingState(${book.id}, '${book.reading_state === 'lu' ? 'a_lire' : 'lu'}')">
            <span class="icon">${book.reading_state === 'lu' ? '⏰' : '✅'}</span>
            ${book.reading_state === 'lu' ? 'Non lu' : 'Marquer lu'}
        </button>` : '';
    
    return `
        <div class="book-card">
            <div class="book-content">
                ${book.cover_url ? 
                    `<img src="${book.cover_url}" alt="${book.title}" class="book-cover" onerror="this.style.display='none';">` :
                    `<div class="book-placeholder"><span class="icon" style="font-size: 2rem;">📖</span></div>`
                }
                <div class="book-info">
                    <h3 class="book-title">${escapeHtml(book.title)}</h3>
                    <p class="book-author">${escapeHtml(book.author)}</p>
                    
                    <div class="badges">
                        <span class="badge badge-secondary">${book.format}</span>
                        ${book.pages ? `<span class="badge badge-outline">${book.pages} pages</span>` : ''}
                        ${book.series ? `<span class="badge badge-outline">${escapeHtml(book.series)} #${book.series_number || '?'}</span>` : ''}
                    </div>
                    
                    <div class="status-badges">
                        <span class="badge ${statusClass}">
                            <span class="icon">${statusIcon}</span> ${statusText}
                        </span>
                        ${book.status === 'bibliotheque' ? 
                            `<span class="badge ${readingStateClass}">
                                <span class="icon">${readingStateIcon}</span> ${readingStateText}
                            </span>` : ''
                        }
                    </div>
                </div>
            </div>
            
            <div class="book-actions">
                ${primaryAction}
                ${readingAction}
                <button class="btn btn-destructive btn-sm btn-icon" onclick="deleteBook(${book.id})" title="Supprimer">
                    <span class="icon">🗑️</span>
                </button>
            </div>
        </div>
    `;
}

// ===============================
// RECHERCHE LOCALE / FILTRAGE
// ===============================

// 🔍 Filtrer les livres selon une recherche locale
function filterBooks(sectionType, query) {
    // Récupérer tous les livres de la section
    const allSectionBooks = allBooks.filter(book => book.status === sectionType);
    
    if (!query) {
        // Aucune recherche : afficher tous les livres
        displayBooks(sectionType, allSectionBooks);
        return;
    }
    
    // Filtrer selon la requête de recherche
    const filteredBooks = allSectionBooks.filter(book => {
        const searchText = query.toLowerCase();
        return (
            book.title.toLowerCase().includes(searchText) ||
            book.author.toLowerCase().includes(searchText) ||
            (book.series && book.series.toLowerCase().includes(searchText)) ||
            (book.isbn && book.isbn.toLowerCase().includes(searchText))
        );
    });
    
    console.log(`🔍 Recherche locale "${query}": ${filteredBooks.length} résultats`);
    displayBooks(sectionType, filteredBooks);
}

// ===============================
// NOTIFICATIONS TOAST
// ===============================

// 🍞 Afficher une notification toast
function showToast(title, description, variant = 'default') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastDescription = document.getElementById('toastDescription');
    
    // Remplir le contenu
    toastTitle.textContent = title;
    toastDescription.textContent = description;
    
    // Appliquer le style selon le variant
    toast.className = `toast ${variant === 'destructive' ? 'toast-destructive' : ''}`;
    
    // Afficher le toast
    toast.classList.add('show');
    
    // Masquer automatiquement après 4 secondes
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
    
    console.log(`🍞 Toast: ${title} - ${description}`);
}

// ===============================
// UTILITAIRES
// ===============================

// 🛡️ Échapper les caractères HTML pour éviter les injections XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 📊 Statistiques de débogage (optionnel)
function debugStats() {
    console.log('📊 Statistiques de la collection:');
    console.log(`   Total livres: ${allBooks.length}`);
    console.log(`   Wishlist: ${allBooks.filter(b => b.status === 'wishlist').length}`);
    console.log(`   Bibliothèque: ${allBooks.filter(b => b.status === 'bibliotheque').length}`);
    console.log(`   Livres lus: ${allBooks.filter(b => b.reading_state === 'lu').length}`);
    console.log(`   Livres à lire: ${allBooks.filter(b => b.reading_state === 'a_lire').length}`);
}

// Exposer la fonction debug globalement (pour tests en console)
window.debugStats = debugStats;