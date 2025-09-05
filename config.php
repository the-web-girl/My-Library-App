<?php
$host = "db5018565227.hosting-data.io";// ex: db5001234567.hosting-data.io
$dbname = "dbs14733181";// le nom de ta base sur IONOS
$username = "dbu3457040";// ton utilisateur MySQL
$password = "W1nch3rst3r!-";// ton mot de passench

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Erreur connexion : " . $e->getMessage());
}
?>
