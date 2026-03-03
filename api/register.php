<?php
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/auth.php";

$data = json_decode(file_get_contents("php://input"), true);
$phone = trim($data["phone"] ?? "");
$name = trim($data["name"] ?? "");
$password = trim($data["password"] ?? "");
$phoneNorm = preg_replace('/\D+/', '', $phone);

if (!$phoneNorm || !$password) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Phone and password required"]);
  exit;
}

$check = $pdo->prepare("SELECT id FROM users WHERE phone = ? LIMIT 1");
$check->execute([$phoneNorm]);
if ($check->fetch(PDO::FETCH_ASSOC)) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Пользователь занят"]);
  exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);

try {
  $stmt = $pdo->prepare("INSERT INTO users (phone, name, password_hash) VALUES (?, ?, ?)");
  $stmt->execute([$phoneNorm, $name, $hash]);
  $_SESSION['user'] = ["id" => $pdo->lastInsertId(), "phone" => $phoneNorm, "name" => $name, "role" => "user"];
  echo json_encode(["ok" => true]);
} catch (Exception $e) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Пользователь занят"]);
}
