<?php
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/api/auth.php";
require_admin();

$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data || !isset($data["services"]) || !is_array($data["services"])) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Invalid payload"], JSON_UNESCAPED_UNICODE);
  exit;
}

$normalized = [];
foreach ($data["services"] as $idx => $service) {
  if (!is_array($service)) continue;
  $item = $service;
  $item["id"] = intval($service["id"] ?? ($idx + 1));
  $item["in_stock"] = max(0, intval($service["in_stock"] ?? 0));
  $normalized[] = $item;
}

$file = __DIR__ . "/data/services.json";
$payload = json_encode(["services" => $normalized], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
$tmp = $file . ".tmp";

if (file_put_contents($tmp, $payload, LOCK_EX) === false || !rename($tmp, $file)) {
  @unlink($tmp);
  $err = error_get_last();
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "Write failed", "details" => $err["message"] ?? null], JSON_UNESCAPED_UNICODE);
  exit;
}

echo json_encode(["ok" => true], JSON_UNESCAPED_UNICODE);
