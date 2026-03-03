<?php
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/auth.php";
require_user();

$data = json_decode(file_get_contents("php://input"), true);
$items = $data["items"] ?? [];

$pdo->prepare("DELETE FROM cart_items WHERE user_id = ?")->execute([$_SESSION['user']['id']]);

$stmt = $pdo->prepare("INSERT INTO cart_items (user_id, product_id, title, price, qty) VALUES (?, ?, ?, ?, ?)");
foreach ($items as $item) {
  $stmt->execute([$_SESSION['user']['id'], $item["product_id"], $item["title"], $item["price"], $item["qty"]]);
}

echo json_encode(["ok" => true]);
