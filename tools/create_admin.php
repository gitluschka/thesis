<?php
require __DIR__ . "/../api/bootstrap.php";

if ($argc < 3) {
  echo "Usage: php tools/create_admin.php PHONE PASSWORD [NAME]\n";
  exit(1);
}

$phone = $argv[1];
$pass = $argv[2];
$name = $argv[3] ?? "Admin";

$hash = password_hash($pass, PASSWORD_DEFAULT);

$pdo->prepare("INSERT OR REPLACE INTO users (phone, name, password_hash, role) VALUES (?, ?, ?, 'admin')")
    ->execute([$phone, $name, $hash]);

echo "Admin created: $phone\n";
