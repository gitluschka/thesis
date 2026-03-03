<?php
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/auth.php";

$data = json_decode(file_get_contents("php://input"), true);
$phone = trim($data["phone"] ?? "");
$password = trim($data["password"] ?? "");
$phoneNorm = preg_replace('/\D+/', '', $phone);

$stmt = $pdo->prepare("SELECT * FROM users WHERE phone = ? LIMIT 1");
$stmt->execute([$phoneNorm]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// Fallback for legacy rows with non-normalized phone format.
if (!$user) {
  $users = $pdo->query("SELECT * FROM users")->fetchAll(PDO::FETCH_ASSOC);
  foreach ($users as $candidate) {
    $norm = preg_replace('/\D+/', '', (string)$candidate["phone"]);
    if ($norm !== '' && $norm === $phoneNorm) {
      $user = $candidate;
      break;
    }
  }
}

if (!$user || !password_verify($password, $user["password_hash"])) {
  http_response_code(401);
  echo json_encode(["ok" => false, "error" => "Пользователь не найден или введен неправильный пароль"]);
  exit;
}

$_SESSION['user'] = ["id" => $user["id"], "phone" => $user["phone"], "name" => $user["name"], "role" => $user["role"]];
echo json_encode(["ok" => true]);
