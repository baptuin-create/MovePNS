/* ═══════════════════════════════════════════════
   MOVEPNS – app.js
   Logique : Navigation · Auth · Trajets · CO₂
   Stockage : Google Sheets via Apps Script
   
═══════════════════════════════════════════════ */

"use strict";

/* ──────────────────────────────────────────────
   ⚙️  CONFIGURATION – À MODIFIER APRÈS DÉPLOIEMENT
   Colle ici l'URL obtenue depuis Google Apps Script
────────────────────────────────────────────── */
const GAS_URL = "https://script.google.com/macros/s/AKfycbwf07AQeDhYZ3lqyLXb597EZyacr7zc35yxEm4IByqC-deKi5rjzsh-2BBy98O6J1up/exec";
// Exemple : "https://script.google.com/macros/s/AKfycbx.../exec"

/* ──────────────────────────────────────────────
   STATE
────────────────────────────────────────────── */
const state = {
  user: null,
  offers: [],
  users: [],
};

/* ──────────────────────────────────────────────
   COUCHE GOOGLE SHEETS
   Toutes les lectures/écritures passent par ici
────────────────────────────────────────────── */

/** Appel générique vers Google Apps Script */
async function gasCall(payload) {
  if (!GAS_URL || GAS_URL === "COLLE_TON_URL_ICI") {
    // Fallback localStorage si l'URL n'est pas configurée
    return null;
  }
  try {
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" }, // requis pour éviter le CORS preflight
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.warn("Google Sheets inaccessible, fallback localStorage", err);
    return null;
  }
}

/** Charge les utilisateurs (Sheets → state.users) */
async function loadUsers() {
  const raw = localStorage.getItem("mpnsUsers");
  state.users = raw ? JSON.parse(raw) : [];

  const data = await gasCall({ action: "getUsers" });
  if (data && data.ok) {
    state.users = data.users;
    localStorage.setItem("mpnsUsers", JSON.stringify(state.users));
  }
}

/** Sauvegarde un nouvel utilisateur (state → Sheets + localStorage) */
async function saveNewUser(user) {
  state.users.push(user);
  localStorage.setItem("mpnsUsers", JSON.stringify(state.users));
  await gasCall({ action: "addUser", user });
}

/** Charge les trajets (Sheets → state.offers) */
async function loadOffers() {
  // D'abord le cache local pour affichage immédiat
  const raw = localStorage.getItem("mpnsOffers");
  state.offers = raw ? JSON.parse(raw) : [...DEMO_OFFERS];

  const data = await gasCall({ action: "getOffers" });
  if (data && data.ok && data.offers.length > 0) {
    state.offers = data.offers;
    localStorage.setItem("mpnsOffers", JSON.stringify(state.offers));
  }
}

/** Sauvegarde un nouveau trajet (state → Sheets + localStorage) */
async function saveNewOffer(offer) {
  state.offers.unshift(offer);
  localStorage.setItem("mpnsOffers", JSON.stringify(state.offers));
  await gasCall({ action: "addOffer", offer });
}

/** Met à jour le statut d'une demande (state → Sheets + localStorage) */
async function updateRequest(offerId, reqIdx, updates) {
  const offer = state.offers.find((o) => o.id === offerId);
  if (!offer) return;
  Object.assign(offer.requests[reqIdx], updates);
  localStorage.setItem("mpnsOffers", JSON.stringify(state.offers));
  await gasCall({ action: "updateOffer", offer });
}

/** Supprime un trajet (state → Sheets + localStorage) */
async function deleteOffer(offerId) {
  state.offers = state.offers.filter((o) => o.id !== offerId);
  localStorage.setItem("mpnsOffers", JSON.stringify(state.offers));
  await gasCall({ action: "deleteOffer", offerId });
}

/* ──────────────────────────────────────────────
   DONNÉES DE DÉMONSTRATION
────────────────────────────────────────────── */
const DEMO_OFFERS = [
  {
    id: 1,
    driver: "Sophie M.",
    avatar: "👩",
    from: "Résidence Les Collines, Nice",
    time: "07h30",
    seats: 2,
    recur: "Quotidien",
    distance: 28,
    promo: "3ème année",
    rating: 4.9,
    note: "Je passe par l'A8 – point de RDV à la station BP de Nice Nord.",
    driverEmail: "sophie.m@polytech.fr",
    requests: []
  },
  {
    id: 2,
    driver: "Théo B.",
    avatar: "👨",
    from: "Antibes – centre-ville",
    time: "08h00",
    seats: 3,
    recur: "Lun. Mer. Ven.",
    distance: 14,
    promo: "2ème année",
    tel: "06 12 34 56 78",
    note: "Départ depuis la place du Général de Gaulle à Antibes.",
    driverEmail: "theo.b@polytech.fr",
    requests: []
  },
  {
    id: 3,
    driver: "Camille R.",
    avatar: "🧑",
    from: "Cagnes-sur-Mer, gare SNCF",
    time: "07h45",
    seats: 1,
    recur: "Quotidien",
    distance: 10,
    promo: "Master 1",
    rating: 5.0,
    note: "Dépose directement à l'entrée de l'école.",
    driverEmail: "camille.r@polytech.fr",
    requests: []
  },
  {
    id: 4,
    driver: "Léa D.",
    avatar: "👩",
    from: "Valbonne – Sophia Village",
    time: "08h15",
    seats: 2,
    recur: "Mardi & Jeudi",
    distance: 5,
    promo: "1ère année",
    rating: 4.8,
    note: "",
    driverEmail: "lea.d@polytech.fr",
    requests: []
  },
  {
    id: 5,
    driver: "Maxime P.",
    avatar: "👨",
    from: "Villeneuve-Loubet",
    time: "07h20",
    seats: 3,
    recur: "Quotidien",
    distance: 18,
    promo: "Master 2",
    rating: 4.6,
    note: "Arrivée garantie avant 8h.",
    driverEmail: "maxime.p@polytech.fr",
    requests: []
  },
];

/* ──────────────────────────────────────────────
   UTILITAIRES
────────────────────────────────────────────── */

/** CO₂ économisé en kg : on compare solo vs covoiturage */
function calcCo2(distanceKm, passengers) {
  const emFactor = 0.21; // kg CO₂ / km / passager (voiture solo)
  const saved = distanceKm * emFactor * (passengers - 1);
  return saved.toFixed(1);
}

/** Affiche un toast */
function showToast(msg, duration = 3000) {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  toastMsg.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}

/** Valide un email étudiant (fin .fr ou .edu ou libre) */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Anime un compteur de 0 à target */
function animateCounter(el, target, suffix = "", duration = 1500) {
  const start = performance.now();
  const update = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.floor(ease * target) + suffix;
    if (t < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

/* ──────────────────────────────────────────────
   NAVIGATION
────────────────────────────────────────────── */

function navigateTo(pageId) {
  // Cache toutes les pages
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  // Active la bonne
  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.add("active");

  // Met à jour le nav
  document.querySelectorAll(".nav-link").forEach((l) => {
    l.classList.toggle("active", l.dataset.page === pageId);
  });

  // Ferme le menu mobile si ouvert
  document.getElementById("navLinks").classList.remove("open");

  // Actions spécifiques à la page
  if (pageId === "offers") renderOffers(state.offers);
  if (pageId === "impact") initImpactPage();
  if (pageId === "home") initHero();
  if (pageId === "transport") initTransportMap();
  if (pageId === "trips") renderMyTrips();
  if (pageId === "admin") renderAdminPanel();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* Événements de navigation */
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    if (link.dataset.page !== "home" && link.dataset.page !== "transport" && !state.user) {
      showToast("🔒 Connecte-toi pour accéder à cette page");
      openModal("modalLogin");
      return;
    }
    navigateTo(link.dataset.page);
  });
});

/* Hamburger mobile */
document.getElementById("hamburger").addEventListener("click", () => {
  document.getElementById("navLinks").classList.toggle("open");
});

/* Scroll → ombre navbar */
window.addEventListener("scroll", () => {
  document.querySelector(".navbar").classList.toggle("scrolled", window.scrollY > 10);
});

/* ──────────────────────────────────────────────
   MODALES
────────────────────────────────────────────── */

function openModal(id) {
  document.getElementById(id).classList.add("active");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

// Boutons open
document.getElementById("btnLogin").addEventListener("click", () => openModal("modalLogin"));
document.getElementById("btnRegister").addEventListener("click", () => openModal("modalRegister"));
document.getElementById("heroRegister").addEventListener("click", () => openModal("modalRegister"));
document.getElementById("heroExplore").addEventListener("click", () => {
  navigateTo("offers");
});

// Boutons close
document.querySelectorAll(".modal-close").forEach((btn) => {
  btn.addEventListener("click", () => closeModal(btn.dataset.close));
});

// Fermer en cliquant l'overlay
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// Switch entre les modales
document.getElementById("switchToRegister").addEventListener("click", (e) => {
  e.preventDefault();
  closeModal("modalLogin");
  setTimeout(() => openModal("modalRegister"), 200);
});
document.getElementById("switchToLogin").addEventListener("click", (e) => {
  e.preventDefault();
  closeModal("modalRegister");
  setTimeout(() => openModal("modalLogin"), 200);
});

/* ──────────────────────────────────────────────
   AUTHENTIFICATION (simulation)
────────────────────────────────────────────── */

/* Inscription */
document.getElementById("btnDoRegister").addEventListener("click", async () => {
  const first = document.getElementById("regFirst").value.trim();
  const last  = document.getElementById("regLast").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const promo = document.getElementById("regPromo").value;
  const pwd   = document.getElementById("regPwd").value;
  const terms = document.getElementById("regTerms").checked;

  if (!first || !last) { showToast("⚠️ Renseigne ton prénom et ton nom"); return; }
  if (!isValidEmail(email)) { showToast("⚠️ Adresse email invalide"); return; }
  if (!phone || phone.length < 10) { showToast("⚠️ Numéro de téléphone invalide (10 chiffres min.)"); return; }
  if (!promo) { showToast("⚠️ Sélectionne ta promotion"); return; }
  if (pwd.length < 6) { showToast("⚠️ Mot de passe trop court (6 min.)"); return; }
  if (!terms) { showToast("⚠️ Accepte les conditions d'utilisation"); return; }

  if (state.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    showToast("⚠️ Ce compte existe déjà");
    return;
  }

  const btnReg = document.getElementById("btnDoRegister");
  btnReg.textContent = "Inscription en cours…";
  btnReg.disabled = true;

  const role = promo === "Admin" ? "admin" : "user";
  const newUser = { first, last, email, phone, promo, pwd, role, createdAt: new Date().toISOString() };

  await saveNewUser(newUser);

  state.user = { first, last, email, promo, role };
  closeModal("modalRegister");
  onLogin();
  showToast(`🌿 Bienvenue sur MovePNS, ${first} !`);

  btnReg.textContent = "Créer mon compte 🌿";
  btnReg.disabled = false;
});

/* Connexion */
document.getElementById("btnDoLogin").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const pwd   = document.getElementById("loginPwd").value;

  if (!isValidEmail(email)) { showToast("⚠️ Email invalide"); return; }
  if (pwd.length < 3) { showToast("⚠️ Mot de passe incorrect"); return; }

  const btnLog = document.getElementById("btnDoLogin");
  btnLog.textContent = "Connexion…";
  btnLog.disabled = true;

  // Recharge les utilisateurs depuis Sheets pour être à jour
  await loadUsers();

  const found = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.pwd === pwd);
  if (!found) {
    showToast("⚠️ Identifiants incorrects ou compte inexistant");
    btnLog.textContent = "Se connecter";
    btnLog.disabled = false;
    return;
  }

  state.user = { first: found.first, last: found.last, email: found.email, promo: found.promo, role: found.role };
  closeModal("modalLogin");
  onLogin();
  showToast("✅ Connexion réussie !");

  btnLog.textContent = "Se connecter";
  btnLog.disabled = false;
});

/* Actions post-connexion */
function onLogin() {
  // Affiche le nom + déconnexion dans la nav
  const navActions = document.querySelector(".nav-actions");
  navActions.innerHTML = `
    <span style="font-size:.88rem;color:var(--text-mid);">👤 ${state.user.first}${state.user.role === 'admin' ? ' (admin)' : ''}</span>
    <button class="btn-ghost" id="btnLogout">Déconnexion</button>
  `;
  document.getElementById("btnLogout").addEventListener("click", logout);

  // Link admin page uniquement pour rôle admin
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

  // Lien "Mes trajets" pour tous les connectés
  const tripsLink = document.querySelector(".nav-link-trips");
  tripsLink.style.display = "inline-flex";
  tripsLink.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("trips");
    renderMyTrips();
  });

  loadOffers();
  renderOffers(state.offers);
}

function logout() {
  state.user = null;
  state.offers = [];
  const adminLink = document.querySelector(".nav-link-admin");
  if (adminLink) adminLink.style.display = "none";

  const tripsLink = document.querySelector(".nav-link-trips");
  if (tripsLink) tripsLink.style.display = "none";

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
   PAGE HOME – Compteurs animés
────────────────────────────────────────────── */
function initHero() {
  animateCounter(document.getElementById("statUsers"), 148, "+");
  animateCounter(document.getElementById("statTrips"), 312);
  animateCounter(document.getElementById("statCo2"),   2840);
}

/* ──────────────────────────────────────────────
   PAGE TRAJETS – Rendu des cartes
────────────────────────────────────────────── */
function renderOffers(offers) {
  const list = document.getElementById("offersList");
  list.innerHTML = "";

  if (offers.length === 0) {
    list.innerHTML = `<p style="text-align:center;color:var(--text-light);padding:3rem;">Aucun trajet trouvé.</p>`;
    return;
  }

  offers.forEach((o, i) => {
    const co2 = calcCo2(o.distance, 2);
    const card = document.createElement("div");
    card.className = "offer-card";
    card.style.animationDelay = `${i * 0.06}s`;
    card.innerHTML = `
      <div class="offer-avatar">${o.avatar}</div>
      <div class="offer-info">
        <div class="offer-name">${o.driver} <span style="font-weight:400;font-size:.85rem;color:var(--text-light);">&nbsp;·&nbsp;${o.promo}</span></div>
        <div class="offer-route">🏠 ${o.from} → 🏫 ${o.to || 'Polytech Nice Sophia'}</div>
        <div class="offer-route" style="font-size:.8rem;color:var(--text-light);">📏 ${o.distance || 'n/a'} km</div>
        <div class="offer-tags">
          <span class="offer-tag">🕗 ${o.time}</span>
          <span class="offer-tag">🔁 ${o.recur}</span>
          <span class="offer-tag">📞 ${o.tel}</span>
          <span class="offer-tag eco">🌿 -${co2} kg CO₂</span>
          ${o.note ? `<div class="note-container"><span class="offer-tag note-tag">💬 Note</span><div class="offer-tooltip">${o.note}</div></div>` : ""}
        </div>
      </div>
      <div class="offer-actions">
        <div class="offer-seats">${o.seats} <span>place${o.seats > 1 ? "s" : ""}</span></div>
        <button class="btn-primary" style="font-size:.82rem;padding:.45rem 1rem;" data-id="${o.id}">Rejoindre</button>
      </div>
    `;
    list.appendChild(card);
  });

  // Boutons "Rejoindre"
  list.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const offerId = +btn.dataset.id;
      const offer = state.offers.find((o) => o.id === offerId);
      if (!offer.requests) offer.requests = [];
      if (offer.requests.some((r) => r.userEmail === state.user.email)) {
        showToast("⚠️ Vous avez déjà demandé à rejoindre ce trajet");
        return;
      }
      btn.textContent = "Envoi…";
      btn.disabled = true;
      const reqIdx = offer.requests.length;
      offer.requests.push({ userEmail: state.user.email, status: "pending", comment: "" });
      await updateRequest(offerId, reqIdx, {});
      showToast(`✅ Demande envoyée à ${offer.driver} !`);
      btn.textContent = "Demande envoyée";
      btn.style.opacity = ".6";
    });
  });
}

function renderMyTrips() {
  const container = document.getElementById("myTripsContainer");
  container.innerHTML = "";

  const myOffers = state.offers.filter((o) => o.driverEmail === state.user.email);

  if (myOffers.length > 0) {
    myOffers.forEach((offer) => {
      const offerDiv = document.createElement("div");
      offerDiv.className = "my-offer-card";
      offerDiv.innerHTML = `
        <h3>${offer.from} → Polytech Nice Sophia (${offer.time})</h3>
        <p>Places disponibles: ${offer.seats}</p>
        <div class="requests-list">
          <h4>Demandes:</h4>
          ${offer.requests && offer.requests.length > 0 ? offer.requests.map((req, idx) => {
            const user = state.users.find((u) => u.email === req.userEmail);
            const userName = user ? `${user.first} ${user.last}` : req.userEmail;
            const userPhone = user ? user.phone : '';
            const userPromo = user ? user.promo : '';
            return `
              <div class="request-item" data-offer-id="${offer.id}" data-req-idx="${idx}">
                <span>${userName} (${req.status}) ${userPhone ? `- ${userPhone}` : ''} ${userPromo ? `- ${userPromo}` : ''}</span>
                <div class="request-actions">
                  ${req.status === 'pending' ? `
                    <button class="btn-accept">Accepter</button>
                    <button class="btn-reject">Refuser</button>
                  ` : ''}
                  <input type="text" placeholder="Commentaire" value="${req.comment}" class="comment-input" />
                  <button class="btn-save-comment">Sauvegarder</button>
                </div>
              </div>
            `;
          }).join('') : '<p>Aucune demande.</p>'}
        </div>
      `;
      container.appendChild(offerDiv);
    });
  }

  // Section "Mes demandes"
  const myRequests = state.offers.filter((o) => o.requests && o.requests.some((r) => r.userEmail === state.user.email));
  if (myRequests.length > 0) {
    const requestsDiv = document.createElement("div");
    requestsDiv.className = "my-requests-section";
    requestsDiv.innerHTML = `<h2>Mes demandes de covoiturage</h2>`;
    myRequests.forEach((offer) => {
      const myReq = offer.requests.find((r) => r.userEmail === state.user.email);
      const driver = state.users.find((u) => u.email === offer.driverEmail);
      const driverPhone = driver ? driver.phone : '';
      const requestDiv = document.createElement("div");
      requestDiv.className = "my-request-card";
      requestDiv.innerHTML = `
        <h4>${offer.from} → Polytech Nice Sophia (${offer.time})</h4>
        <p>Conducteur: ${offer.driver} ${driverPhone ? `- ${driverPhone}` : ''}</p>
        <p>Statut: ${myReq.status}</p>
        ${myReq.comment ? `<p>Commentaire: ${myReq.comment}</p>` : ''}
      `;
      requestsDiv.appendChild(requestDiv);
    });
    container.appendChild(requestsDiv);
  }

  if (myOffers.length === 0 && myRequests.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:var(--text-light);padding:3rem;">Vous n'avez proposé aucun trajet et n'avez fait aucune demande.</p>`;
  }

  // Événements pour accepter/refuser
  container.querySelectorAll(".btn-accept").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item = btn.closest(".request-item");
      const offerId = +item.dataset.offerId;
      const reqIdx  = +item.dataset.reqIdx;
      await updateRequest(offerId, reqIdx, { status: "accepted" });
      renderMyTrips();
      showToast("✅ Demande acceptée");
    });
  });

  container.querySelectorAll(".btn-reject").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item = btn.closest(".request-item");
      const offerId = +item.dataset.offerId;
      const reqIdx  = +item.dataset.reqIdx;
      await updateRequest(offerId, reqIdx, { status: "rejected" });
      renderMyTrips();
      showToast("❌ Demande refusée");
    });
  });

  container.querySelectorAll(".btn-save-comment").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item    = btn.closest(".request-item");
      const offerId = +item.dataset.offerId;
      const reqIdx  = +item.dataset.reqIdx;
      const comment = item.querySelector(".comment-input").value;
      await updateRequest(offerId, reqIdx, { comment });
      showToast("💬 Commentaire sauvegardé");
    });
  });
}
function renderAdminPanel() {
  const usersContainer = document.getElementById("adminUsers");
  const offersContainer = document.getElementById("adminOffers");

  usersContainer.innerHTML = "";
  if (state.users.length === 0) {
    usersContainer.innerHTML = "<p>Aucun utilisateur enregistré.</p>";
  } else {
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.innerHTML = `
      <thead>
        <tr><th>Email</th><th>Nom</th><th>Téléphone</th><th>Promo</th><th>Rôle</th><th>Inscription</th></tr>
      </thead>
      <tbody>
        ${state.users.map((u) => `<tr style='border-bottom:1px solid #ddd'><td>${u.email}</td><td>${u.first} ${u.last}</td><td>${u.phone || ''}</td><td>${u.promo}</td><td>${u.role}</td><td>${new Date(u.createdAt).toLocaleString()}</td></tr>`).join("")}
      </tbody>
    `;
    usersContainer.appendChild(table);
  }

  offersContainer.innerHTML = "";
  if (state.offers.length === 0) {
    offersContainer.innerHTML = "<p>Aucune offre disponible.</p>";
  } else {
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.innerHTML = `
      <thead>
        <tr><th>Conducteur</th><th>Départ</th><th>Heure</th><th>Places</th><th>Action</th></tr>
      </thead>
      <tbody>
        ${state.offers.map((o) => `
          <tr style='border-bottom:1px solid #ddd'>
            <td>${o.driver}</td>
            <td>${o.from}</td>
            <td>${o.time}</td>
            <td>${o.seats}</td>
            <td>
              <button data-id='${o.id}' class='admin-edit-offer'>✏️ Modifier</button>
              <button data-id='${o.id}' class='admin-delete-offer'>🗑️ Supprimer</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    `;
    offersContainer.appendChild(table);

    offersContainer.querySelectorAll(".admin-edit-offer").forEach((btn) => {
      btn.addEventListener("click", () => {
        const offerId = +btn.dataset.id;
        const offer = state.offers.find((o) => o.id === offerId);
        const updatedNote = prompt("Modifier la note du trajet :", offer.note || "");
        if (updatedNote !== null) {
          offer.note = updatedNote;
          saveOffers();
          renderOffers(state.offers);
          renderAdminPanel();
          showToast("✅ Note mise à jour");
        }
      });
    });

    offersContainer.querySelectorAll(".admin-delete-offer").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const offerId = +btn.dataset.id;
        await deleteOffer(offerId);
        renderOffers(state.offers);
        renderAdminPanel();
        showToast("🗑️ Trajet supprimé");
      });
    });
  }
}

/* Recherche (filtre côté client) */
document.getElementById("btnSearch").addEventListener("click", () => {
  if (!state.user) { showToast("🔒 Connecte-toi d'abord"); openModal("modalLogin"); return; }
  const q = document.getElementById("searchFrom").value.toLowerCase().trim();
  const filtered = state.offers.filter((o) =>
    !q || o.from.toLowerCase().includes(q)
  );
  renderOffers(filtered);
  if (filtered.length === 0) showToast("Aucun trajet pour ce critère.");
  else showToast(`${filtered.length} trajet(s) trouvé(s) ✓`);
});

/* ──────────────────────────────────────────────
   PAGE PROPOSER – Estimateur CO₂ + soumission
────────────────────────────────────────────── */

function updateCo2Estimate() {
  const seats  = parseInt(document.getElementById("propSeats").value) || 2;
  const dist   = 28; // distance fixe Nice→Sophia (~28 km)
  const saved  = calcCo2(dist, seats + 1); // conducteur + passagers
  document.getElementById("co2Estimate").textContent = `${saved} kg CO₂`;
  const distanceEl = document.getElementById("distanceEstimate");
  if (distanceEl) distanceEl.textContent = `${dist} km`;
}

document.getElementById("propSeats").addEventListener("change", updateCo2Estimate);
document.getElementById("propFrom").addEventListener("input", updateCo2Estimate);
document.getElementById("propTo").addEventListener("input", updateCo2Estimate);
updateCo2Estimate();

document.getElementById("btnPropose").addEventListener("click", async () => {
  if (!state.user) { showToast("🔒 Connecte-toi d'abord"); openModal("modalLogin"); return; }

  const from  = document.getElementById("propFrom").value.trim();
  const to    = document.getElementById("propTo").value.trim();
  const date  = document.getElementById("propDate").value;
  const hour  = document.getElementById("propHour").value;
  const seats = document.getElementById("propSeats").value;

  if (!from)  { showToast("⚠️ Indique ton lieu de départ"); return; }
  if (!to)    { showToast("⚠️ Indique ton lieu d'arrivée"); return; }
  if (!date)  { showToast("⚠️ Choisis une date"); return; }
  if (!hour)  { showToast("⚠️ Indique l'heure de départ"); return; }

  const btnProp = document.getElementById("btnPropose");
  btnProp.textContent = "Publication en cours…";
  btnProp.disabled = true;

  const distance = 28;
  const newOffer = {
    id:          Date.now(),
    driver:      `${state.user.first} ${state.user.last}`,
    avatar:      "🙋",
    from, to,
    time:        hour,
    seats:       parseInt(seats),
    recur:       document.getElementById("propRecur").options[document.getElementById("propRecur").selectedIndex].text,
    distance,
    promo:       state.user.promo,
    rating:      "–",
    note:        document.getElementById("propNote").value.trim(),
    driverEmail: state.user.email,
    requests:    [],
  };

  await saveNewOffer(newOffer);

  showToast("🌿 Trajet publié avec succès !");
  document.getElementById("propFrom").value = "";
  document.getElementById("propDate").value = "";
  document.getElementById("propNote").value = "";
  btnProp.textContent = "Publier le trajet 🌿";
  btnProp.disabled = false;
  setTimeout(() => navigateTo("offers"), 1200);
});

/* ──────────────────────────────────────────────
   PAGE IMPACT – Graphique & cercle
────────────────────────────────────────────── */
function initImpactPage() {
  // Cercle de progression
  const prog = document.getElementById("circleProgress");
  const circumference = 2 * Math.PI * 52; // ≈ 326.7
  setTimeout(() => {
    prog.style.strokeDashoffset = circumference * (1 - 0.72); // 72% du cercle
  }, 200);

  // Graphique en barres
  const months  = ["Nov", "Déc", "Jan", "Fév", "Mar", "Avr"];
  const values  = [8.2, 11.5, 6.0, 18.4, 22.1, 24.6];
  const maxVal  = Math.max(...values);
  const chart   = document.getElementById("barChart");
  chart.innerHTML = "";

  months.forEach((m, i) => {
    const pct  = (values[i] / maxVal) * 100;
    const group = document.createElement("div");
    group.className = "bar-group";
    group.innerHTML = `
      <div class="bar" data-val="${values[i]} kg" style="height:0;" ></div>
      <span class="bar-label">${m}</span>
    `;
    chart.appendChild(group);

    // Animation différée
    setTimeout(() => {
      group.querySelector(".bar").style.height = `${pct}%`;
    }, 100 + i * 80);
  });
}

/* ──────────────────────────────────────────────
   PAGE TRANSPORTS – Carte Leaflet
────────────────────────────────────────────── */

let mapInstance = null;
let mapLayers = { train: [], tram: [], bus: [], bike: [] };

function initTransportMap() {
  // Leaflet ne se recharge pas si déjà initialisé
  if (mapInstance) { mapInstance.invalidateSize(); return; }

  mapInstance = L.map("transportMap", {
    center: [43.62, 7.05],
    zoom: 11,
    zoomControl: true,
  });

  // Fond de carte OpenStreetMap
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(mapInstance);

  // ── Marqueur École ────────────────────────
  const schoolIcon = L.divIcon({
    html: '<div style="background:#f4a261;border:3px solid #fff;border-radius:50%;width:22px;height:22px;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:11px;">🏫</div>',
    className: "", iconSize: [22, 22], iconAnchor: [11, 11],
  });
  // Marqueur école
  L.marker([43.6165, 7.0676], { icon: schoolIcon })
    .addTo(mapInstance)
    .bindPopup(`<div class="popup-title">🏫 Polytech Nice Sophia</div><div class="popup-sub">Route des Colles, Sophia Antipolis</div>`);

  // ── TRAIN TER : Nice → Antibes → Cannes ──
  const trainLine = L.polyline([
    [43.7050, 7.2619], [43.6887, 7.2261], [43.6578, 7.1455],
    [43.6264, 7.1225], [43.5933, 7.0826], [43.5505, 7.0174],
    [43.5268, 6.9910], [43.5493, 6.9309],
  ], { color: "#e74c3c", weight: 4, opacity: .85, dashArray: "8,4" })
    .bindPopup(`<div class="popup-title">🚆 TER Nice–Antibes–Cannes</div><div class="popup-sub">Descendre à Antibes → Bus 230 vers Sophia</div>`);
  mapLayers.train.push(trainLine);
  trainLine.addTo(mapInstance);

  // Gares SNCF
  const stationIcon = (label) => L.divIcon({
    html: `<div style="background:#e74c3c;color:#fff;border-radius:6px;padding:2px 6px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">${label}</div>`,
    className: "", iconAnchor: [20, 10],
  });
  [
    { pos: [43.7050, 7.2619], label: "Nice Ville" },
    { pos: [43.6887, 7.2261], label: "St-Augustin" },
    { pos: [43.6578, 7.1455], label: "Cagnes" },
    { pos: [43.5933, 7.0826], label: "Antibes" },
    { pos: [43.5493, 6.9309], label: "Cannes" },
  ].forEach(({ pos, label }) => {
    const m = L.marker(pos, { icon: stationIcon(label) })
      .bindPopup(`<div class="popup-title">🚆 Gare de ${label}</div><div class="popup-sub">Ligne TER côtière</div>`);
    mapLayers.train.push(m);
    m.addTo(mapInstance);
  });

  // ── TRAMWAY T2 Nice ──
  const tramLine = L.polyline([
    [43.7040, 7.2756], [43.7023, 7.2662], [43.7013, 7.2592],
    [43.6971, 7.2454], [43.6920, 7.2300], [43.6887, 7.2165], [43.6887, 7.2050],
  ], { color: "#3498db", weight: 5, opacity: .9 })
    .bindPopup(`<div class="popup-title">🚊 Tramway T2 – Nice</div><div class="popup-sub">Correspondance Gare St-Augustin → TER</div>`);
  mapLayers.tram.push(tramLine);
  tramLine.addTo(mapInstance);

  // ── BUS 230 : Antibes → Sophia ──
  const bus230 = L.polyline([
    [43.5933, 7.0826], [43.6005, 7.0660], [43.6108, 7.0710], [43.6165, 7.0676],
  ], { color: "#f39c12", weight: 4, opacity: .9 })
    .bindPopup(`<div class="popup-title">🚌 Bus 230 – Envibus</div><div class="popup-sub">Antibes Gare → Sophia Antipolis<br>Fréquence : 30 min en heure de pointe</div>`);
  mapLayers.bus.push(bus230);
  bus230.addTo(mapInstance);

  // ── BUS 11 : Nice → Sophia via Cagnes ──
  const bus11 = L.polyline([
    [43.7050, 7.2619], [43.6800, 7.2200], [43.6578, 7.1455],
    [43.6530, 7.1100], [43.6380, 7.0900], [43.6280, 7.0770], [43.6165, 7.0676],
  ], { color: "#9b59b6", weight: 4, opacity: .85, dashArray: "6,3" })
    .bindPopup(`<div class="popup-title">🚌 Bus 11 / Envibus</div><div class="popup-sub">Nice Centre → Sophia Antipolis<br>Via Cagnes & Villeneuve-Loubet</div>`);
  mapLayers.bus.push(bus11);
  bus11.addTo(mapInstance);

  // ── BUS 110 : Cannes → Sophia via Mougins ──
  const bus110 = L.polyline([
    [43.5493, 6.9309], [43.5700, 6.9600], [43.5900, 6.9900],
    [43.6050, 7.0200], [43.6165, 7.0676],
  ], { color: "#27ae60", weight: 4, opacity: .85, dashArray: "6,3" })
    .bindPopup(`<div class="popup-title">🚌 Bus 110 – Envibus</div><div class="popup-sub">Cannes Gare → Sophia Antipolis via Mougins</div>`);
  mapLayers.bus.push(bus110);
  bus110.addTo(mapInstance);

  // ── BUS ZOU 630 : Nice → Sophia Antipolis (Région PACA) ──
  const bus630 = L.polyline([
    [43.7050, 7.2619], // Nice Gare Routière
    [43.6950, 7.2500], // Nice Ouest
    [43.6700, 7.2000], // Saint-Laurent-du-Var
    [43.6530, 7.1500], // Cagnes-sur-Mer
    [43.6450, 7.1200], // Villeneuve-Loubet
    [43.6350, 7.0950], // Biot
    [43.6250, 7.0800], // Sophia Sud
    [43.6165, 7.0676], // Polytech
  ], { color: "#e84393", weight: 4, opacity: .9, dashArray: "4,2" })
    .bindPopup(`<div class="popup-title">🚌 ZOU ! Bus 630</div><div class="popup-sub">Nice Gare Routière → Sophia Antipolis<br>Réseau Zou – Région PACA<br>Fréquence : ~1h, tarif réduit étudiant</div>`);
  mapLayers.bus.push(bus630);
  bus630.addTo(mapInstance);

  // ── BUS ZOU 631 : Antibes → Sophia (variante ZOU) ──
  const bus631 = L.polyline([
    [43.5933, 7.0826], // Antibes Gare
    [43.6000, 7.0720], // Biot Gare
    [43.6100, 7.0700], // Sophia Nord
    [43.6165, 7.0676], // Polytech
  ], { color: "#c0392b", weight: 4, opacity: .85, dashArray: "4,2" })
    .bindPopup(`<div class="popup-title">🚌 ZOU ! Bus 631</div><div class="popup-sub">Antibes → Sophia Antipolis<br>Réseau Zou – Région PACA</div>`);
  mapLayers.bus.push(bus631);
  bus631.addTo(mapInstance);
  const bikeIcon = L.divIcon({
    html: '<div style="background:#16a34a;border:2.5px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:10px;">🚲</div>',
    className: "", iconSize: [18, 18], iconAnchor: [9, 9],
  });
  [
    { pos: [43.7050, 7.2619], name: "Vélo Azur – Nice Gare",         type: "Vélo Azur + Lime" },
    { pos: [43.7023, 7.2662], name: "Vélo Azur – Place Garibaldi",   type: "Vélo Azur" },
    { pos: [43.6960, 7.2700], name: "Vélo Azur – Promenade",         type: "Vélo Azur + Lime" },
    { pos: [43.7010, 7.2590], name: "Lime – Nice Centre",            type: "Lime (vélo électrique)" },
    { pos: [43.6887, 7.2261], name: "Lime – Nice St-Augustin",       type: "Lime (trottinette & vélo)" },
    { pos: [43.5933, 7.0826], name: "Lime – Antibes Gare",           type: "Lime (trottinette & vélo)" },
    { pos: [43.5860, 7.1000], name: "Lime – Antibes Vieille Ville",  type: "Lime" },
    { pos: [43.5493, 6.9309], name: "Lime – Cannes Gare",            type: "Lime (trottinette & vélo)" },
    { pos: [43.5520, 6.9200], name: "Lime – Cannes Croisette",       type: "Lime" },
    { pos: [43.6165, 7.0676], name: "Lime – Polytech / Sophia",      type: "Lime (vélo électrique)" },
    { pos: [43.6200, 7.0650], name: "Lime – Sophia Village",         type: "Lime" },
    { pos: [43.6578, 7.1455], name: "Lime – Cagnes Gare",            type: "Lime" },
  ].forEach(({ pos, name, type }) => {
    const m = L.marker(pos, { icon: bikeIcon })
      .bindPopup(`<div class="popup-title">🚲 ${name}</div><div class="popup-sub">${type}</div>`);
    mapLayers.bike.push(m);
    m.addTo(mapInstance);
  });

  // ── Filtres carte ──
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const layer = btn.dataset.layer;
      const allLayers = [...mapLayers.train, ...mapLayers.tram, ...mapLayers.bus, ...mapLayers.bike];
      if (layer === "all") {
        allLayers.forEach((l) => { if (!mapInstance.hasLayer(l)) l.addTo(mapInstance); });
      } else {
        allLayers.forEach((l) => { if (mapInstance.hasLayer(l)) mapInstance.removeLayer(l); });
        mapLayers[layer].forEach((l) => l.addTo(mapInstance));
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadUsers();
  await loadOffers();

  // Page par défaut
  navigateTo("home");

  // Date min = aujourd'hui
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("propDate").setAttribute("min", today);
  document.getElementById("searchDate").setAttribute("min", today);

  console.log(
    "%c🍃 MovePNS chargé",
    "color:#2d6a4f;font-weight:bold;font-size:14px;"
  );
});
