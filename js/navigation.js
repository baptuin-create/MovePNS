/* ──────────────────────────────────────────────
   NAVIGATION
────────────────────────────────────────────── */

function navigateTo(pageId) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));

  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-link").forEach((l) => {
    l.classList.toggle("active", l.dataset.page === pageId);
  });

  document.getElementById("navLinks").classList.remove("open");

  if (pageId === "offers") renderOffers(state.offers);
  if (pageId === "impact") initImpactPage();
  if (pageId === "home") initHero();
  if (pageId === "transport") initTransportMap();
  if (pageId === "trips") renderMyTrips();
  if (pageId === "admin") renderAdminPanel();
  if (pageId === "account") renderAccountPage();
  if (pageId === "chat") renderChatPage();

  if (pageId !== "chat") window.scrollTo({ top: 0, behavior: "smooth" });
}

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

document.getElementById("hamburger").addEventListener("click", () => {
  document.getElementById("navLinks").classList.toggle("open");
});

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

document.getElementById("btnLogin").addEventListener("click", () => openModal("modalLogin"));
document.getElementById("btnRegister").addEventListener("click", () => openModal("modalRegister"));
document.getElementById("heroRegister").addEventListener("click", () => openModal("modalRegister"));
document.getElementById("heroExplore").addEventListener("click", () => {
  if (!state.user) {
    showToast("🔒 Connecte-toi pour voir les trajets");
    openModal("modalLogin");
    return;
  }
  navigateTo("offers");
});

document.querySelectorAll(".modal-close").forEach((btn) => {
  btn.addEventListener("click", () => closeModal(btn.dataset.close));
});

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

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

