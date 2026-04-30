document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadUsers();
    await loadOffers();

    navigateTo("home");

    const today = new Date().toISOString().split("T")[0];
    document.getElementById("propDate").setAttribute("min", today);
    document.getElementById("searchDate").setAttribute("min", today);

    if (typeof initAccountPage === "function") initAccountPage();
    if (typeof initChatPage === "function") initChatPage();

    /* ── Restauration de session ── */
    if (typeof restoreSession === "function" && restoreSession()) {
      onLogin();
      /* Pas de toast pour ne pas être intrusif au rechargement */
    }

    console.log("%c🍃 MovePNS chargé", "color:#2d6a4f;font-weight:bold;font-size:14px;");
  } catch (err) {
    console.error("Erreur au chargement :", err);
  }
});
