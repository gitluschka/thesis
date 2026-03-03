<?php
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/auth.php";
if (!isset($_SESSION['user'])) {
  echo json_encode(null);
  exit;
}
echo json_encode($_SESSION['user']);
