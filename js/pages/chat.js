/* ──────────────────────────────────────────────
   PAGE CHAT + AMIS
────────────────────────────────────────────── */
var selectedChatEmail = "";
var chatSearchQuery = "";

function getUserLabel(email) {
  const u = state.users.find((x) => String(x.email).toLowerCase() === String(email).toLowerCase());
  return u ? `${u.first} ${u.last}`.trim() : email;
}

function getUserMeta(email) {
  const u = state.users.find((x) => String(x.email).toLowerCase() === String(email).toLowerCase());
  if (!u) return email;
  return [u.promo, u.email].filter(Boolean).join(" · ");
}

function getInitial(email) {
  return (getUserLabel(email).trim().charAt(0) || "?").toUpperCase();
}

function userMatchesSearch(user, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return false;
  return [user.first, user.last, user.email, user.promo]
    .filter(Boolean).join(" ").toLowerCase().includes(q);
}

function getThreadWith(email) {
  return state.messages
    .filter((m) =>
      (m.from === state.user.email && m.to === email) ||
      (m.from === email && m.to === state.user.email)
    )
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

function getLastMessage(email) {
  const thread = getThreadWith(email);
  return thread.length ? thread[thread.length - 1] : null;
}

function formatChatTime(dateValue) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function getFriendStatus(email) {
  const rel = state.friends.find((f) =>
    [f.from, f.to].includes(state.user.email) && [f.from, f.to].includes(email)
  );
  if (!rel) return "none";
  if (rel.status === "accepted") return "friends";
  if (rel.from === state.user.email) return "sent";
  return "received";
}

function getChatContacts(query = "") {
  const q = String(query || "").trim();
  const emails = new Set();

  // Si recherche active → chercher dans tous les users
  if (q) {
    state.users
      .filter((u) => u.email !== state.user.email && userMatchesSearch(u, q))
      .forEach((u) => emails.add(u.email));
  }

  // Conversations existantes
  state.messages.forEach((m) => {
    if (m.from === state.user.email) emails.add(m.to);
    if (m.to === state.user.email) emails.add(m.from);
  });

  // Amis
  state.friends.forEach((f) => {
    if ([f.from, f.to].includes(state.user.email)) {
      emails.add(f.from === state.user.email ? f.to : f.from);
    }
  });

  return [...emails]
    .filter((email) => email && email !== state.user.email)
    .sort((a, b) => {
      const la = getLastMessage(a);
      const lb = getLastMessage(b);
      if (la || lb) return String(lb?.createdAt || "").localeCompare(String(la?.createdAt || ""));
      return getUserLabel(a).localeCompare(getUserLabel(b));
    });
}

function getDateSeparator(dateValue) {
  if (!dateValue) return "Aujourd'hui";
  const d = new Date(dateValue);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function renderMessageThread(thread) {
  if (!thread.length) {
    return `<div class="chat-empty-state chat-empty-chat"><span>💬</span><strong>Aucun message</strong><p>Envoie un premier message pour démarrer la conversation.</p></div>`;
  }
  let lastDateLabel = "";
  return thread.map((m) => {
    const label = getDateSeparator(m.createdAt);
    const separator = label !== lastDateLabel ? `<div class="chat-date-separator">${label}</div>` : "";
    lastDateLabel = label;
    const mine = m.from === state.user.email;
    return `${separator}
      <div class="chat-row ${mine ? "mine" : "theirs"}">
        ${mine ? "" : `<span class="chat-bubble-avatar">${getInitial(m.from)}</span>`}
        <div class="chat-message ${mine ? "mine" : "theirs"}">
          <div class="chat-bubble-text">${m.content}</div>
          <small>${new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}${mine ? " ✓✓" : ""}</small>
        </div>
        ${mine ? `<span class="chat-bubble-avatar mine-avatar">${getInitial(state.user.email)}</span>` : ""}
      </div>`;
  }).join("");
}

async function renderChatPage() {
  if (!state.user) return;
  await loadUsers();
  await loadFriends();
  await loadMessages();

  const list        = document.getElementById("chatContacts");
  const friendBox   = document.getElementById("friendRequests");
  const title       = document.getElementById("chatTitle");
  const subtitle    = document.getElementById("chatSubtitle");
  const headerAvatar = document.getElementById("chatHeaderAvatar");
  const messagesBox = document.getElementById("chatMessages");
  const searchInput = document.getElementById("chatSearch");
  const searchHint  = document.getElementById("chatSearchHint");
  const railAvatar  = document.getElementById("chatRailAvatar");
  const railName    = document.getElementById("chatRailName");
  if (!list || !friendBox || !title || !messagesBox) return;

  if (railAvatar) railAvatar.textContent = getInitial(state.user.email);
  if (railName)   railName.textContent   = state.user.first || "Moi";
  if (searchInput && searchInput.value !== chatSearchQuery) searchInput.value = chatSearchQuery;

  /* ── Demandes d'ami reçues ── */
  const incoming = state.friends.filter(
    (f) => f.to === state.user.email && f.status === "pending"
  );
  if (incoming.length) {
    friendBox.innerHTML = incoming.map((f) => `
      <div class="friend-request" data-id="${f.id || ''}" data-email="${f.from}">
        <span class="mini-avatar">${getInitial(f.from)}</span>
        <span>
          <strong>${getUserLabel(f.from)}</strong>
          <small>${getUserMeta(f.from)}</small>
        </span>
        <button class="btn-accept-friend btn-friend-action btn-accept">✓ Accepter</button>
      </div>`).join("");

    friendBox.querySelectorAll(".btn-accept-friend").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const item = btn.closest(".friend-request");
        btn.textContent = "…";
        btn.disabled = true;
        await acceptFriendRequest(item.dataset.id, item.dataset.email);
        showToast("✅ Vous êtes maintenant amis !");
        selectedChatEmail = item.dataset.email;
        renderChatPage();
      });
    });

    document.querySelector(".friend-zone").style.display = "";
  } else {
    friendBox.innerHTML = `<p class="muted">Aucune demande en attente.</p>`;
  }

  /* ── Liste des contacts ── */
  const contacts = getChatContacts(chatSearchQuery);
  const hasQuery = chatSearchQuery.trim().length > 0;

  if (searchHint) {
    searchHint.textContent = hasQuery
      ? `${contacts.length} résultat(s) — clique sur un contact pour lui écrire ou l'ajouter en ami`
      : "Tes conversations et amis récents sont affichés ici.";
  }

  list.innerHTML = contacts.length ? contacts.map((email, idx) => {
    const active  = email === selectedChatEmail;
    const last    = getLastMessage(email);
    const status  = getFriendStatus(email);
    const preview = last ? last.content
      : status === "friends"  ? "Ami · Envoie un message"
      : status === "sent"     ? "Demande envoyée…"
      : status === "received" ? "⚡ Demande reçue !"
      : "Envoie un message pour commencer";
    const unread  = !active && last && last.to === state.user.email ? 1 : 0;

    // Badge statut ami
    const friendBadge = status === "friends"
      ? `<span class="contact-friend-badge friend-ok" title="Amis">✓</span>`
      : status === "sent"
      ? `<span class="contact-friend-badge friend-pending" title="Demande envoyée">…</span>`
      : status === "received"
      ? `<span class="contact-friend-badge friend-incoming" title="Demande reçue !">!</span>`
      : `<button class="contact-add-friend" data-email="${email}" title="Ajouter en ami">+ Ami</button>`;

    return `<button class="chat-contact ${active ? 'active' : ''}" data-email="${email}">
      <span class="chat-avatar color-${idx % 6}">${getInitial(email)}<i></i></span>
      <span class="chat-contact-main">
        <strong>${getUserLabel(email)}</strong>
        <small>${preview}</small>
      </span>
      <span class="chat-contact-right">
        <span class="chat-time">${formatChatTime(last?.createdAt)}</span>
        ${unread ? `<b class="chat-unread">${unread}</b>` : ""}
      </span>
      ${friendBadge}
    </button>`;
  }).join("") : hasQuery
    ? `<div class="chat-empty-state small"><strong>Aucun résultat</strong><p>Essaie avec un prénom, un nom ou un email.</p></div>`
    : `<div class="chat-empty-state small"><strong>Aucune conversation</strong><p>Recherche un utilisateur pour commencer.</p></div>`;

  /* Clic sur un contact → ouvre la conversation */
  list.querySelectorAll(".chat-contact").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // Ne pas déclencher si on clique sur le bouton "+ Ami"
      if (e.target.closest(".contact-add-friend")) return;
      selectedChatEmail = btn.dataset.email;
      renderChatPage();
    });
  });

  /* Bouton "+ Ami" dans la liste */
  list.querySelectorAll(".contact-add-friend").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const email = btn.dataset.email;
      btn.textContent = "…";
      btn.disabled = true;
      await sendFriendRequest(email);
      showToast(`🤝 Demande envoyée à ${getUserLabel(email)} !`);
      renderChatPage();
    });
  });

  /* ── Panel droit ── */
  if (!selectedChatEmail) {
    title.textContent = "Messages";
    if (subtitle)     subtitle.textContent = "Sélectionne une conversation ou recherche un utilisateur";
    if (headerAvatar) headerAvatar.textContent = "💬";
    messagesBox.innerHTML = `<div class="chat-empty-state chat-empty-chat">
      <span>💬</span>
      <strong>Sélectionne une conversation</strong>
      <p>Recherche un prénom ou un email dans la barre de gauche pour trouver un utilisateur.</p>
    </div>`;
    updateFriendBtn(null);
    return;
  }

  title.textContent = getUserLabel(selectedChatEmail);
  if (subtitle)     subtitle.textContent = _friendStatusLabel(selectedChatEmail);
  if (headerAvatar) headerAvatar.textContent = getInitial(selectedChatEmail);

  const thread = getThreadWith(selectedChatEmail);
  messagesBox.innerHTML = renderMessageThread(thread);
  messagesBox.scrollTop = messagesBox.scrollHeight;

  updateFriendBtn(selectedChatEmail);
}

function _friendStatusLabel(email) {
  const status = getFriendStatus(email);
  if (status === "friends")  return "✓ Amis";
  if (status === "sent")     return "Demande d'ami envoyée…";
  if (status === "received") return "⚡ A envoyé une demande d'ami !";
  return "Pas encore amis · 1 message possible";
}

function updateFriendBtn(email) {
  const friendBtn = document.getElementById("btnAskFriend");
  if (!friendBtn) return;
  if (!email) {
    friendBtn.style.display = "none";
    return;
  }
  friendBtn.style.display = "";
  const status = getFriendStatus(email);
  if (status === "friends") {
    friendBtn.textContent = "✓ Amis";
    friendBtn.className = "chat-friend-pill is-friend";
    friendBtn.disabled = true;
  } else if (status === "sent") {
    friendBtn.textContent = "⏳ Demande envoyée";
    friendBtn.className = "chat-friend-pill is-pending";
    friendBtn.disabled = true;
  } else if (status === "received") {
    friendBtn.innerHTML = `<span class="friend-btn-icon">✓</span><span class="friend-btn-label">Accepter la demande</span>`;
    friendBtn.className = "chat-friend-pill is-incoming";
    friendBtn.disabled = false;
  } else {
    friendBtn.innerHTML = `<span class="friend-btn-icon">👤</span><span class="friend-btn-label">Ajouter en ami</span>`;
    friendBtn.className = "chat-friend-pill";
    friendBtn.disabled = false;
  }
}

function initChatPage() {
  const sendBtn     = document.getElementById("btnSendChat");
  const friendBtn   = document.getElementById("btnAskFriend");
  const searchInput = document.getElementById("chatSearch");

  document.querySelectorAll(".chat-rail-item[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.page));
  });

  const seeAll = document.querySelector(".chat-see-all");
  if (seeAll) seeAll.addEventListener("click", () => {
    chatSearchQuery = "";
    if (searchInput) searchInput.value = "";
    renderChatPage();
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      chatSearchQuery = searchInput.value;
      renderChatPage();
    });
  }

  if (sendBtn) sendBtn.addEventListener("click", async () => {
    const input = document.getElementById("chatInput");
    if (!selectedChatEmail) { showToast("⚠️ Choisis un contact"); return; }
    const result = await sendChatMessage(selectedChatEmail, input.value);
    if (result && result.ok !== false) {
      input.value = "";
      renderChatPage();
    }
  });

  const input = document.getElementById("chatInput");
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); sendBtn.click(); }
    });
  }

  if (friendBtn) friendBtn.addEventListener("click", async () => {
    if (!selectedChatEmail) return;
    const status = getFriendStatus(selectedChatEmail);
    if (status === "received") {
      // Accepter la demande
      const rel = state.friends.find((f) =>
        [f.from, f.to].includes(state.user.email) && [f.from, f.to].includes(selectedChatEmail)
      );
      friendBtn.textContent = "…";
      friendBtn.disabled = true;
      await acceptFriendRequest(rel?.id || "", selectedChatEmail);
      showToast("✅ Vous êtes maintenant amis !");
    } else if (status === "none") {
      friendBtn.textContent = "⏳ Envoi…";
      friendBtn.disabled = true;
      await sendFriendRequest(selectedChatEmail);
      showToast(`🤝 Demande envoyée à ${getUserLabel(selectedChatEmail)} !`);
    }
    renderChatPage();
  });
}
