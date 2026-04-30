/* ──────────────────────────────────────────────
   PAGE MON COMPTE
────────────────────────────────────────────── */
function renderAccountPage() {
  const form = document.getElementById("accountForm");
  if (!form || !state.user) return;

  const user = state.users.find((u) => String(u.email).toLowerCase() === String(state.user.email).toLowerCase()) || state.user;
  document.getElementById("accountFirst").value = user.first || "";
  document.getElementById("accountLast").value = user.last || "";
  document.getElementById("accountEmail").value = user.email || "";
  document.getElementById("accountPhone").value = user.phone || "";
  document.getElementById("accountPromo").value = user.promo || "";
  const newPwd = document.getElementById("accountNewPwd");
  const confirmPwd = document.getElementById("accountConfirmPwd");
  if (newPwd) newPwd.value = "";
  if (confirmPwd) confirmPwd.value = "";
}

function initAccountPage() {
  const btn = document.getElementById("btnSaveAccount");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    if (!state.user) return;
    const newPwd = document.getElementById("accountNewPwd")?.value.trim() || "";
    const confirmPwd = document.getElementById("accountConfirmPwd")?.value.trim() || "";
    const updates = {
      first: document.getElementById("accountFirst").value.trim(),
      last: document.getElementById("accountLast").value.trim(),
      phone: document.getElementById("accountPhone").value.trim(),
      promo: document.getElementById("accountPromo").value
    };
    if (!updates.first || !updates.last || !updates.promo) {
      showToast("⚠️ Complète prénom, nom et promotion");
      return;
    }
    if (newPwd || confirmPwd) {
      if (newPwd.length < 6) {
        showToast("⚠️ Le nouveau mot de passe doit faire au moins 6 caractères");
        return;
      }
      if (newPwd !== confirmPwd) {
        showToast("⚠️ Les deux mots de passe ne correspondent pas");
        return;
      }
      updates.pwd = newPwd;
    }
    btn.disabled = true;
    btn.textContent = "Sauvegarde…";
    await updateCurrentUser(updates);
    onLogin();
    renderAccountPage();
    showToast(updates.pwd ? "✅ Compte et mot de passe mis à jour" : "✅ Compte mis à jour");
    btn.disabled = false;
    btn.textContent = "Sauvegarder mes informations";
  });
}
