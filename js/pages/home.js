/* ──────────────────────────────────────────────
   PAGE HOME — statistiques réelles
────────────────────────────────────────────── */
function getAcceptedRequests(offer) {
  return (offer.requests || []).filter((r) => r.status === "accepted");
}

function getOfferDistance(offer) {
  const distance = Number(offer.distance);
  return Number.isFinite(distance) && distance > 0 ? distance : 28;
}

function getAcceptedPassengerCount(offer) {
  return getAcceptedRequests(offer).length;
}

function getOfferCo2Saved(offer) {
  return getOfferDistance(offer) * 0.21 * getAcceptedPassengerCount(offer);
}

function getGlobalStats() {
  const usersCount = Array.isArray(state.users) ? state.users.filter((u) => u && u.email).length : 0;
  const offersCount = Array.isArray(state.offers) ? state.offers.length : 0;
  const totalCo2 = (state.offers || []).reduce((sum, offer) => sum + getOfferCo2Saved(offer), 0);
  const totalSharedKm = (state.offers || []).reduce((sum, offer) => sum + getOfferDistance(offer) * getAcceptedPassengerCount(offer), 0);
  const acceptedTrips = (state.offers || []).reduce((sum, offer) => sum + getAcceptedPassengerCount(offer), 0);
  return { usersCount, offersCount, totalCo2, totalSharedKm, acceptedTrips };
}

function initHero() {
  const stats = getGlobalStats();
  animateCounter(document.getElementById("statUsers"), stats.usersCount);
  animateCounter(document.getElementById("statTrips"), stats.offersCount);
  animateCounter(document.getElementById("statCo2"), Math.round(stats.totalCo2));
}
