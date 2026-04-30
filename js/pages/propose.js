/* ──────────────────────────────────────────────
   RECHERCHE
────────────────────────────────────────────── */
document.getElementById("btnSearch").addEventListener("click", () => {
  if (!state.user) {
    showToast("🔒 Connecte-toi d'abord");
    openModal("modalLogin");
    return;
  }

  const q = document.getElementById("searchFrom").value.toLowerCase().trim();
  const filtered = state.offers.filter((o) => !q || o.from.toLowerCase().includes(q));
  renderOffers(filtered);

  if (filtered.length === 0) showToast("Aucun trajet pour ce critère.");
  else showToast(`${filtered.length} trajet(s) trouvé(s) ✓`);
});

/* ──────────────────────────────────────────────
   PAGE PROPOSER
────────────────────────────────────────────── */

async function updateCo2Estimate() {
  const seats = parseInt(document.getElementById("propSeats").value) || 2;
  const from = document.getElementById("propFrom").value.trim();
  const to = document.getElementById("propTo").value.trim();
  const distanceEl = document.getElementById("distanceEstimate");
  const co2El = document.getElementById("co2Estimate");
  const seq = ++distanceEstimateSeq;

  if (!from || !to) {
    lastEstimatedDistance = 28;
    if (distanceEl) distanceEl.textContent = "–";
    if (co2El) co2El.textContent = "–";
    return;
  }

  if (distanceEl) distanceEl.textContent = "Calcul…";
  if (co2El) co2El.textContent = "Calcul…";

  try {
    const calculated = await calculateApproxDistance(from, to);
    if (seq !== distanceEstimateSeq) return;

    const dist = calculated || 28;
    lastEstimatedDistance = dist;
    const saved = calcCo2(dist, seats + 1);

    if (distanceEl) distanceEl.textContent = `${dist} km`;
    if (co2El) co2El.textContent = `${saved} kg CO₂`;

    if (!calculated) showToast("⚠️ Distance non trouvée, estimation par défaut utilisée");
  } catch (err) {
    console.warn("Erreur calcul distance", err);
    if (seq !== distanceEstimateSeq) return;

    lastEstimatedDistance = 28;
    if (distanceEl) distanceEl.textContent = "28 km*";
    if (co2El) co2El.textContent = `${calcCo2(28, seats + 1)} kg CO₂`;
    showToast("⚠️ Distance non calculée, estimation par défaut utilisée");
  }
}

function scheduleCo2Estimate() {
  clearTimeout(distanceEstimateTimer);
  distanceEstimateTimer = setTimeout(updateCo2Estimate, 800);
}

document.getElementById("propSeats").addEventListener("change", updateCo2Estimate);
document.getElementById("propFrom").addEventListener("input", scheduleCo2Estimate);
document.getElementById("propTo").addEventListener("input", scheduleCo2Estimate);
updateCo2Estimate();

document.getElementById("btnPropose").addEventListener("click", async () => {
  if (!state.user) {
    showToast("🔒 Connecte-toi d'abord");
    openModal("modalLogin");
    return;
  }

  const from = document.getElementById("propFrom").value.trim();
  const to = document.getElementById("propTo").value.trim();
  const date = document.getElementById("propDate").value;
  const hour = document.getElementById("propHour").value;
  const seats = document.getElementById("propSeats").value;

  if (!from) { showToast("⚠️ Indique ton lieu de départ"); return; }
  if (!to) { showToast("⚠️ Indique ton lieu d'arrivée"); return; }
  if (!date) { showToast("⚠️ Choisis une date"); return; }
  if (!hour) { showToast("⚠️ Indique l'heure de départ"); return; }

  const btnProp = document.getElementById("btnPropose");
  btnProp.textContent = "Publication en cours…";
  btnProp.disabled = true;

  let distance = lastEstimatedDistance || 28;
  try {
    const calculatedDistance = await calculateApproxDistance(from, to);
    if (calculatedDistance) distance = calculatedDistance;
  } catch (err) {
    console.warn("Distance non recalculée à la publication", err);
  }
  const newOffer = {
    id: Date.now(),
    driver: `${state.user.first} ${state.user.last}`,
    avatar: "🙋",
    from,
    to,
    time: hour,
    seats: parseInt(seats),
    recur: document.getElementById("propRecur").options[document.getElementById("propRecur").selectedIndex].text,
    distance,
    promo: state.user.promo,
    rating: "–",
    note: document.getElementById("propNote").value.trim(),
    driverEmail: state.user.email,
    date,
    createdAt: new Date().toISOString(),
    requests: [],
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

