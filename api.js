/* ──────────────────────────────────────────────
   COUCHE GOOGLE SHEETS
────────────────────────────────────────────── */

async function gasCall(payload) {
  if (!GAS_URL) return null;
  try {
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data && data.ok === false) {
      console.warn("GAS error pour", payload.action, ":", data.error);
    }
    return data;
  } catch (err) {
    console.warn("GAS inaccessible pour", payload.action, "— fallback localStorage", err.message);
    return null;
  }
}

async function loadUsers() {
  const raw = localStorage.getItem("mpnsUsers");
  state.users = raw ? JSON.parse(raw) : [];
  const data = await gasCall({ action: "getUsers" });
  if (data && data.ok && Array.isArray(data.users)) {
    state.users = data.users.filter((u) => u && typeof u === "object").map((u) => ({
      ...u,
      email:     String(u.email     || "").trim(),
      pwd:       String(u.pwd       || "").trim(),
      first:     String(u.first     || "").trim(),
      last:      String(u.last      || "").trim(),
      phone:     String(u.phone     || "").trim(),
      promo:     String(u.promo     || "").trim(),
      role:      String(u.role      || "user").trim(),
      createdAt: String(u.createdAt || "").trim(),
    }));
    localStorage.setItem("mpnsUsers", JSON.stringify(state.users));
  }
}

async function saveNewUser(user) {
  state.users.push(user);
  localStorage.setItem("mpnsUsers", JSON.stringify(state.users));
  await gasCall({ action: "addUser", user });
}

async function loadOffers() {
  const raw = localStorage.getItem("mpnsOffers");
  state.offers = raw ? JSON.parse(raw) : [...DEMO_OFFERS];
  const data = await gasCall({ action: "getOffers" });
  if (data && data.ok && Array.isArray(data.offers) && data.offers.length > 0) {
    state.offers = data.offers;
    localStorage.setItem("mpnsOffers", JSON.stringify(state.offers));
  }
}

async function saveNewOffer(offer) {
  state.offers.unshift(offer);
  localStorage.setItem("mpnsOffers", JSON.stringify(state.offers));
  await gasCall({ action: "addOffer", offer });
}

async function updateRequest(offerId, reqIdx, updates) {
  const offer = state.offers.find((o) => o.id === offerId);
  if (!offer) return;
  Object.assign(offer.requests[reqIdx], updates);
  localStorage.setItem("mpnsOffers", JSON.stringify(state.offers));
  await gasCall({ action: "updateOffer", offer });
}

async function deleteOffer(offerId) {
  state.offers = state.offers.filter((o) => o.id !== offerId);
  localStorage.setItem("mpnsOffers", JSON.stringify(state.offers));
  await gasCall({ action: "deleteOffer", offerId });
}

/* ──────────────────────────────────────────────
   COMPTE UTILISATEUR
────────────────────────────────────────────── */
async function updateCurrentUser(updates) {
  if (!state.user) return null;
  const updatedUser = { ...state.user, ...updates, email: state.user.email };
  const idx = state.users.findIndex((u) => String(u.email).toLowerCase() === String(state.user.email).toLowerCase());
  if (idx >= 0) state.users[idx] = { ...state.users[idx], ...updatedUser };
  state.user = { first: updatedUser.first, last: updatedUser.last, email: updatedUser.email, phone: updatedUser.phone || "", promo: updatedUser.promo, role: updatedUser.role || "user" };
  localStorage.setItem("mpnsUsers", JSON.stringify(state.users));
  await gasCall({ action: "updateUser", user: updatedUser });
  return updatedUser;
}

/* ──────────────────────────────────────────────
   AMIS
────────────────────────────────────────────── */
async function loadFriends() {
  // Toujours partir du localStorage d'abord
  const raw = localStorage.getItem("mpnsFriends");
  state.friends = raw ? JSON.parse(raw) : [];
  if (!state.user) return state.friends;

  const data = await gasCall({ action: "getFriends", email: state.user.email });
  if (data && data.ok && Array.isArray(data.friends)) {
    // Fusionner GAS + localStorage : priorité aux entrées GAS, garder les locales inconnues de GAS
    const gasIds = new Set(data.friends.map((f) => String(f.id)));
    const localOnly = state.friends.filter((f) => f.id && !gasIds.has(String(f.id)));
    state.friends = [...data.friends, ...localOnly];
    localStorage.setItem("mpnsFriends", JSON.stringify(state.friends));
  }
  return state.friends;
}

async function sendFriendRequest(toEmail) {
  if (!state.user || !toEmail) return null;
  const exists = state.friends.some(
    (f) => [f.from, f.to].includes(state.user.email) && [f.from, f.to].includes(toEmail)
  );
  if (exists) return { ok: true, alreadyExists: true };

  const id = Date.now();
  const request = { id, from: state.user.email, to: toEmail, status: "pending", createdAt: new Date().toISOString() };
  state.friends.push(request);
  localStorage.setItem("mpnsFriends", JSON.stringify(state.friends));

  const result = await gasCall({ action: "sendFriendRequest", request });
  // Si GAS retourne un id différent, on met à jour
  if (result && result.ok && result.id && String(result.id) !== String(id)) {
    const idx = state.friends.findIndex((f) => String(f.id) === String(id));
    if (idx >= 0) state.friends[idx].id = result.id;
    localStorage.setItem("mpnsFriends", JSON.stringify(state.friends));
  }
  return result;
}

async function acceptFriendRequest(friendId, otherEmail) {
  if (!state.user) return null;
  state.friends = state.friends.map((f) => {
    const sameById    = friendId && String(f.id) === String(friendId);
    const sameByEmail = otherEmail &&
      [f.from, f.to].includes(state.user.email) &&
      [f.from, f.to].includes(otherEmail);
    return (sameById || sameByEmail) ? { ...f, status: "accepted" } : f;
  });
  localStorage.setItem("mpnsFriends", JSON.stringify(state.friends));
  return await gasCall({ action: "acceptFriendRequest", id: friendId, userEmail: state.user.email, otherEmail });
}

function areFriends(emailA, emailB) {
  return state.friends.some(
    (f) => f.status === "accepted" &&
    [f.from, f.to].includes(emailA) &&
    [f.from, f.to].includes(emailB)
  );
}

function hasSentFirstMessage(toEmail) {
  return state.messages.some((m) => m.from === state.user.email && m.to === toEmail);
}

/* ──────────────────────────────────────────────
   MESSAGES
────────────────────────────────────────────── */
async function loadMessages() {
  const raw = localStorage.getItem("mpnsMessages");
  state.messages = raw ? JSON.parse(raw) : [];
  if (!state.user) return state.messages;

  const data = await gasCall({ action: "getMessages", email: state.user.email });
  if (data && data.ok && Array.isArray(data.messages)) {
    // Fusionner : priorité GAS, garder messages locaux non encore synchronisés
    const gasIds = new Set(data.messages.map((m) => String(m.id)));
    const localOnly = state.messages.filter((m) => !gasIds.has(String(m.id)));
    state.messages = [...data.messages, ...localOnly]
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    localStorage.setItem("mpnsMessages", JSON.stringify(state.messages));
  }
  return state.messages;
}

async function sendChatMessage(toEmail, content) {
  if (!state.user || !toEmail || !String(content || "").trim()) return null;

  const isFriend = areFriends(state.user.email, toEmail);
  const alreadySent = hasSentFirstMessage(toEmail);

  // Limite : 1 seul message possible si pas amis
  if (!isFriend && alreadySent) {
    showToast("⚠️ Devenez amis pour continuer la conversation !");
    return { ok: false, error: "not_friends_limit" };
  }

  const message = {
    id: Date.now(),
    from: state.user.email,
    to: toEmail,
    content: String(content).trim(),
    createdAt: new Date().toISOString()
  };

  state.messages.push(message);
  localStorage.setItem("mpnsMessages", JSON.stringify(state.messages));

  const result = await gasCall({ action: "sendMessage", message });
  if (!result || result.ok === false) {
    // GAS a échoué mais message déjà en localStorage — pas bloquant
    console.warn("Message sauvegardé localement uniquement");
  }
  return result || { ok: true };
}
