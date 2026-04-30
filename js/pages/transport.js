/* ──────────────────────────────────────────────
   PAGE TRANSPORTS – CARTE LEAFLET
────────────────────────────────────────────── */

var mapInstance = null;
var mapLayers = { train: [], tram: [], bus: [], bike: [] };

function initTransportMap() {
  if (mapInstance) {
    mapInstance.invalidateSize();
    return;
  }

  mapInstance = L.map("transportMap", {
    center: [43.62, 7.05],
    zoom: 11,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(mapInstance);

  const schoolIcon = L.divIcon({
    html: '<div style="background:#f4a261;border:3px solid #fff;border-radius:50%;width:22px;height:22px;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:11px;">🏫</div>',
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  L.marker([43.6165, 7.0676], { icon: schoolIcon })
    .addTo(mapInstance)
    .bindPopup(`<div class="popup-title">🏫 Polytech Nice Sophia</div><div class="popup-sub">Route des Colles, Sophia Antipolis</div>`);

  const trainLine = L.polyline([
    [43.7050, 7.2619], [43.6887, 7.2261], [43.6578, 7.1455],
    [43.6264, 7.1225], [43.5933, 7.0826], [43.5505, 7.0174],
    [43.5268, 6.9910], [43.5493, 6.9309],
  ], { color: "#e74c3c", weight: 4, opacity: .85, dashArray: "8,4" })
    .bindPopup(`<div class="popup-title">🚆 TER Nice–Antibes–Cannes</div><div class="popup-sub">Descendre à Antibes → Bus 230 vers Sophia</div>`);
  mapLayers.train.push(trainLine);
  trainLine.addTo(mapInstance);

  const stationIcon = (label) => L.divIcon({
    html: `<div style="background:#e74c3c;color:#fff;border-radius:6px;padding:2px 6px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">${label}</div>`,
    className: "",
    iconAnchor: [20, 10],
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

  const tramLine = L.polyline([
    [43.7040, 7.2756], [43.7023, 7.2662], [43.7013, 7.2592],
    [43.6971, 7.2454], [43.6920, 7.2300], [43.6887, 7.2165], [43.6887, 7.2050],
  ], { color: "#3498db", weight: 5, opacity: .9 })
    .bindPopup(`<div class="popup-title">🚊 Tramway T2 – Nice</div><div class="popup-sub">Correspondance Gare St-Augustin → TER</div>`);
  mapLayers.tram.push(tramLine);
  tramLine.addTo(mapInstance);

  const bus230 = L.polyline([
    [43.5933, 7.0826], [43.6005, 7.0660], [43.6108, 7.0710], [43.6165, 7.0676],
  ], { color: "#f39c12", weight: 4, opacity: .9 })
    .bindPopup(`<div class="popup-title">🚌 Bus 230 – Envibus</div><div class="popup-sub">Antibes Gare → Sophia Antipolis<br>Fréquence : 30 min en heure de pointe</div>`);
  mapLayers.bus.push(bus230);
  bus230.addTo(mapInstance);

  const bus11 = L.polyline([
    [43.7050, 7.2619], [43.6800, 7.2200], [43.6578, 7.1455],
    [43.6530, 7.1100], [43.6380, 7.0900], [43.6280, 7.0770], [43.6165, 7.0676],
  ], { color: "#9b59b6", weight: 4, opacity: .85, dashArray: "6,3" })
    .bindPopup(`<div class="popup-title">🚌 Bus 11 / Envibus</div><div class="popup-sub">Nice Centre → Sophia Antipolis<br>Via Cagnes & Villeneuve-Loubet</div>`);
  mapLayers.bus.push(bus11);
  bus11.addTo(mapInstance);

  const bus110 = L.polyline([
    [43.5493, 6.9309], [43.5700, 6.9600], [43.5900, 6.9900],
    [43.6050, 7.0200], [43.6165, 7.0676],
  ], { color: "#27ae60", weight: 4, opacity: .85, dashArray: "6,3" })
    .bindPopup(`<div class="popup-title">🚌 Bus 110 – Envibus</div><div class="popup-sub">Cannes Gare → Sophia Antipolis via Mougins</div>`);
  mapLayers.bus.push(bus110);
  bus110.addTo(mapInstance);

  const bus630 = L.polyline([
    [43.7050, 7.2619],
    [43.6950, 7.2500],
    [43.6700, 7.2000],
    [43.6530, 7.1500],
    [43.6450, 7.1200],
    [43.6350, 7.0950],
    [43.6250, 7.0800],
    [43.6165, 7.0676],
  ], { color: "#e84393", weight: 4, opacity: .9, dashArray: "4,2" })
    .bindPopup(`<div class="popup-title">🚌 ZOU ! Bus 630</div><div class="popup-sub">Nice Gare Routière → Sophia Antipolis<br>Réseau Zou – Région PACA<br>Fréquence : ~1h, tarif réduit étudiant</div>`);
  mapLayers.bus.push(bus630);
  bus630.addTo(mapInstance);

  const bus631 = L.polyline([
    [43.5933, 7.0826],
    [43.6000, 7.0720],
    [43.6100, 7.0700],
    [43.6165, 7.0676],
  ], { color: "#c0392b", weight: 4, opacity: .85, dashArray: "4,2" })
    .bindPopup(`<div class="popup-title">🚌 ZOU ! Bus 631</div><div class="popup-sub">Antibes → Sophia Antipolis<br>Réseau Zou – Région PACA</div>`);
  mapLayers.bus.push(bus631);
  bus631.addTo(mapInstance);

  const bikeIcon = L.divIcon({
    html: '<div style="background:#16a34a;border:2.5px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:10px;">🚲</div>',
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  [
    { pos: [43.7050, 7.2619], name: "Vélo Azur – Nice Gare", type: "Vélo Azur + Lime" },
    { pos: [43.7023, 7.2662], name: "Vélo Azur – Place Garibaldi", type: "Vélo Azur" },
    { pos: [43.6960, 7.2700], name: "Vélo Azur – Promenade", type: "Vélo Azur + Lime" },
    { pos: [43.7010, 7.2590], name: "Lime – Nice Centre", type: "Lime (vélo électrique)" },
    { pos: [43.6887, 7.2261], name: "Lime – Nice St-Augustin", type: "Lime (trottinette & vélo)" },
    { pos: [43.5933, 7.0826], name: "Lime – Antibes Gare", type: "Lime (trottinette & vélo)" },
    { pos: [43.5860, 7.1000], name: "Lime – Antibes Vieille Ville", type: "Lime" },
    { pos: [43.5493, 6.9309], name: "Lime – Cannes Gare", type: "Lime (trottinette & vélo)" },
    { pos: [43.5520, 6.9200], name: "Lime – Cannes Croisette", type: "Lime" },
    { pos: [43.6165, 7.0676], name: "Lime – Polytech / Sophia", type: "Lime (vélo électrique)" },
    { pos: [43.6200, 7.0650], name: "Lime – Sophia Village", type: "Lime" },
    { pos: [43.6578, 7.1455], name: "Lime – Cagnes Gare", type: "Lime" },
  ].forEach(({ pos, name, type }) => {
    const m = L.marker(pos, { icon: bikeIcon })
      .bindPopup(`<div class="popup-title">🚲 ${name}</div><div class="popup-sub">${type}</div>`);
    mapLayers.bike.push(m);
    m.addTo(mapInstance);
  });

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
