document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("reg-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const name = document.getElementById("reg-name").value.trim();
    const phone = document.getElementById("reg-phone").value.trim();
    const pass = document.getElementById("reg-pass").value.trim();
    const phoneNorm = phone.replace(/\D+/g, "");

    try {
      await api("api/register.php", { method: "POST", body: JSON.stringify({ name, phone: phoneNorm, password: pass }) });
    } catch (err) {
      alert(extractApiError(err, "Ошибка регистрации"));
      return;
    }

    try {
      await migrateGuestCartToServer();
    } catch {}

    alert(window.t ? window.t("register_success") : "Регистрация успешна");
    location.href = "account.html";
  });
});
