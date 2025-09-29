<?php
$host = '';   // Serveur MySQL
$dbname = '';                  // Nom de la base
$username = '';                 // Utilisateur
$password = '' ;             // Mot de passe

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Erreur de connexion à la base de données",
        "details" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
?>