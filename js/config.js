/* ═══════════════════════════════════════════════
   MOVEPNS – app.js
   Logique : Navigation · Auth · Trajets · CO₂
   Stockage : Google Sheets via Apps Script
═══════════════════════════════════════════════ */

"use strict";

/* ──────────────────────────────────────────────
   ⚙️  CONFIGURATION – À MODIFIER APRÈS DÉPLOIEMENT
────────────────────────────────────────────── */
var GAS_URL = "https://script.google.com/macros/s/AKfycbzBqf6slRPiDX8qhJXz7-4xm57BO7uw1QBcGEeM2zbWM2yZjt81jGBiccUPnBV8XlB8/exec";

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
