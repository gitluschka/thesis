<?php
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/api/auth.php";
require_admin();

function fail_save($message, $details = null, $code = 500) {
  http_response_code($code);
  $payload = ["ok" => false, "error" => $message];
  if ($details !== null && $details !== "") {
    $payload["details"] = $details;
  }
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data || !isset($data["services"]) || !is_array($data["services"])) {
  fail_save("Invalid payload", null, 400);
}

$normalized = [];
foreach ($data["services"] as $idx => $service) {
  if (!is_array($service)) continue;
  $item = $service;
  $item["id"] = intval($service["id"] ?? ($idx + 1));
  $item["in_stock"] = max(0, intval($service["in_stock"] ?? 0));
  $normalized[] = $item;
}

$dataDir = __DIR__ . "/data";
if (!is_dir($dataDir) && !mkdir($dataDir, 0775, true)) {
  $err = error_get_last();
  fail_save("Write failed", $err["message"] ?? "Cannot create data directory");
}

$file = $dataDir . "/services.json";
$payload = json_encode(["services" => $normalized], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

if ($payload === false) {
  fail_save("Write failed", "JSON encode failed");
}

if (file_put_contents($file, $payload, LOCK_EX) === false) {
  $err = error_get_last();
  fail_save("Write failed", $err["message"] ?? "Cannot write services file");
}

@chmod($file, 0664);
echo json_encode(["ok" => true], JSON_UNESCAPED_UNICODE);
