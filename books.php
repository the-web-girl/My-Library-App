<?php

// books.php - API REST pour la gestion des livres
declare(strict_types=1);

// Headers CORS et JSON
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Gestion des requêtes préflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Inclusion de la configuration
require_once __DIR__ . '/config.php';

// Fonction utilitaire pour les réponses JSON
function jsonResponse($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Récupération de l'action demandée
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'list':
            // Récupération de tous les livres
            $status = $_GET['status'] ?? null;
            
            if ($status && in_array($status, ['wishlist', 'library'])) {
                $stmt = $pdo->prepare("SELECT * FROM books WHERE status = :status ORDER BY title");
                $stmt->execute([':status' => $status]);
            } else {
                $stmt = $pdo->query("SELECT * FROM books ORDER BY title");
            }
            
            $books = $stmt->fetchAll();
            jsonResponse($books);
            break;

        case 'add':
            // Ajout d'un nouveau livre
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                jsonResponse(['error' => 'Données JSON invalides'], 400);
            }

            // Validation des données requises
            if (empty($input['title'])) {
                jsonResponse(['error' => 'Le titre est requis'], 400);
            }

            // Mapping des valeurs frontend -> backend
            $status = $input['status'] ?? 'wishlist';
            if ($status === 'owned') $status = 'library';
            if (!in_array($status, ['wishlist', 'library'])) $status = 'wishlist';

            $reading_state = $input['reading_state'] ?? 'à lire';
            if ($reading_state === 'todo') $reading_state = 'à lire';
            if ($reading_state === 'done') $reading_state = 'lu';
            if (!in_array($reading_state, ['à lire', 'lu'])) $reading_state = 'à lire';

            // Si pas en bibliothèque, forcer "à lire"
            if ($status !== 'library') $reading_state = 'à lire';

            $stmt = $pdo->prepare("
                INSERT INTO books (
                    google_id, title, author, isbn, pages, cover_url, 
                    format, series, series_number, status, reading_state
                ) VALUES (
                    :google_id, :title, :author, :isbn, :pages, :cover_url,
                    :format, :series, :series_number, :status, :reading_state
                ) ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    author = VALUES(author),
                    pages = VALUES(pages),
                    cover_url = VALUES(cover_url),
                    format = VALUES(format),
                    series = VALUES(series),
                    series_number = VALUES(series_number),
                    status = VALUES(status),
                    reading_state = VALUES(reading_state)
            ");

            $result = $stmt->execute([
                ':google_id' => $input['google_id'] ?? null,
                ':title' => trim($input['title']),
                ':author' => trim($input['author'] ?? 'Auteur inconnu'),
                ':isbn' => $input['isbn'] ?? null,
                ':pages' => isset($input['pages']) ? (int)$input['pages'] : null,
                ':cover_url' => $input['cover_url'] ?? null,
                ':format' => $input['format'] ?? null,
                ':series' => $input['series'] ?? null,
                ':series_number' => $input['series_number'] ?? null,
                ':status' => $status,
                ':reading_state' => $reading_state
            ]);

            if ($result) {
                jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()]);
            } else {
                jsonResponse(['error' => 'Erreur lors de l\'ajout'], 500);
            }
            break;

        case 'update':
            // Mise à jour d'un livre
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || !isset($input['id'])) {
                jsonResponse(['error' => 'ID requis'], 400);
            }

            $id = (int)$input['id'];
            if ($id <= 0) {
                jsonResponse(['error' => 'ID invalide'], 400);
            }

            $fields = [];
            $params = [':id' => $id];

            // Gestion du statut
            if (array_key_exists('status', $input)) {
                $status = $input['status'];
                if ($status === 'owned') $status = 'library';
                if (in_array($status, ['wishlist', 'library'])) {
                    $fields[] = 'status = :status';
                    $params[':status'] = $status;
                }
            }

            // Gestion de l'état de lecture
            if (array_key_exists('reading_state', $input)) {
                $reading_state = $input['reading_state'];
                if ($reading_state === 'todo') $reading_state = 'à lire';
                if ($reading_state === 'done') $reading_state = 'lu';
                if (in_array($reading_state, ['à lire', 'lu'])) {
                    $fields[] = 'reading_state = :reading_state';
                    $params[':reading_state'] = $reading_state;
                }
            }

            if (empty($fields)) {
                jsonResponse(['error' => 'Aucune donnée à mettre à jour'], 400);
            }

            $sql = "UPDATE books SET " . implode(', ', $fields) . " WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $result = $stmt->execute($params);

            if ($result) {
                jsonResponse(['success' => true]);
            } else {
                jsonResponse(['error' => 'Erreur lors de la mise à jour'], 500);
            }
            break;

        case 'delete':
            // Suppression d'un livre
            $id = (int)($_GET['id'] ?? 0);
            
            if ($id <= 0) {
                jsonResponse(['error' => 'ID invalide'], 400);
            }

            $stmt = $pdo->prepare("DELETE FROM books WHERE id = :id");
            $result = $stmt->execute([':id' => $id]);

            if ($result) {
                jsonResponse(['success' => true]);
            } else {
                jsonResponse(['error' => 'Erreur lors de la suppression'], 500);
            }
            break;

        default:
            jsonResponse(['error' => 'Action non supportée'], 400);
    }

} catch (Exception $e) {
    error_log("Erreur dans books.php: " . $e->getMessage());
    jsonResponse([
        'error' => 'Erreur serveur',
        'details' => $e->getMessage()
    ], 500);
}
?>