# 📚 Projet — Application Web de Gestion de Livres

## 🚀 Stack technique
- **Front-end** : HTML, CSS, JavaScript natif *(sans framework JS)*  
- **Back-end** : PHP / MySQL *(hébergé chez IONOS, base gérée via phpMyAdmin)*  
- **Source de données externes** : [Google Books API](https://developers.google.com/books) *(gratuit, sans clé obligatoire)*  

---

## ✨ Fonctionnalités principales

### 🔍 Recherche et auto-complétion (Google Books API)
- Barre de recherche interrogeant **Google Books API**  
- Suggestions affichées en **temps réel** *(auto-complétion)*  
- En sélectionnant un livre, affichage d’une **fiche détaillée** :  
  - Titre  
  - Auteur(s)  
  - Nombre de pages  
  - ISBN  
  - Image de couverture  
  - Série & numéro *(si détectés automatiquement, sinon ajout manuel)*  
  - Format : **broché** ou **poche** *(choix utilisateur)*  

---

### 📚 Gestion des livres dans la base MySQL
Deux sections distinctes :
- **Bibliothèque** *(livres possédés)*  
- **Wishlist** *(livres désirés)*  

➡️ Possibilité de déplacer un livre de la **Wishlist** vers la **Bibliothèque** via une case à cocher/décocher.  

---

### 📖 Options de lecture
États de lecture disponibles :
- 🕮 **Pile à lire**  
- ✅ **Lu**  

➡️ Distinction claire entre les livres *lus*, *en cours* ou *à lire*.  

---

### 📂 Collections / Séries
- Regroupement automatique des livres d’une même **série**  
- Affichage dans l’ordre logique *(n°1, n°2, n°3…)*  

---

### 🔎 Recherche interne
- Une deuxième barre de recherche permettant de chercher un livre **parmi ceux déjà enregistrés**  
  *(Bibliothèque ou Wishlist)*  

---

### 💾 Enregistrement et mise à jour en base
- Sauvegarde via **PHP/PDO** dans **MySQL (IONOS)**  
- Protection contre les **doublons** *(par ISBN ou Google ID)*  
- Mise à jour automatique si le livre existe déjà  

---

## ✅ En résumé
Cette application web permet de :
- Ajouter des livres via **Google Books API** *(avec auto-complétion)*  
- Gérer une **bibliothèque** et une **wishlist**  
- Suivre l’**état de lecture** *(pile à lire / lu)*  
- Distinguer les **formats** *(broché/poche)*  
- Regrouper automatiquement les **séries**  
- Effectuer des recherches dans **Google Books** et dans la base locale *(MySQL)*  

---
