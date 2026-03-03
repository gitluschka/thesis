<?php
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/auth.php";
require_admin();

function fail_upload($code, $message, $details = null) {
  http_response_code($code);
  $payload = ["ok" => false, "error" => $message];
  if ($details !== null && $details !== "") {
    $payload["details"] = $details;
  }
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

function normalize_files_input($entry) {
  if (!is_array($entry) || !isset($entry["name"])) {
    return [];
  }

  if (!is_array($entry["name"])) {
    return [$entry];
  }

  $files = [];
  $count = count($entry["name"]);
  for ($i = 0; $i < $count; $i++) {
    $files[] = [
      "name" => $entry["name"][$i] ?? "",
      "type" => $entry["type"][$i] ?? "",
      "tmp_name" => $entry["tmp_name"][$i] ?? "",
      "error" => $entry["error"][$i] ?? UPLOAD_ERR_NO_FILE,
      "size" => $entry["size"][$i] ?? 0
    ];
  }
  return $files;
}

function detect_image_mime($tmpName) {
  $imageInfo = @getimagesize($tmpName);
  if (is_array($imageInfo) && isset($imageInfo["mime"]) && is_string($imageInfo["mime"])) {
    return $imageInfo["mime"];
  }

  if (function_exists("finfo_open")) {
    $finfo = @finfo_open(FILEINFO_MIME_TYPE);
    if ($finfo !== false) {
      $mime = @finfo_file($finfo, $tmpName);
      @finfo_close($finfo);
      if (is_string($mime) && $mime !== "") {
        return $mime;
      }
    }
  }

  if (function_exists("mime_content_type")) {
    $mime = @mime_content_type($tmpName);
    if (is_string($mime) && $mime !== "") {
      return $mime;
    }
  }

  return "";
}

$incoming = $_FILES["images"] ?? ($_FILES["image"] ?? null);
$files = normalize_files_input($incoming);
if (!$files) {
  fail_upload(400, "Файл не передан");
}

$allowedMimeToExt = [
  "image/jpeg" => "jpg",
  "image/png" => "png",
  "image/webp" => "webp",
  "image/gif" => "gif",
  "image/avif" => "avif"
];

$maxSizeBytes = 10 * 1024 * 1024;
$uploadDir = __DIR__ . "/../assets/uploads/products";
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true)) {
  fail_upload(500, "Не удалось создать папку загрузок");
}

if (!is_writable($uploadDir)) {
  fail_upload(500, "Папка загрузок недоступна для записи");
}

$urls = [];
foreach ($files as $file) {
  $errCode = intval($file["error"] ?? UPLOAD_ERR_NO_FILE);
  if ($errCode !== UPLOAD_ERR_OK) {
    fail_upload(400, "Ошибка загрузки файла", "code=" . $errCode);
  }

  $tmpName = strval($file["tmp_name"] ?? "");
  if ($tmpName === "" || !is_uploaded_file($tmpName)) {
    fail_upload(400, "Некорректный временный файл");
  }

  $size = intval($file["size"] ?? 0);
  if ($size <= 0 || $size > $maxSizeBytes) {
    fail_upload(400, "Недопустимый размер файла (до 10MB)");
  }

  $mime = detect_image_mime($tmpName);
  if (!is_string($mime) || !isset($allowedMimeToExt[$mime])) {
    fail_upload(400, "Поддерживаются только JPG, PNG, WEBP, GIF, AVIF");
  }

  $baseName = pathinfo(strval($file["name"] ?? "image"), PATHINFO_FILENAME);
  $safeBase = preg_replace('/[^a-zA-Z0-9_-]+/', "-", $baseName);
  $safeBase = trim(strval($safeBase), "-");
  if ($safeBase === "") {
    $safeBase = "image";
  }

  try {
    $suffix = bin2hex(random_bytes(5));
  } catch (Exception $e) {
    $suffix = strval(mt_rand(100000, 999999));
  }

  $extension = $allowedMimeToExt[$mime];
  $filename = date("Ymd-His") . "-" . $suffix . "-" . $safeBase . "." . $extension;
  $destination = $uploadDir . "/" . $filename;

  if (!move_uploaded_file($tmpName, $destination)) {
    fail_upload(500, "Не удалось сохранить файл");
  }

  @chmod($destination, 0644);
  $urls[] = "/assets/uploads/products/" . $filename;
}

echo json_encode(["ok" => true, "urls" => $urls], JSON_UNESCAPED_UNICODE);
