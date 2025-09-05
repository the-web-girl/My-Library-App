Prompt — 📚 Application Web Livres

Je veux développer une application web de gestion de livres avec la stack suivante :

Front-end : HTML, CSS, JavaScript natif (pas de framework).

Back-end : PHP/MySQL (hébergé chez IONOS, base gérée via phpMyAdmin).

Source de données externes : Google Books API (gratuit, sans clé obligatoire).

Fonctionnalités principales :

Recherche et auto-complétion (Google Books API)

Une barre de recherche qui interroge Google Books API.

Suggestions affichées en temps réel (auto-complétion).

En sélectionnant un livre, on affiche une fiche détaillée :

Titre, auteur(s), nombre de pages, ISBN, image de couverture.

Série & numéro (si détectés automatiquement), sinon ajout manuel.

Format : broché ou poche (choix utilisateur).

Gestion des livres dans la base MySQL

Deux sections distinctes :

Bibliothèque (livres possédés)

Wishlist (livres désirés)

Possibilité de déplacer un livre de la Wishlist vers la Bibliothèque via une case à cocher/décocher.

Options de lecture

Cases/états pour suivre la lecture :

“Pile à lire”

“Lu”

Ainsi, on distingue clairement les livres lus, en cours ou à lire.

Collections / Séries

Regrouper automatiquement les livres d’une même série.

Les afficher dans l’ordre (n°1, n°2, n°3, etc.).

Recherche interne

Une deuxième barre de recherche qui permet de chercher un livre parmi ceux déjà enregistrés (dans Bibliothèque ou Wishlist).

Enregistrement et mise à jour en base

Sauvegarde via PHP/PDO dans MySQL (IONOS).

Empêcher les doublons (par ISBN ou Google ID).

Mise à jour si un livre existe déjà.

👉 En résumé :
Développe une application web complète permettant :

d’ajouter des livres via Google Books API (avec auto-complétion),

de gérer une bibliothèque et une wishlist,

de suivre l’état de lecture (pile à lire / lu),

de distinguer les formats (broché/poche),

de regrouper les séries,

et de chercher des livres dans Google Books et dans la base enregistrée.