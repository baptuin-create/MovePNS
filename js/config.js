/* ═══════════════════════════════════════════════
   MOVEPNS – app.js
   Logique : Navigation · Auth · Trajets · CO₂
   Stockage : Google Sheets via Apps Script
═══════════════════════════════════════════════ */

"use strict";

/* ──────────────────────────────────────────────
   ⚙️  CONFIGURATION – À MODIFIER APRÈS DÉPLOIEMENT
────────────────────────────────────────────── */
var GAS_URL = "https://script.google.com/macros/s/AKfycbwndV41ldQZ7C5is6oB7yeydVRiTabhpqoLk4G92liGqfYzmqJp4AR0IqaCNxGzvFc4/exec";

/* ──────────────────────────────────────────────
   STATE
────────────────────────────────────────────── */
var state = {
  user: null,
  offers: [],
  users: [],
  friends: [],
  messages: [],
};
