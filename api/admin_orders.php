<?php
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/auth.php";
require_admin();

$orders = $pdo->query("SELECT o.*, u.phone, u.name FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC")->fetchAll(PDO::FETCH_ASSOC);

foreach ($orders as &$o) {
  $stmt = $pdo->prepare("SELECT title, price, qty FROM order_items WHERE order_id = ?");
  $stmt->execute([$o["id"]]);
  $o["items"] = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

echo json_encode(["orders" => $orders]);
