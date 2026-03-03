<?php
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/auth.php";
require_user();

$stmt = $pdo->prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC");
$stmt->execute([$_SESSION['user']['id']]);
$orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(["orders" => $orders]);
