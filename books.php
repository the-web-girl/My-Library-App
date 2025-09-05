<?php
header("Content-Type: application/json");
require "config.php";

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case "add":
            $data = json_decode(file_get_contents("php://input"), true);
            if (!$data) { echo json_encode(["error" => "Pas de données envoyées"]); exit; }

            $stmt = $pdo->prepare("INSERT INTO books 
                (google_id, title, author, isbn, pages, cover_url, format, series, series_number, status, reading_state) 
                VALUES (:google_id, :title, :author, :isbn, :pages, :cover_url, :format, :series, :series_number, :status, :reading_state)
                ON DUPLICATE KEY UPDATE
                title = VALUES(title), author = VALUES(author), pages = VALUES(pages),
                cover_url = VALUES(cover_url), format = VALUES(format), series = VALUES(series),
                series_number = VALUES(series_number), status = VALUES(status), reading_state = VALUES(reading_state)");

            $stmt->execute([
                ":google_id" => $data["google_id"],
                ":title" => $data["title"],
                ":author" => $data["author"],
                ":isbn" => $data["isbn"],
                ":pages" => $data["pages"],
                ":cover_url" => $data["cover_url"],
                ":format" => $data["format"],
                ":series" => $data["series"],
                ":series_number" => $data["series_number"],
                ":status" => $data["status"],
                ":reading_state" => $data["reading_state"]
            ]);
            echo json_encode(["success" => true]);
            break;

        case "list":
            $status = $_GET['status'] ?? null;
            $query = "SELECT * FROM books";
            if ($status) {
                $query .= " WHERE status = :status";
                $stmt = $pdo->prepare($query);
                $stmt->execute([":status" => $status]);
            } else {
                $stmt = $pdo->query($query);
            }
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case "update":
            $data = json_decode(file_get_contents("php://input"), true);
            $stmt = $pdo->prepare("UPDATE books 
                                   SET status = :status, reading_state = :reading_state 
                                   WHERE id = :id");
            $stmt->execute([
                ":status" => $data["status"],
                ":reading_state" => $data["reading_state"],
                ":id" => $data["id"]
            ]);
            echo json_encode(["success" => true]);
            break;

        case "delete":
            $id = $_GET['id'] ?? 0;
            $stmt = $pdo->prepare("DELETE FROM books WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["success" => true]);
            break;

        default:
            echo json_encode(["error" => "Action invalide"]);
    }
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
