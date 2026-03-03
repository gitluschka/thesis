<?php
session_start();
if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
  header("Location: account.html");
  exit;
}
?>
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Админка — Auto Detailing</title>
    <link rel="stylesheet" href="assets/css/style.css" />
    <script defer src="assets/js/api.js"></script>
    <script defer src="assets/js/nav.js"></script>
    <script defer src="assets/js/admin.js"></script>
  </head>
  <body class="theme">
    <header class="topbar">
      <div class="container topbar__inner">
        <a class="brand" href="index.html">
          <span class="brand__mark">AE</span>
          <span class="brand__text">Auto Detailing</span>
        </a>
        <nav class="nav">
          <a class="nav__link" href="index.html">Главная</a>
          <a class="nav__link" href="services.html">Каталог</a>
          <a class="nav__link" href="account.html">Кабинет</a>
          <a class="nav__link" href="contacts.html">Контакты</a>
        </nav>
      </div>
    </header>

    <main class="section">
      <div class="container">
        <div class="section__head">
          <h1>Админка</h1>
          <p>Управление товарами и заказами.</p>
        </div>

        <div class="admin-tabs">
          <button class="chip is-active" data-tab="products">Товары</button>
          <button class="chip" data-tab="orders">Заказы</button>
        </div>

        <section id="tab-products">
          <div class="admin-actions">
            <button class="btn btn--primary" id="add-service">Добавить позицию</button>
            <button class="btn btn--outline" id="save-services">Сохранить изменения</button>
            <span id="save-status" class="status"></span>
          </div>
          <div id="admin-list" class="admin-list"></div>
        </section>

        <section id="tab-orders" class="hidden">
          <div id="orders-list" class="orders-list"></div>
        </section>
      </div>
    </main>
  </body>
</html>
