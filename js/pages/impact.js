/* ──────────────────────────────────────────────
   PAGE IMPACT — valeurs réelles utilisateur
────────────────────────────────────────────── */
function getCurrentUserImpact() {
  if (!state.user) {
    return { co2: 0, trips: 0, passengers: 0, km: 0, friends: 0, monthlyValues: [0,0,0,0,0,0] };
  }

  const email = String(state.user.email || "").toLowerCase();
  let co2 = 0;
  let trips = 0;
  let passengers = 0;
  let km = 0;

  (state.offers || []).forEach((offer) => {
    const distance = getOfferDistance(offer);
    const accepted = getAcceptedRequests(offer);
    const isDriver = String(offer.driverEmail || "").toLowerCase() === email;
    const myPassengerRequest = accepted.find((r) => String(r.userEmail || "").toLowerCase() === email);

    if (isDriver && accepted.length > 0) {
      trips += accepted.length;
      passengers += accepted.length;
      km += distance * accepted.length;
      co2 += distance * 0.21 * accepted.length;
    }

    if (myPassengerRequest) {
      trips += 1;
      passengers += 1;
      km += distance;
      co2 += distance * 0.21;
    }
  });

  const friends = (state.friends || []).filter((f) =>
    f.status === "accepted" &&
    [String(f.from || "").toLowerCase(), String(f.to || "").toLowerCase()].includes(email)
  ).length;

  const monthlyValues = buildMonthlyImpactValues(email);
  return { co2, trips, passengers, km, friends, monthlyValues };
}

function buildMonthlyImpactValues(email) {
  const today = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({ month: d.getMonth(), year: d.getFullYear(), value: 0 });
  }

  (state.offers || []).forEach((offer) => {
    const rawDate = offer.date || offer.createdAt || offer.id;
    let d = rawDate ? new Date(rawDate) : today;
    if (Number.isNaN(d.getTime())) d = today;
    const bucket = months.find((m) => m.month === d.getMonth() && m.year === d.getFullYear());
    if (!bucket) return;

    const distance = getOfferDistance(offer);
    const accepted = getAcceptedRequests(offer);
    const isDriver = String(offer.driverEmail || "").toLowerCase() === email;
    const isPassenger = accepted.some((r) => String(r.userEmail || "").toLowerCase() === email);

    if (isDriver) bucket.value += distance * 0.21 * accepted.length;
    if (isPassenger) bucket.value += distance * 0.21;
  });

  return months.map((m) => Math.round(m.value * 10) / 10);
}

function initImpactPage() {
  const impact = getCurrentUserImpact();

  const totalCo2 = document.getElementById("totalCo2");
  const impactTrips = document.getElementById("impactTrips");
  const impactPassengers = document.getElementById("impactPassengers");
  const impactKm = document.getElementById("impactKm");
  const impactFriends = document.getElementById("impactFriends");

  if (totalCo2) totalCo2.textContent = (Math.round(impact.co2 * 10) / 10).toString();
  if (impactTrips) impactTrips.textContent = String(impact.trips);
  if (impactPassengers) impactPassengers.textContent = String(impact.passengers);
  if (impactKm) impactKm.textContent = `${Math.round(impact.km)} km`;
  if (impactFriends) impactFriends.textContent = String(impact.friends);

  const prog = document.getElementById("circleProgress");
  const circumference = 2 * Math.PI * 52;
  const pct = Math.max(0.05, Math.min(1, impact.co2 / 100));
  if (prog) {
    setTimeout(() => {
      prog.style.strokeDashoffset = circumference * (1 - pct);
    }, 200);
  }

  const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  const today = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(monthNames[d.getMonth()]);
  }

  const values = impact.monthlyValues || [0,0,0,0,0,0];
  const maxVal = Math.max(...values, 1);
  const chart = document.getElementById("barChart");
  if (!chart) return;
  chart.innerHTML = "";

  months.forEach((m, i) => {
    const value = values[i] || 0;
    const pct = Math.max(4, (value / maxVal) * 100);
    const group = document.createElement("div");
    group.className = "bar-group";
    group.innerHTML = `
      <div class="bar" data-val="${value.toFixed(1)} kg" style="height:0;"></div>
      <span class="bar-label">${m}</span>
    `;
    chart.appendChild(group);

    setTimeout(() => {
      group.querySelector(".bar").style.height = `${pct}%`;
    }, 100 + i * 80);
  });
}
