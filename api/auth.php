<?php
require __DIR__ . "/bootstrap.php";
session_start();

function current_user() {
  return $_SESSION['user'] ?? null;
}

function require_user() {
  if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(["ok" => false, "error" => "Unauthorized"]);
    exit;
  }
}

function require_admin() {
  require_user();
  if ($_SESSION['user']['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["ok" => false, "error" => "Forbidden"]);
    exit;
  }
}
