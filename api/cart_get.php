<?php
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/auth.php";
require_user();

$stmt = $pdo->prepare("SELECT product_id, title, price, qty FROM cart_items WHERE user_id = ?");
$stmt->execute([$_SESSION['user']['id']]);
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(["items" => $items]);
