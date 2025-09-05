async function addBook(book) {
  let response = await fetch("books.php?action=add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(book)
  });
  let result = await response.json();
  console.log(result);
}

// Exemple d'objet à envoyer
addBook({
  google_id: "abcd1234",
  title: "1984",
  author: "George Orwell",
  isbn: "0451524934",
  pages: 328,
  cover_url: "https://example.com/cover.jpg",
  format: "poche",
  series: "Classiques",
  series_number: 1,
  status: "wishlist",
  reading_state: "a_lire"
});

async function getBooks(status = null) {
  let url = "books.php?action=list";
  if (status) url += "&status=" + status;
  let response = await fetch(url);
  let books = await response.json();
  console.log(books);
}

getBooks("wishlist"); // Liste seulement la wishlist
