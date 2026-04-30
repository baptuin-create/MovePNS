/* ──────────────────────────────────────────────
   PAGE TRAJETS
────────────────────────────────────────────── */
function renderOffers(offers) {
  const list = document.getElementById("offersList");
  list.innerHTML = "";

  if (offers.length === 0) {
    list.innerHTML = `<p style="text-align:center;color:var(--text-light);padding:3rem;">Aucun trajet trouvé.</p>`;
    return;
  }

  offers.forEach((o, i) => {
    const acceptedCount = (o.requests || []).filter((r) => r.status === "accepted").length;
    const remainingSeats = Math.max(0, Number(o.seats) - acceptedCount);
    const co2 = calcCo2(o.distance, 2);
    const card = document.createElement("div");
    card.className = "offer-card";
    card.style.animationDelay = `${i * 0.06}s`;
    card.innerHTML = `
      <div class="offer-avatar">${o.avatar}</div>
      <div class="offer-info">
        <div class="offer-name">${o.driver} <span style="font-weight:400;font-size:.85rem;color:var(--text-light);">&nbsp;·&nbsp;${o.promo}</span></div>
        <div class="offer-route">🏠 ${o.from} → 🏫 ${o.to || "Polytech Nice Sophia"}</div>
        <div class="offer-route" style="font-size:.8rem;color:var(--text-light);">📏 ${o.distance || "n/a"} km</div>
        <div class="offer-tags">
          <span class="offer-tag">🕗 ${o.time}</span>
          <span class="offer-tag">🔁 ${o.recur}</span>
          <span class="offer-tag">📞 ${o.tel || ""}</span>
          <span class="offer-tag eco">🌿 -${co2} kg CO₂</span>
          ${o.note ? `<div class="note-container"><span class="offer-tag note-tag">💬 Note</span><div class="offer-tooltip">${o.note}</div></div>` : ""}
        </div>
      </div>
      <div class="offer-actions">
        <div class="offer-seats">${remainingSeats} <span>place${remainingSeats > 1 ? "s" : ""} restante${remainingSeats > 1 ? "s" : ""}</span></div>
        <button class="btn-primary" style="font-size:.82rem;padding:.45rem 1rem;" data-id="${o.id}">Rejoindre</button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const offerId = +btn.dataset.id;
      const offer = state.offers.find((o) => o.id === offerId);
      if (!offer) return;

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
            const userPhone = user ? user.phone : "";
            const userPromo = user ? user.promo : "";
            return `
              <div class="request-item" data-offer-id="${offer.id}" data-req-idx="${idx}">
                <span>${userName} (${req.status}) ${userPhone ? `- ${userPhone}` : ""} ${userPromo ? `- ${userPromo}` : ""}</span>
                <div class="request-actions">
                  ${req.status === "pending" ? `
                    <button class="btn-accept">Accepter</button>
                    <button class="btn-reject">Refuser</button>
                  ` : ""}
                  <input type="text" placeholder="Commentaire" value="${req.comment}" class="comment-input" />
                  <button class="btn-save-comment">Sauvegarder</button>
                </div>
              </div>
            `;
          }).join("") : "<p>Aucune demande.</p>"}
        </div>
      `;
      container.appendChild(offerDiv);
    });
  }

  const myRequests = state.offers.filter((o) => o.requests && o.requests.some((r) => r.userEmail === state.user.email));
  if (myRequests.length > 0) {
    const requestsDiv = document.createElement("div");
    requestsDiv.className = "my-requests-section";
    requestsDiv.innerHTML = `<h2>Mes demandes de covoiturage</h2>`;

    myRequests.forEach((offer) => {
      const myReq = offer.requests.find((r) => r.userEmail === state.user.email);
      const driver = state.users.find((u) => u.email === offer.driverEmail);
      const driverPhone = driver ? driver.phone : "";
      const requestDiv = document.createElement("div");
      requestDiv.className = "my-request-card";
      requestDiv.innerHTML = `
        <h4>${offer.from} → Polytech Nice Sophia (${offer.time})</h4>
        <p>Conducteur: ${offer.driver} ${driverPhone ? `- ${driverPhone}` : ""}</p>
        <p>Statut: ${myReq.status}</p>
        ${myReq.comment ? `<p>Commentaire: ${myReq.comment}</p>` : ""}
      `;
      requestsDiv.appendChild(requestDiv);
    });

    container.appendChild(requestsDiv);
  }

  if (myOffers.length === 0 && myRequests.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:var(--text-light);padding:3rem;">Vous n'avez proposé aucun trajet et n'avez fait aucune demande.</p>`;
  }

  container.querySelectorAll(".btn-accept").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const item = btn.closest(".request-item");
    const offerId = +item.dataset.offerId;
    const reqIdx  = +item.dataset.reqIdx;

    const offer = state.offers.find((o) => o.id === offerId);
    if (!offer) return;

    const acceptedCount = (offer.requests || []).filter((r) => r.status === "accepted").length;

    if (acceptedCount >= Number(offer.seats)) {
      showToast("⚠️ Nombre maximum de passagers atteint");
      return;
    }

    await updateRequest(offerId, reqIdx, { status: "accepted" });
    renderMyTrips();
    showToast("✅ Demande acceptée");
  });
});

  container.querySelectorAll(".btn-reject").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item = btn.closest(".request-item");
      const offerId = +item.dataset.offerId;
      const reqIdx = +item.dataset.reqIdx;
      await updateRequest(offerId, reqIdx, { status: "rejected" });
      renderMyTrips();
      showToast("❌ Demande refusée");
    });
  });

  container.querySelectorAll(".btn-save-comment").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item = btn.closest(".request-item");
      const offerId = +item.dataset.offerId;
      const reqIdx = +item.dataset.reqIdx;
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
        ${state.users.map((u) => `<tr style='border-bottom:1px solid #ddd'><td>${u.email}</td><td>${u.first} ${u.last}</td><td>${u.phone || ""}</td><td>${u.promo}</td><td>${u.role}</td><td>${u.createdAt ? new Date(u.createdAt).toLocaleString() : ""}</td></tr>`).join("")}
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
      btn.addEventListener("click", async () => {
        const offerId = +btn.dataset.id;
        const offer = state.offers.find((o) => o.id === offerId);
        const updatedNote = prompt("Modifier la note du trajet :", offer.note || "");
        if (updatedNote !== null) {
          offer.note = updatedNote;
          localStorage.setItem("mpnsOffers", JSON.stringify(state.offers));
          await gasCall({ action: "updateOffer", offer });
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

