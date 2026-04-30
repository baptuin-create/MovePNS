/* ──────────────────────────────────────────────
   PAGE CHAT + AMIS — interface type app de messagerie
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
  const parts = [u.promo, u.email].filter(Boolean);
  return parts.join(" · ");
}

function getInitial(email) {
  const label = getUserLabel(email).trim();
  return (label.charAt(0) || "?").toUpperCase();
}

function userMatchesSearch(user, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return false;
  return [user.first, user.last, user.email, user.promo]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q);
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
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function getChatContacts(query = "") {
  const q = String(query || "").trim();
  const emails = new Set();

  if (q) {
    state.users
      .filter((u) => u.email !== state.user.email && userMatchesSearch(u, q))
      .forEach((u) => emails.add(u.email));
  }

  state.messages.forEach((m) => {
    if (m.from === state.user.email) emails.add(m.to);
    if (m.to === state.user.email) emails.add(m.from);
  });

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

function getFriendStatusLabel(email) {
  const rel = state.friends.find((f) => [f.from, f.to].includes(state.user.email) && [f.from, f.to].includes(email));
  if (!rel) return "Non ami · 1 message possible";
  if (rel.status === "accepted") return "En ligne";
  if (rel.from === state.user.email) return "Demande envoyée";
  return "Demande reçue";
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
    return `<div class="chat-empty-state chat-empty-chat"><span>💬</span><strong>Aucun message</strong><p>Envoie un premier message. Ensuite, il faudra devenir amis pour continuer.</p></div>`;
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

  const list = document.getElementById("chatContacts");
  const friendBox = document.getElementById("friendRequests");
  const title = document.getElementById("chatTitle");
  const subtitle = document.getElementById("chatSubtitle");
  const headerAvatar = document.getElementById("chatHeaderAvatar");
  const messagesBox = document.getElementById("chatMessages");
  const searchInput = document.getElementById("chatSearch");
  const searchHint = document.getElementById("chatSearchHint");
  const railAvatar = document.getElementById("chatRailAvatar");
  const railName = document.getElementById("chatRailName");
  if (!list || !friendBox || !title || !messagesBox) return;

  if (railAvatar) railAvatar.textContent = getInitial(state.user.email);
  if (railName) railName.textContent = state.user.first || "Moi";
  if (searchInput && searchInput.value !== chatSearchQuery) searchInput.value = chatSearchQuery;

  const incoming = state.friends.filter((f) => f.to === state.user.email && f.status === "pending");
  friendBox.innerHTML = incoming.length ? incoming.map((f) => `
    <div class="friend-request" data-id="${f.id || ''}" data-email="${f.from}">
      <span class="mini-avatar">${getInitial(f.from)}</span>
      <span><strong>${getUserLabel(f.from)}</strong><small>${getUserMeta(f.from)}</small></span>
      <button class="btn-primary btn-accept-friend">Accepter</button>
    </div>`).join("") : `<p class="muted">Aucune demande en attente.</p>`;

  friendBox.querySelectorAll(".btn-accept-friend").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item = btn.closest(".friend-request");
      await acceptFriendRequest(item.dataset.id, item.dataset.email);
      selectedChatEmail = item.dataset.email;
      showToast("✅ Demande d'ami acceptée");
      renderChatPage();
    });
  });

  const contacts = getChatContacts(chatSearchQuery);
  const hasQuery = chatSearchQuery.trim().length > 0;

  if (searchHint) {
    searchHint.textContent = hasQuery
      ? `${contacts.length} résultat(s) trouvé(s)`
      : "Tes conversations et amis récents sont affichés ici.";
  }

  list.innerHTML = contacts.length ? contacts.map((email, idx) => {
    const active = email === selectedChatEmail;
    const last = getLastMessage(email);
    const preview = last ? last.content : getFriendStatusLabel(email);
    const unread = !active && last && last.to === state.user.email ? 1 : 0;
    return `<button class="chat-contact ${active ? 'active' : ''}" data-email="${email}">
      <span class="chat-avatar color-${idx % 6}">${getInitial(email)}<i></i></span>
      <span class="chat-contact-main">
        <strong>${getUserLabel(email)}</strong>
        <small>${preview}</small>
      </span>
      <span class="chat-time">${formatChatTime(last?.createdAt)}</span>
      ${unread ? `<b class="chat-unread">${unread}</b>` : ""}
    </button>`;
  }).join("") : `<div class="chat-empty-state small">
      <strong>Aucun résultat</strong>
      <p>Essaie avec un prénom, un nom ou un email.</p>
    </div>`;

  list.querySelectorAll(".chat-contact").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedChatEmail = btn.dataset.email;
      renderChatPage();
    });
  });

  if (!selectedChatEmail) {
    title.textContent = "Choisis un contact";
    if (subtitle) subtitle.textContent = "Recherche une personne pour commencer à discuter";
    if (headerAvatar) headerAvatar.textContent = "💬";
    messagesBox.innerHTML = `<div class="chat-empty-state chat-empty-chat"><span>💬</span><strong>Sélectionne une conversation</strong><p>Recherche un utilisateur ou ouvre une conversation existante.</p></div>`;
    return;
  }

  title.textContent = getUserLabel(selectedChatEmail);
  if (subtitle) subtitle.textContent = getFriendStatusLabel(selectedChatEmail);
  if (headerAvatar) headerAvatar.textContent = getInitial(selectedChatEmail);

  const thread = getThreadWith(selectedChatEmail);
  messagesBox.innerHTML = renderMessageThread(thread);
  messagesBox.scrollTop = messagesBox.scrollHeight;

  const friendBtn = document.getElementById("btnAskFriend");
  if (friendBtn) {
    const isFriend = areFriends(state.user.email, selectedChatEmail);
    const rel = state.friends.find((f) => [f.from, f.to].includes(state.user.email) && [f.from, f.to].includes(selectedChatEmail));
    friendBtn.disabled = isFriend || (rel && rel.from === state.user.email && rel.status === "pending");
    friendBtn.textContent = isFriend ? "✓" : (friendBtn.disabled ? "…" : "☆");
    friendBtn.title = isFriend ? "Vous êtes amis" : (friendBtn.disabled ? "Demande envoyée" : "Demander en ami");
  }
}

function initChatPage() {
  const sendBtn = document.getElementById("btnSendChat");
  const friendBtn = document.getElementById("btnAskFriend");
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
      if (e.key === "Enter") {
        e.preventDefault();
        sendBtn.click();
      }
    });
  }

  if (friendBtn) friendBtn.addEventListener("click", async () => {
    if (!selectedChatEmail) { showToast("⚠️ Choisis un contact"); return; }
    await sendFriendRequest(selectedChatEmail);
    showToast("🤝 Demande d'ami envoyée");
    renderChatPage();
  });
}
