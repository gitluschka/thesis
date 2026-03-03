<?php
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/auth.php";
require_user();

function fail_with($status, $error) {
  http_response_code($status);
  echo json_encode(["ok" => false, "error" => $error], JSON_UNESCAPED_UNICODE);
  exit;
}

function parse_price($value) {
  $digits = preg_replace('/\D+/', '', (string)$value);
  return $digits ? intval($digits) : 0;
}

function parse_stock($value) {
  return max(0, intval($value ?? 0));
}

function save_services_file($file, $services) {
  $payload = json_encode(["services" => $services], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
  $tmp = $file . ".tmp";
  if (file_put_contents($tmp, $payload, LOCK_EX) === false) {
    @unlink($tmp);
    return false;
  }
  if (!rename($tmp, $file)) {
    @unlink($tmp);
    return false;
  }
  return true;
}

$stmt = $pdo->prepare("SELECT product_id, title, price, qty FROM cart_items WHERE user_id = ?");
$stmt->execute([$_SESSION['user']['id']]);
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!$items) {
  fail_with(400, "Cart empty");
}

$servicesFile = __DIR__ . "/../data/services.json";
$servicesData = json_decode(file_get_contents($servicesFile), true);
if (!is_array($servicesData) || !isset($servicesData["services"]) || !is_array($servicesData["services"])) {
  fail_with(500, "Catalog unavailable");
}

$services = $servicesData["services"];
$serviceIdxById = [];
foreach ($services as $idx => $service) {
  $serviceId = strval($service["id"] ?? "");
  if ($serviceId !== "") {
    $serviceIdxById[$serviceId] = $idx;
  }
}

$requiredByProduct = [];
$titleByProduct = [];
foreach ($items as $item) {
  $productId = strval($item["product_id"] ?? "");
  $qty = max(0, intval($item["qty"] ?? 0));
  if ($productId === "" || $qty <= 0) continue;
  if (!isset($requiredByProduct[$productId])) {
    $requiredByProduct[$productId] = 0;
  }
  $requiredByProduct[$productId] += $qty;
  if (!isset($titleByProduct[$productId])) {
    $titleByProduct[$productId] = strval($item["title"] ?? ("#" . $productId));
  }
}

foreach ($requiredByProduct as $productId => $needQty) {
  if (!array_key_exists($productId, $serviceIdxById)) {
    fail_with(400, "Товар недоступен: #" . $productId);
  }
  $idx = $serviceIdxById[$productId];
  $stock = parse_stock($services[$idx]["in_stock"] ?? 0);
  if ($stock < $needQty) {
    fail_with(400, "Недостаточно товара в наличии: " . $titleByProduct[$productId]);
  }
}

foreach ($requiredByProduct as $productId => $needQty) {
  $idx = $serviceIdxById[$productId];
  $currentStock = parse_stock($services[$idx]["in_stock"] ?? 0);
  $services[$idx]["in_stock"] = max(0, $currentStock - $needQty);
}

$total = 0;
foreach ($items as $item) {
  $total += parse_price($item["price"]) * intval($item["qty"]);
}

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM orders WHERE user_id = ?");
$countStmt->execute([$_SESSION['user']['id']]);
$ordersCount = intval($countStmt->fetchColumn());

$discount_percent = ($ordersCount === 0) ? 10 : 0;
$discount_amount = intval(round($total * $discount_percent / 100));
$final_total = max(0, $total - $discount_amount);
$total_display = number_format($final_total, 0, "", " ") . " ₽";

try {
  $pdo->beginTransaction();

  $pdo->prepare("INSERT INTO orders (user_id, total_rub, total_display) VALUES (?, ?, ?)")
      ->execute([$_SESSION['user']['id'], $final_total, $total_display]);

  $orderId = $pdo->lastInsertId();
  $orderItemStmt = $pdo->prepare("INSERT INTO order_items (order_id, product_id, title, price, qty) VALUES (?, ?, ?, ?, ?)");
  foreach ($items as $item) {
    $orderItemStmt->execute([$orderId, $item["product_id"], $item["title"], $item["price"], $item["qty"]]);
  }

  $pdo->prepare("DELETE FROM cart_items WHERE user_id = ?")->execute([$_SESSION['user']['id']]);

  if (!save_services_file($servicesFile, $services)) {
    throw new RuntimeException("Failed to update stock");
  }

  $pdo->commit();
} catch (Throwable $e) {
  if ($pdo->inTransaction()) {
    $pdo->rollBack();
  }
  fail_with(500, "Order failed");
}

echo json_encode([
  "ok" => true,
  "order_id" => $orderId,
  "total_old_rub" => $total,
  "total_final_rub" => $final_total,
  "discount_percent" => $discount_percent
]);
