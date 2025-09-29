<?php
header("Content-Type: text/plain; charset=utf-8");

// Inclure la connexion PDO
require "config.php";

try {
    echo "✅ Connexion réussie à la base de données.\n\n";

    // Vérifier si on voit des tables
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if ($tables) {
        echo "📋 Tables disponibles :\n";
        foreach ($tables as $table) {
            echo " - " . $table . "\n";
        }
    } else {
        echo "⚠️ Aucune table trouvée dans cette base.\n";
    }
} catch (Exception $e) {
    echo "❌ Erreur : " . $e->getMessage();
}