function tr(key) {
  return window.t ? window.t(key) : key;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function accountTemplate(me, orders) {
  if (!me) {
    return `
      <div class="card">
        <h3>${tr("account_login")}</h3>
        <div class="auth-form">
          <label>${tr("account_login_field")}<input id="login-phone" type="text" /></label>
          <label>${tr("account_password")}<input id="login-pass" type="password" /></label>
          <button id="login-btn" class="btn btn--primary">${tr("account_login_btn")}</button>
          <a class="auth-register-link" href="register.html?v=20260303-1805" data-i18n="account_register_link">${tr("account_register_link")}</a>
        </div>
      </div>
    `;
  }

  const ordersHtml = orders.length
    ? orders
        .map(
          (o) =>
            `<li>${escapeHtml(tr("account_order_prefix"))} #${escapeHtml(o.id)} — ${escapeHtml(o.total_display)} — ${escapeHtml(o.created_at)}</li>`
        )
        .join("")
    : `<li>${tr("account_no_orders")}</li>`;

  const safeName = escapeHtml(me.name);
  const safePhone = escapeHtml(me.phone);
  const safeRole = escapeHtml(me.role);

  return `
    <div class="card">
      <h3>${tr("account_profile")}</h3>
      <p><strong>${tr("account_name")}:</strong> ${safeName}</p>
      <p><strong>${tr("account_phone")}:</strong> ${safePhone}</p>
      <p><strong>${tr("account_role")}:</strong> ${safeRole}</p>
      <button id="logout-btn" class="btn btn--outline">${tr("account_logout")}</button>
      ${me.role === "admin" ? '<a class="btn btn--primary" href="admin.php">Admin</a>' : ""}
    </div>
    <div class="card">
      <h3>${tr("account_orders")}</h3>
      <ul>${ordersHtml}</ul>
    </div>
  `;
}

async function renderAccount() {
  const panel = document.getElementById("account-panel");
  if (!panel) return;
  let me = await getMe();
  let orders = [];

  if (me) {
    try {
      const data = await api("api/orders.php");
      orders = data.orders || [];
    } catch {
      orders = [];
    }
  }

  panel.innerHTML = accountTemplate(me, orders);

  if (!me) {
    document.getElementById("login-btn").addEventListener("click", async () => {
      const phone = document.getElementById("login-phone").value.trim();
      const pass = document.getElementById("login-pass").value.trim();
      const phoneNorm = phone.replace(/\D+/g, "");
      try {
        await api("api/login.php", { method: "POST", body: JSON.stringify({ phone: phoneNorm, password: pass }) });
      } catch (err) {
        alert(extractApiError(err, tr("login_invalid")));
        return;
      }
      try {
        await migrateGuestCartToServer();
      } catch {}
      location.reload();
    });
  } else {
    document.getElementById("logout-btn").addEventListener("click", async () => {
      await api("api/logout.php", { method: "POST", body: JSON.stringify({}) });
      location.reload();
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await renderAccount();
  document.addEventListener("languageChanged", renderAccount);
});
