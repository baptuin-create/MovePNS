/* ──────────────────────────────────────────────
   UTILITAIRES
────────────────────────────────────────────── */

function calcCo2(distanceKm, passengers) {
  const emFactor = 0.21;
  const saved = distanceKm * emFactor * (passengers - 1);
  return saved.toFixed(1);
}

/* ──────────────────────────────────────────────
   DISTANCE GRATUITE : OpenStreetMap + OSRM
   - Nominatim transforme une adresse en coordonnées GPS
   - OSRM estime la distance par la route
   - fallback Haversine si OSRM est indisponible
────────────────────────────────────────────── */

var distanceCache = JSON.parse(localStorage.getItem("mpnsDistanceCache") || "{}");
var distanceEstimateTimer = null;
var distanceEstimateSeq = 0;
var lastEstimatedDistance = 28;

function saveDistanceCache() {
  localStorage.setItem("mpnsDistanceCache", JSON.stringify(distanceCache));
}

function cleanAddress(address) {
  const value = String(address || "").trim();
  if (!value) return "";
  const lower = value.toLowerCase();
  if (lower.includes("france") || lower.includes("monaco")) return value;
  return `${value}, Alpes-Maritimes, France`;
}

async function geocodeAddress(address) {
  const cleaned = cleanAddress(address);
  if (!cleaned) return null;

  const key = `geo:${cleaned.toLowerCase()}`;
  if (distanceCache[key]) return distanceCache[key];

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&q=${encodeURIComponent(cleaned)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Géocodage indisponible");

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const coords = { lat: Number(data[0].lat), lon: Number(data[0].lon) };
  if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) return null;

  distanceCache[key] = coords;
  saveDistanceCache();
  return coords;
}

function haversineDistanceKm(a, b) {
  const R = 6371;
  const toRad = (v) => v * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function routeDistanceKm(fromCoords, toCoords) {
  const key = `route:${fromCoords.lat},${fromCoords.lon}:${toCoords.lat},${toCoords.lon}`;
  if (distanceCache[key]) return distanceCache[key];

  const url = `https://router.project-osrm.org/route/v1/driving/${fromCoords.lon},${fromCoords.lat};${toCoords.lon},${toCoords.lat}?overview=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Calcul d'itinéraire indisponible");

  const data = await res.json();
  const meters = data && data.routes && data.routes[0] && data.routes[0].distance;
  if (!Number.isFinite(meters)) throw new Error("Distance route introuvable");

  const km = Math.round((meters / 1000) * 10) / 10;
  distanceCache[key] = km;
  saveDistanceCache();
  return km;
}

async function calculateApproxDistance(from, to) {
  const fromCoords = await geocodeAddress(from);
  const toCoords = await geocodeAddress(to);
  if (!fromCoords || !toCoords) return null;

  try {
    return await routeDistanceKm(fromCoords, toCoords);
  } catch (err) {
    console.warn("OSRM indisponible, distance à vol d'oiseau utilisée", err);
    return Math.round(haversineDistanceKm(fromCoords, toCoords) * 1.25 * 10) / 10;
  }
}

function showToast(msg, duration = 3000) {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  toastMsg.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

