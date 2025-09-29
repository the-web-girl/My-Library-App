/**
 * === GESTIONNAIRE DE BIBLIOTHÈQUE PERSONNELLE ===
 * Application de gestion de livres avec recherche multi-API
 * APIs supportées: Google Books, OpenLibrary, MetasBooks, BnF
 */

// ===============================================
// CONFIGURATION DES APIs
// ===============================================

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_API = 'https://openlibrary.org/search.json';
const METASBOOKS_API = 'https://api.metasbooks.fr/v1/books';
const BNF_API = 'https://data.bnf.fr/sparql';
const API_URL = './books.php';

// ⚠️ Remplace par ta clé personnelle MetasBooks
const METASBOOKS_KEY = '4b623a3ad3b9066fd3b29d84ad80a48c';

// ===============================================
// VARIABLES GLOBALES
// ===============================================

let allBooks = [];                // Tous les livres de la collection
let autoCompleteResults = [];     // Résultats de l'autocomplétion
let selectedIndex = -1;           // Index sélectionné dans l'autocomplétion
let acList = null;               // Élément DOM de l'autocomplétion

// ===============================================
// INITIALISATION DE L'APPLICATION
// ===============================================

/**
 * Initialise l'application au chargement de la page
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Application de gestion de bibliothèque démarrée');
    
    // Initialisation des éléments DOM
    acList = document.getElementById('ac-list');
    
    // Configuration des événements
    setupEventListeners();
    
    // Chargement des données
    await loadBooksFromDB();
    updateUI();
    
    // Masquage du loader
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
    
    console.log('✅ Application initialisée avec succès');
});

// ===============================================
// GESTION DES ÉVÉNEMENTS
// ===============================================

/**
 * Configure tous les écouteurs d'événements de l'application
 */
function setupEventListeners() {
    const titleInput = document.getElementById('bookTitle');
    const addBookForm = document.getElementById('addBookForm');
    const resetBtn = document.getElementById('resetBtn');

    // === RECHERCHE AVEC AUTOCOMPLÉTION ===
    let debounceTimer;
    if (titleInput) {
        // Recherche avec délai (debounce) pour éviter trop de requêtes
        titleInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                hideAutoComplete();
                return;
            }
            
            debounceTimer = setTimeout(() => {
                searchBooks(query);
            }, 300); // Délai de 300ms
        });

        // Navigation au clavier dans l'autocomplétion
        titleInput.addEventListener('keydown', (e) => {
            if (!acList) return;
            
            const items = acList.querySelectorAll('.ac-item');
            if (!items.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                updateActiveItem(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                updateActiveItem(items);
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                items[selectedIndex].click();
            }
        });
    }

    // === FORMULAIRE D'AJOUT ===
    if (addBookForm) {
        addBookForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addBookToCollection();
        });
    }

    // === BOUTON RESET ===
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (addBookForm) addBookForm.reset();
            hideAutoComplete();
        });
    }

    // === FERMETURE DE L'AUTOCOMPLÉTION ===
    document.addEventListener('click', (e) => {
        const wrapper = document.querySelector('.ac-wrapper');
        if (wrapper && !wrapper.contains(e.target)) {
            hideAutoComplete();
        }
    });

    // === FILTRES ET RECHERCHE DANS LA BIBLIOTHÈQUE ===
    const libSearch = document.getElementById('librarySearch');
    const searchType = document.getElementById('searchType');
    const filterType = document.getElementById('filterType');
    const sortBySeries = document.getElementById('sortBySeries');

    if (libSearch) libSearch.addEventListener('input', updateUI);
    if (searchType) searchType.addEventListener('change', updateUI);
    if (filterType) filterType.addEventListener('change', updateUI);
    if (sortBySeries) sortBySeries.addEventListener('change', updateUI);
}

// ===============================================
// RECHERCHE DANS LES APIs EXTERNES
// ===============================================

/**
 * Recherche de livres dans toutes les APIs configurées
 * @param {string} query - Terme de recherche
 */
async function searchBooks(query) {
    try {
        console.log(`🔍 Recherche de "${query}" dans les APIs...`);

        // === REQUÊTES PARALLÈLES VERS LES APIs ===
        const [googleResults, openLibraryResults, metasBooksResults, bnfResults] = await Promise.all([
            searchGoogleBooks(query),
            searchOpenLibrary(query),
            searchMetasBooks(query),
            searchBNF(query)
        ]);

        // === FUSION ET DÉDUPLICATION ===
        const allResults = [
            ...googleResults,
            ...openLibraryResults,
            ...metasBooksResults,
            ...bnfResults
        ];

        // Déduplication basée sur titre + auteur + année
        const uniqueResults = new Map();
        allResults.forEach(book => {
            const key = `${book.title.toLowerCase()}|${book.author.toLowerCase()}|${book.year}`;
            if (!uniqueResults.has(key)) {
                uniqueResults.set(key, book);
            }
        });

        autoCompleteResults = Array.from(uniqueResults.values());
        console.log(`📚 ${autoCompleteResults.length} résultats uniques trouvés`);
        
        displayAutoComplete(autoCompleteResults);

    } catch (error) {
        console.error('❌ Erreur de recherche:', error);
        showToast('Erreur', 'Impossible de rechercher des livres', 'error');
    }
}

/**
 * Recherche dans l'API Google Books
 * @param {string} query - Terme de recherche
 * @returns {Array} Résultats formatés
 */
async function searchGoogleBooks(query) {
    try {
        const response = await fetch(`${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&maxResults=5&printType=books`);
        const data = await response.json();

        return (data.items || []).map(item => {
            const volumeInfo = item.volumeInfo || {};
            return {
                title: volumeInfo.title || 'Titre inconnu',
                author: Array.isArray(volumeInfo.authors) ? volumeInfo.authors.join(', ') : 'Auteur inconnu',
                year: volumeInfo.publishedDate ? volumeInfo.publishedDate.substring(0, 4) : '',
                cover: volumeInfo.imageLinks ?
                    (volumeInfo.imageLinks.thumbnail || volumeInfo.imageLinks.smallThumbnail || '') : '',
                source: 'Google Books'
            };
        });
    } catch (err) {
        console.error('Erreur Google Books:', err);
        return [];
    }
}

/**
 * Recherche dans l'API OpenLibrary
 * @param {string} query - Terme de recherche
 * @returns {Array} Résultats formatés
 */
async function searchOpenLibrary(query) {
    try {
        const response = await fetch(`${OPEN_LIBRARY_API}?q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();

        return (data.docs || []).map(book => ({
            title: book.title || 'Titre inconnu',
            author: book.author_name ? book.author_name.join(', ') : 'Auteur inconnu',
            year: book.first_publish_year ? String(book.first_publish_year) : '',
            cover: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : '',
            source: 'OpenLibrary'
        }));
    } catch (err) {
        console.error('Erreur OpenLibrary:', err);
        return [];
    }
}

/**
 * Recherche dans l'API MetasBooks
 * @param {string} query - Terme de recherche
 * @returns {Array} Résultats formatés
 */
async function searchMetasBooks(query) {
    try {
        const response = await fetch(`${METASBOOKS_API}?title=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${METASBOOKS_KEY}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erreur API MetasBooks: ${response.status}`);
        }

        const data = await response.json();

        return (data.results || []).map(book => ({
            title: book.title || 'Titre inconnu',
            author: book.authors?.map(a => a.name).join(', ') || 'Auteur inconnu',
            year: book.published_date ? book.published_date.substring(0, 4) : '',
            cover: book.cover_url || '',
            source: 'MetasBooks'
        }));
    } catch (err) {
        console.error('Erreur MetasBooks:', err);
        return [];
    }
}

/**
 * Recherche dans l'API BnF (SPARQL)
 * @param {string} query - Terme de recherche
 * @returns {Array} Résultats formatés
 */
async function searchBNF(query) {
    try {
        const sparqlQuery = `
            PREFIX dcterms: <http://purl.org/dc/terms/>
            PREFIX foaf: <http://xmlns.com/foaf/0.1/>
            SELECT ?title ?author ?date ?cover WHERE {
                ?work dcterms:title ?title .
                FILTER(CONTAINS(LCASE(?title), LCASE("${query}")))
                OPTIONAL { ?work dcterms:creator ?a . ?a foaf:name ?author }
                OPTIONAL { ?work dcterms:issued ?date }
                OPTIONAL { ?work foaf:depiction ?cover }
            } LIMIT 5
        `;

        const response = await fetch(BNF_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/sparql-query',
                'Accept': 'application/sparql-results+json'
            },
            body: sparqlQuery
        });

        if (!response.ok) {
            throw new Error(`Erreur API BnF: ${response.status}`);
        }

        const data = await response.json();
        const results = data.results?.bindings || [];

        return results.map(r => ({
            title: r.title?.value || 'Titre inconnu',
            author: r.author?.value || 'Auteur inconnu',
            year: r.date?.value ? r.date.value.substring(0, 4) : '',
            cover: r.cover?.value || '',
            source: 'BnF'
        }));
    } catch (err) {
        console.error('Erreur BnF:', err);
        return [];
    }
}

// ===============================================
// GESTION DE L'AUTOCOMPLÉTION
// ===============================================

/**
 * Affiche les résultats d'autocomplétion
 * @param {Array} results - Résultats à afficher
 */
function displayAutoComplete(results) {
    if (!acList) return;

    if (!results.length) {
        acList.innerHTML = '<div class="ac-item empty">Aucun résultat trouvé</div>';
        acList.classList.add('show');
        return;
    }

    acList.innerHTML = results.map((book, index) => `
        <div class="ac-item" data-index="${index}">
            ${book.cover ? 
                `<img src="${escapeHtml(book.cover)}" class="ac-cover" alt="Couverture ${escapeHtml(book.title)}">` : 
                ''
            }
            <div class="ac-info">
                <strong>${escapeHtml(book.title)}</strong><br>
                <small>${escapeHtml(book.author)}${book.year ? ` (${escapeHtml(book.year)})` : ''}</small><br>
                <em style="font-size:0.7rem;opacity:0.6">📡 ${book.source}</em>
            </div>
        </div>
    `).join('');

    acList.classList.add('show');

    // Ajout des écouteurs de clic
    acList.querySelectorAll('.ac-item').forEach((el, idx) => {
        el.addEventListener('click', () => selectBook(results[idx]));
    });

    selectedIndex = -1;
}

/**
 * Met à jour l'élément actif dans l'autocomplétion
 * @param {NodeList} items - Éléments de l'autocomplétion
 */
function updateActiveItem(items) {
    items.forEach((el, i) => {
        el.classList.toggle('active', i === selectedIndex);
        if (i === selectedIndex) {
            el.scrollIntoView({ block: 'nearest' });
        }
    });
}

/**
 * Masque l'autocomplétion
 */
function hideAutoComplete() {
    if (!acList) return;
    
    acList.innerHTML = '';
    acList.classList.remove('show');
    selectedIndex = -1;
}

/**
 * Sélectionne un livre depuis l'autocomplétion
 * @param {Object} book - Livre sélectionné
 */
function selectBook(book) {
    document.getElementById('bookTitle').value = book.title || '';
    document.getElementById('bookAuthor').value = book.author || '';
    document.getElementById('bookYear').value = book.year || '';
    document.getElementById('coverUrl').value = book.cover || '';
    
    hideAutoComplete();
    showToast('Livre sélectionné', `"${book.title}" a été ajouté au formulaire`);
}

// ===============================================
// GESTION DE LA COLLECTION
// ===============================================

/**
 * Ajoute un livre à la collection
 */
function addBookToCollection() {
    const title = document.getElementById('bookTitle')?.value.trim() || '';
    const author = document.getElementById('bookAuthor')?.value.trim() || '';
    const year = document.getElementById('bookYear')?.value.trim() || '';
    const coverUrl = document.getElementById('coverUrl')?.value.trim() || '';
    const series = document.getElementById('series')?.value.trim() || '';
    const format = document.getElementById('format')?.value || '';
    
    // Gestion du tome/volume
    const volume = document.getElementById('volume')?.value || '';
    const customVolume = document.getElementById('customVolume')?.value || '';
    const finalVolume = volume === 'autre' ? customVolume : volume;
    
    const owned = document.getElementById('owned')?.checked || false;
    const readingTodo = document.getElementById('readingTodo')?.checked || false;
    const readingDone = document.getElementById('readingDone')?.checked || false;

    if (!title) {
        showToast('Erreur', 'Veuillez saisir un titre', 'error');
        return;
    }

    // Conversion vers le format attendu par l'API
    const status = owned ? 'library' : 'wishlist';
    let readingState = readingDone ? 'lu' : (readingTodo ? 'à lire' : 'à lire');
    
    // Si pas en bibliothèque, forcer "à lire"
    if (status !== 'library') {
        readingState = 'à lire';
    }

    const bookData = {
        google_id: null,
        title,
        author,
        isbn: null,
        pages: null,
        cover_url: coverUrl.replace(/^http:\/\//, 'https://'),
        format,
        series,
        series_number: finalVolume || null,
        status,
        reading_state: readingState
    };

    addBookToDB(bookData);
    
    // Reset du formulaire
    const form = document.getElementById('addBookForm');
    if (form) form.reset();
}

// ===============================================
// COMMUNICATION AVEC LA BASE DE DONNÉES
// ===============================================

/**
 * Charge tous les livres depuis la base de données
 */
async function loadBooksFromDB() {
    try {
        console.log('📥 Chargement des livres depuis la base...');
        
        const response = await fetch(`${API_URL}?action=list`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        
        if (!responseText) {
            throw new Error('Réponse vide du serveur');
        }

        let books;
        try {
            books = JSON.parse(responseText);
        } catch (jsonError) {
            console.error('Réponse serveur non-JSON:', responseText);
            throw new Error('Réponse serveur invalide');
        }

        if (books.error) {
            throw new Error(books.error);
        }

        // Mapping des données DB vers format frontend
        allBooks = (books || []).map(book => ({
            ...book,
            owned: book.status === 'library',
            readingDone: book.reading_state === 'lu',
            readingTodo: book.reading_state === 'à lire',
            year: book.year || book.published_year || ''
        }));

        console.log(`📚 ${allBooks.length} livres chargés avec succès`);
        
    } catch (error) {
        console.error('❌ Erreur de chargement:', error);
        showToast('Erreur', 'Impossible de charger les livres: ' + error.message, 'error');
    }
}

/**
 * Ajoute un livre en base de données
 * @param {Object} book - Données du livre
 */
async function addBookToDB(book) {
    try {
        console.log('💾 Ajout du livre:', book.title);
        
        const response = await fetch(`${API_URL}?action=add`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(book)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        
        if (!responseText) {
            throw new Error('Réponse vide du serveur');
        }

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (jsonError) {
            console.error('Réponse serveur non-JSON:', responseText);
            throw new Error('Réponse serveur invalide');
        }

        if (result.error) {
            throw new Error(result.error);
        }

        if (result.success) {
            await loadBooksFromDB();
            updateUI();
            showToast('Succès', `"${book.title}" a été ajouté à votre collection`);
        }

    } catch (error) {
        console.error('❌ Erreur d\'ajout:', error);
        showToast('Erreur', 'Impossible d\'ajouter le livre: ' + error.message, 'error');
    }
}

/**
 * Met à jour un livre en base de données
 * @param {number} id - ID du livre
 * @param {Object} updates - Données à mettre à jour
 */
async function updateBookInDB(id, updates) {
    try {
        console.log(`📝 Mise à jour du livre ID ${id}:`, updates);
        
        const response = await fetch(`${API_URL}?action=update`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id, ...updates })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        let result;
        
        try {
            result = JSON.parse(responseText);
        } catch (jsonError) {
            console.error('Réponse serveur non-JSON:', responseText);
            throw new Error('Réponse serveur invalide');
        }

        if (result.error) {
            throw new Error(result.error);
        }

        if (result.success) {
            await loadBooksFromDB();
            updateUI();
        }

    } catch (error) {
        console.error('❌ Erreur de mise à jour:', error);
        showToast('Erreur', 'Impossible de mettre à jour: ' + error.message, 'error');
    }
}

/**
 * Supprime un livre de la base de données
 * @param {number} id - ID du livre
 * @param {string} title - Titre du livre (pour la notification)
 */
async function deleteBookFromDB(id, title) {
    try {
        console.log(`🗑️ Suppression du livre ID ${id}: ${title}`);
        
        const response = await fetch(`${API_URL}?action=delete&id=${encodeURIComponent(id)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        let result;
        
        try {
            result = JSON.parse(responseText);
        } catch (jsonError) {
            console.error('Réponse serveur non-JSON:', responseText);
            throw new Error('Réponse serveur invalide');
        }

        if (result.error) {
            throw new Error(result.error);
        }

        if (result.success) {
            await loadBooksFromDB();
            updateUI();
            showToast('Supprimé', `"${title}" a été retiré de votre collection`, 'error');
        }

    } catch (error) {
        console.error('❌ Erreur de suppression:', error);
        showToast('Erreur', 'Impossible de supprimer: ' + error.message, 'error');
    }
}

// ===============================================
// AFFICHAGE ET INTERFACE UTILISATEUR
// ===============================================

/**
 * Met à jour l'affichage complet de l'interface
 */
function updateUI() {
    const ownedList = document.getElementById('ownedList');
    const wishList = document.getElementById('wishList');
    const ownedSection = document.getElementById('ownedSection');
    const wishSection = document.getElementById('wishSection');
    const groupedView = document.getElementById('groupedView');
    const seriesGroups = document.getElementById('seriesGroups');

    if (!ownedList || !wishList || !ownedSection || !wishSection || !groupedView || !seriesGroups) {
        console.warn('⚠️ Éléments DOM manquants pour la mise à jour de l\'UI');
        return;
    }

    // === RÉCUPÉRATION DES FILTRES ===
    const query = document.getElementById('librarySearch')?.value.trim().toLowerCase() || '';
    const searchType = document.getElementById('searchType')?.value || 'all';
    const filterType = document.getElementById('filterType')?.value || 'all';
    const groupBySeries = document.getElementById('sortBySeries')?.checked || false;

    // === FILTRAGE DES LIVRES ===
    let filteredBooks = allBooks.filter(book => {
        let match = true;

        // Filtre de recherche
        if (query) {
            const inTitle = (book.title || '').toLowerCase().includes(query);
            const inAuthor = (book.author || '').toLowerCase().includes(query);
            const inSeries = (book.series || '').toLowerCase().includes(query);

            if (searchType === 'title') match = inTitle;
            else if (searchType === 'author') match = inAuthor;
            else if (searchType === 'series') match = inSeries;
            else match = inTitle || inAuthor || inSeries;
        }

        // Filtre par type
        if (filterType === 'owned' && !book.owned) return false;
        if (filterType === 'wishlist' && book.owned) return false;

        return match;
    });

    // === AFFICHAGE ===
    if (groupBySeries) {
        // Affichage groupé par série
        displayGroupedBySeries(filteredBooks, ownedSection, wishSection, groupedView, seriesGroups);
    } else {
        // Affichage normal (séparé owned/wishlist)
        displayNormalView(filteredBooks, ownedList, wishList, ownedSection, wishSection, groupedView);
    }
}

/**
 * Affiche les livres groupés par série
 */
function displayGroupedBySeries(filteredBooks, ownedSection, wishSection, groupedView, seriesGroups) {
    ownedSection.style.display = 'none';
    wishSection.style.display = 'none';
    groupedView.style.display = 'block';

    const groups = {};
    filteredBooks.forEach(book => {
        const seriesKey = (book.series || '').trim() || 'Sans série';
        if (!groups[seriesKey]) groups[seriesKey] = [];
        groups[seriesKey].push(book);
    });

    const sortedSeries = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    
    seriesGroups.innerHTML = sortedSeries.map(series => {
        const books = groups[series].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        return `
            <div class="series-group">
                <h3 class="series-title">${escapeHtml(series)}</h3>
                <div class="grid">
                    ${books.map(createBookCardHTML).join('')}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Affiche les livres en vue normale (owned/wishlist séparés)
 */
function displayNormalView(filteredBooks, ownedList, wishList, ownedSection, wishSection, groupedView) {
    groupedView.style.display = 'none';
    
    const ownedBooks = filteredBooks.filter(book => book.owned);
    const wishBooks = filteredBooks.filter(book => !book.owned);

    ownedSection.style.display = ownedBooks.length ? 'block' : 'none';
    wishSection.style.display = wishBooks.length ? 'block' : 'none';

    ownedList.innerHTML = ownedBooks.map(createBookCardHTML).join('');
    wishList.innerHTML = wishBooks.map(createBookCardHTML).join('');
}

/**
 * Crée le HTML pour une carte de livre avec classes CSS différenciées
 * @param {Object} book - Données du livre
 * @returns {string} HTML de la carte
 */
function createBookCardHTML(book) {
    const statusIcon = book.owned ? '📚' : '💝';
    const statusText = book.owned ? 'Bibliothèque' : 'Wishlist';
    const statusClass = book.owned ? 'badge-library' : 'badge-wishlist';

    const readingStateIcon = book.readingDone ? '✅' : '⏰';
    const readingStateText = book.readingDone ? 'Lu' : 'À lire';
    const readingStateClass = book.readingDone ? 'badge-read' : 'badge-unread';

    const cover = book.cover_url ? 
        `<img src="${escapeHtml(book.cover_url)}" alt="Couverture ${escapeHtml(book.title)}" class="book-cover" onerror="this.style.display='none';">` :
        `<div class="book-placeholder"><span>📚</span></div>`;

    // === DÉTERMINATION DES CLASSES CSS POUR FORMAT ===
    let formatClass = '';
    let formatIcon = '';
    const format = book.format || 'broché';
    
    switch(format) {
        case 'e-book':
            formatClass = 'format-ebook';
            formatIcon = '📱';
            break;
        case 'poche':
            formatClass = 'format-poche';
            formatIcon = '📖';
            break;
        case 'broché':
            formatClass = 'format-broche';
            formatIcon = '📗';
            break;
        case 'audio':
            formatClass = 'format-audio';
            formatIcon = '🎧';
            break;
        default:
            formatClass = 'format-broche';
            formatIcon = '📗';
    }

    // === DÉTERMINATION DES CLASSES CSS ===
    let cardClass = `book-card ${formatClass}`;
    
    if (book.owned && book.readingDone) {
        cardClass += ' ma-bibliotheque-lu';
    } else if (book.owned && !book.readingDone) {
        cardClass += ' ma-bibliotheque-a-lire';
    } else if (!book.owned && (book.format === 'ebook' || book.format === 'e-book')) {
        cardClass += ' ma-wishlist-ebook';
    } else if (!book.owned) {
        cardClass += ' ma-wishlist';
    }

    // Ajout de la classe legacy pour la compatibilité
    if (book.readingDone) {
        cardClass += ' lu';
    }

    return `
        <div class="${cardClass}">
            ${cover}
            <div class="card-content book-info">
                <h3 class="book-title">${escapeHtml(book.title)}</h3>
                <p class="book-author">
                    ${escapeHtml(book.author || 'Auteur inconnu')}${book.year ? ' • ' + escapeHtml(book.year) : ''}
                </p>
                ${book.series ? `<p class="book-series" style="font-size:.85rem;opacity:.8">Série : ${escapeHtml(book.series)}${book.series_number ? ` - Tome ${escapeHtml(book.series_number)}` : ''}</p>` : ''}
                
                <div class="badges">
                    <button class="badge ${statusClass}" onclick="toggleBookStatus(${book.id})" title="Basculer Wishlist/Bibliothèque">
                        ${statusIcon} ${statusText}
                    </button>
                    ${book.owned ? `
                        <button class="badge ${readingStateClass}" onclick="toggleReadingState(${book.id})" title="Basculer Lu / À lire">
                            ${readingStateIcon} ${readingStateText}
                        </button>
                    ` : ''}
                    <select class="badge format-selector" onchange="changeBookFormat(${book.id}, this.value)" title="Changer le format">
                        <option value="broché" ${format === 'broché' ? 'selected' : ''}>📗 Broché</option>
                        <option value="poche" ${format === 'poche' ? 'selected' : ''}>📖 Poche</option>
                        <option value="e-book" ${format === 'e-book' ? 'selected' : ''}>📱 E-book</option>
                        <option value="audio" ${format === 'audio' ? 'selected' : ''}>🎧 Audio</option>
                    </select>
                    <button class="badge badge-delete" onclick="deleteBook(${book.id})" title="Supprimer définitivement">
                        🗑️ Supprimer
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===============================================
// ACTIONS SUR LES LIVRES
// ===============================================

/**
 * Bascule le statut d'un livre (Bibliothèque ↔ Wishlist)
 * @param {number} id - ID du livre
 */
function toggleBookStatus(id) {
    const book = allBooks.find(b => String(b.id) === String(id));
    if (!book) {
        console.error('Livre non trouvé:', id);
        return;
    }

    const newStatus = book.owned ? 'wishlist' : 'library';
    const newReadingState = newStatus === 'library' ? 
        (book.readingDone ? 'lu' : 'à lire') : 'à lire';

    updateBookInDB(id, { 
        status: newStatus, 
        reading_state: newReadingState 
    });
}

/**
 * Bascule l'état de lecture d'un livre (Lu ↔ À lire)
 * @param {number} id - ID du livre
 */
function toggleReadingState(id) {
    const book = allBooks.find(b => String(b.id) === String(id));
    if (!book || !book.owned) {
        console.error('Livre non trouvé ou pas en bibliothèque:', id);
        return;
    }

    const newReadingState = book.readingDone ? 'à lire' : 'lu';
    updateBookInDB(id, { 
        status: 'library', 
        reading_state: newReadingState 
    });
}

/**
 * Change le format d'un livre
 * @param {number} id - ID du livre
 * @param {string} newFormat - Nouveau format
 */
function changeBookFormat(id, newFormat) {
    const book = allBooks.find(b => String(b.id) === String(id));
    if (!book) {
        console.error('Livre non trouvé:', id);
        return;
    }

    updateBookInDB(id, { format: newFormat });
}

/**
 * Supprime définitivement un livre
 * @param {number} id - ID du livre
 */
function deleteBook(id) {
    const book = allBooks.find(b => String(b.id) === String(id));
    if (!book) {
        console.error('Livre non trouvé:', id);
        return;
    }

    if (!confirm(`Voulez-vous vraiment supprimer "${book.title}" ?\n\nCette action est irréversible.`)) {
        return;
    }

    deleteBookFromDB(id, book.title);
}

// Exposition des fonctions pour les appels inline HTML
window.toggleBookStatus = toggleBookStatus;
window.toggleReadingState = toggleReadingState;
window.changeBookFormat = changeBookFormat;
window.deleteBook = deleteBook;

// ===============================================
// UTILITAIRES
// ===============================================

/**
 * Affiche une notification toast
 * @param {string} title - Titre de la notification
 * @param {string} message - Message de la notification
 * @param {string} type - Type de notification (info, success, error)
 */
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.warn('Container de toast non trouvé');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<strong>${escapeHtml(title)}</strong><br>${escapeHtml(message)}`;

    container.appendChild(toast);

    // Animation d'entrée
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Suppression automatique après 3 secondes
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 250);
    }, 3000);
}

/**
 * Échappe les caractères HTML pour éviter les failles XSS
 * @param {string} str - Chaîne à échapper
 * @returns {string} Chaîne échappée
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return str ?? '';
    
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ===============================================
// FIN DU SCRIPT
// ===============================================

console.log('📚 Script de gestion de bibliothèque chargé et prêt !');