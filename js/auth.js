/* ──────────────────────────────────────────────
   AUTHENTIFICATION
────────────────────────────────────────────── */

document.getElementById("btnDoRegister").addEventListener("click", async () => {
  const first = document.getElementById("regFirst").value.trim();
  const last  = document.getElementById("regLast").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const promo = document.getElementById("regPromo").value;
  const pwd   = document.getElementById("regPwd").value.trim();
  const terms = document.getElementById("regTerms").checked;

  if (!first || !last) { showToast("⚠️ Renseigne ton prénom et ton nom"); return; }
  if (!isValidEmail(email)) { showToast("⚠️ Adresse email invalide"); return; }
  if (!phone || phone.length < 10) { showToast("⚠️ Numéro de téléphone invalide (10 chiffres min.)"); return; }
  if (!promo) { showToast("⚠️ Sélectionne ta promotion"); return; }
  if (pwd.length < 6) { showToast("⚠️ Mot de passe trop court (6 min.)"); return; }
  if (!terms) { showToast("⚠️ Accepte les conditions d'utilisation"); return; }

  const btnReg = document.getElementById("btnDoRegister");
  btnReg.textContent = "Inscription en cours…";
  btnReg.disabled = true;

  try {
    await loadUsers();

    if (state.users.some((u) => String(u.email || "").trim().toLowerCase() === email.toLowerCase())) {
      showToast("⚠️ Ce compte existe déjà");
      return;
    }

    const role = promo === "Admin" ? "admin" : "user";
    const newUser = { first, last, email, phone, promo, pwd, role, createdAt: new Date().toISOString() };

    await saveNewUser(newUser);

    state.user = { first, last, email, promo, role };
    closeModal("modalRegister");
    onLogin();
    saveSession();
    showToast(`🌿 Bienvenue sur MovePNS, ${first} !`);
  } catch (err) {
    console.error("Erreur inscription :", err);
    showToast("⚠️ Erreur lors de l'inscription");
  } finally {
    btnReg.textContent = "Créer mon compte 🌿";
    btnReg.disabled = false;
  }
});

document.getElementById("btnDoLogin").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const pwd   = document.getElementById("loginPwd").value.trim();

  if (!isValidEmail(email)) { showToast("⚠️ Email invalide"); return; }
  if (pwd.length < 3) { showToast("⚠️ Mot de passe incorrect"); return; }

  const btnLog = document.getElementById("btnDoLogin");
  btnLog.textContent = "Connexion…";
  btnLog.disabled = true;

  try {
    await loadUsers();

    const found = state.users.find((u) =>
      String(u.email || "").trim().toLowerCase() === email.toLowerCase() &&
      String(u.pwd || "").trim() === pwd
    );

    console.log("Users chargés :", state.users);
    console.log("Email saisi :", email);
    console.log("Mot de passe saisi :", pwd);
    console.log("Utilisateur trouvé :", found);

    if (!found) {
      showToast("⚠️ Identifiants incorrects ou compte inexistant");
      return;
    }

    state.user = {
      first: found.first,
      last: found.last,
      email: found.email,
      promo: found.promo,
      role: found.role
    };

    closeModal("modalLogin");
    onLogin();
    showToast("✅ Connexion réussie !");
    saveSession();
  } catch (err) {
    console.error("Erreur connexion :", err);
    showToast("⚠️ Erreur lors de la connexion");
  } finally {
    btnLog.textContent = "Se connecter";
    btnLog.disabled = false;
  }
});

function onLogin() {
  const navActions = document.querySelector(".nav-actions");
  navActions.innerHTML = `
    <button class="btn-ghost account-shortcut" id="btnAccountShortcut">👤 ${state.user.first}${state.user.role === 'admin' ? ' (admin)' : ''}</button>
    <button class="btn-ghost" id="btnLogout">Déconnexion</button>
  `;
  document.getElementById("btnLogout").addEventListener("click", logout);
  document.getElementById("btnAccountShortcut").addEventListener("click", () => navigateTo("account"));

  const adminLink = document.querySelector(".nav-link-admin");
  if (state.user.role === "admin") {
    adminLink.style.display = "inline-flex";
    adminLink.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo("admin");
      renderAdminPanel();
    });
  } else {
    adminLink.style.display = "none";
  }

  const tripsLink = document.querySelector(".nav-link-trips");
  tripsLink.style.display = "inline-flex";
  tripsLink.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("trips");
    renderMyTrips();
  });

  ["account", "chat"].forEach((name) => {
    const link = document.querySelector(".nav-link-" + name);
    if (link) {
      link.style.display = "inline-flex";
      link.addEventListener("click", (e) => { e.preventDefault(); navigateTo(name); });
    }
  });

  loadOffers();
  renderOffers(state.offers);
}

function logout() {
  state.user = null;
  clearSession();
  state.offers = [];

  const adminLink = document.querySelector(".nav-link-admin");
  if (adminLink) adminLink.style.display = "none";

  const tripsLink = document.querySelector(".nav-link-trips");
  if (tripsLink) tripsLink.style.display = "none";
  const accountLink = document.querySelector(".nav-link-account");
  const chatLink = document.querySelector(".nav-link-chat");
  if (accountLink) accountLink.style.display = "none";
  if (chatLink) chatLink.style.display = "none";

  const navActions = document.querySelector(".nav-actions");
  navActions.innerHTML = `
    <button class="btn-ghost" id="btnLogin">Se connecter</button>
    <button class="btn-primary" id="btnRegister">S'inscrire</button>
  `;

  document.getElementById("btnLogin").addEventListener("click", () => openModal("modalLogin"));
  document.getElementById("btnRegister").addEventListener("click", () => openModal("modalRegister"));

  navigateTo("home");
  showToast("👋 À bientôt !");
}


/* ──────────────────────────────────────────────
   SESSION PERSISTANTE (localStorage)
────────────────────────────────────────────── */

function saveSession() {
  if (state.user) {
    localStorage.setItem("movepns_session", JSON.stringify(state.user));
  }
}

function clearSession() {
  localStorage.removeItem("movepns_session");
}

function restoreSession() {
  try {
    const raw = localStorage.getItem("movepns_session");
    if (!raw) return false;
    const user = JSON.parse(raw);
    if (!user || !user.email) return false;
    state.user = user;
    return true;
  } catch (e) {
    return false;
  }
}
