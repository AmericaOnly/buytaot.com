import { giveawayConfig as cfg, winnerHistory } from "./giveaways-data.js";

const root = document.getElementById("giveawayApp");
const $ = (sel) => root.querySelector(sel);
const fmt = (n) => Number(n).toLocaleString("en-US");
const short = (addr) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;
const norm = (addr) => String(addr || "").trim().toLowerCase();
const REMEMBER_KEY = "taot-giveaway-wallet";

function weekLabel(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// ── Sample / bonus banners ─────────────────────────────────────
if (cfg.isSampleData) $("[data-sample-note]").hidden = false;

const basePool = cfg.prizes.first + cfg.prizes.second + cfg.prizes.third;
if (cfg.mysteryBonus?.active) {
  $("[data-bonus]").hidden = false;
  $("[data-bonus-amount]").textContent = fmt(cfg.mysteryBonus.extraTaot);
  $("[data-pool]").textContent = fmt(basePool + cfg.mysteryBonus.extraTaot);
} else {
  $("[data-pool]").textContent = fmt(basePool);
}

// ── Countdown to next Winner Wednesday (US Eastern) ────────────
const etParts = (date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", hourCycle: "h23",
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric", weekday: "short",
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    y: +get("year"), mo: +get("month"), d: +get("day"),
    h: +get("hour"), mi: +get("minute"), s: +get("second"), wd: days[get("weekday")],
  };
};

function msUntilAnnouncement(now = new Date()) {
  const p = etParts(now);
  const { weekday, hour, minute } = cfg.announcement;
  let addDays = (weekday - p.wd + 7) % 7;
  const nowSecs = p.h * 3600 + p.mi * 60 + p.s;
  const targetSecs = hour * 3600 + minute * 60;
  if (addDays === 0 && nowSecs >= targetSecs) addDays = 7;
  return (addDays * 86400 + targetSecs - nowSecs) * 1000;
}

const cd = {
  d: $('[data-cd="d"]'), h: $('[data-cd="h"]'), m: $('[data-cd="m"]'), s: $('[data-cd="s"]'),
};
const pad = (n) => String(n).padStart(2, "0");
function tick() {
  const total = Math.max(0, Math.floor(msUntilAnnouncement() / 1000));
  cd.d.textContent = Math.floor(total / 86400);
  cd.h.textContent = pad(Math.floor((total % 86400) / 3600));
  cd.m.textContent = pad(Math.floor((total % 3600) / 60));
  cd.s.textContent = pad(total % 60);
}
$("[data-announce-label]").textContent = `Winners announced every ${cfg.announcement.label}`;
tick();
setInterval(tick, 1000);

// Next monthly grand prize = last Wednesday of the month containing the next announcement
(function nextGrand() {
  const next = new Date(Date.now() + msUntilAnnouncement());
  const p = etParts(next);
  const lastDay = new Date(p.y, p.mo, 0).getDate();
  let lastWed = lastDay;
  while (new Date(p.y, p.mo - 1, lastWed).getDay() !== cfg.announcement.weekday) lastWed--;
  let y = p.y, mo = p.mo;
  if (p.d > lastWed) {
    mo += 1; if (mo > 12) { mo = 1; y += 1; }
    const ld = new Date(y, mo, 0).getDate();
    lastWed = ld;
    while (new Date(y, mo - 1, lastWed).getDay() !== cfg.announcement.weekday) lastWed--;
  }
  const label = new Date(y, mo - 1, lastWed).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  $("[data-next-grand]").innerHTML = `Next grand prize drawing: <b>${label}</b>`;
})();

// ── Winners ────────────────────────────────────────────────────
function winnerItem(place, medal, amount, addr) {
  const li = document.createElement("li");
  li.className = `gw-winner gw-winner-${place}`;
  li.innerHTML = `
    <span class="gw-winner-medal" aria-hidden="true">${medal}</span>
    <span class="gw-winner-place">${place === "grand" ? "Grand Prize" : place.replace("first", "1st").replace("second", "2nd").replace("third", "3rd") + " Place"}</span>
    <span class="gw-winner-amount">${fmt(amount)} TAOT</span>
    <button type="button" class="gw-addr" title="Copy full wallet address">
      <code>${short(addr)}</code><span class="gw-copy">Copy</span>
    </button>
    <code class="gw-addr-full">${addr}</code>`;
  li.querySelector(".gw-addr").addEventListener("click", async (e) => {
    const tag = e.currentTarget.querySelector(".gw-copy");
    try { await navigator.clipboard.writeText(addr); tag.textContent = "Copied!"; }
    catch { tag.textContent = "Tap & hold below"; li.classList.add("show-full"); }
    setTimeout(() => (tag.textContent = "Copy"), 1600);
  });
  return li;
}

const latest = winnerHistory[0];
if (!latest) {
  const next = new Date(Date.now() + msUntilAnnouncement());
  const label = next.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" });
  $("#winners-title").textContent = "First winners coming soon";
  $("[data-winners-week]").innerHTML = `The first three winning wallets will be posted here on <b>${label}</b>. Check back to see if yours is one of them.`;
  $("[data-podium]").remove();
  root.querySelector(".gw-history").remove();
  root.querySelector(".gw-check > label").innerHTML = `<b>Save your wallet now.</b> Tick "Remember my wallet" and we'll check it for you automatically every time you visit.`;
}
if (latest) {
  $("[data-winners-week]").textContent = `Drawing of ${weekLabel(latest.weekOf)}`;
  const podium = $("[data-podium]");
  if (latest.grandPrize) podium.append(winnerItem("grand", "👑", 10000, latest.grandPrize));
  podium.append(
    winnerItem("first", "🥇", cfg.prizes.first, latest.first),
    winnerItem("second", "🥈", cfg.prizes.second, latest.second),
    winnerItem("third", "🥉", cfg.prizes.third, latest.third),
  );
}

if (latest) $("[data-history]").innerHTML = winnerHistory.map((w) => `
  <div class="gw-history-week">
    <b>${weekLabel(w.weekOf)}</b>
    <ul>
      ${w.grandPrize ? `<li><span>👑 10,000</span><code>${w.grandPrize}</code></li>` : ""}
      <li><span>🥇 ${fmt(cfg.prizes.first)}</span><code>${w.first}</code></li>
      <li><span>🥈 ${fmt(cfg.prizes.second)}</span><code>${w.second}</code></li>
      <li><span>🥉 ${fmt(cfg.prizes.third)}</span><code>${w.third}</code></li>
    </ul>
  </div>`).join("");

// ── Wallet checker ─────────────────────────────────────────────
const form = $("[data-check-form]");
const input = $("[data-check-input]");
const remember = $("[data-remember]");
const result = $("[data-check-result]");

function checkWallet(raw) {
  const addr = norm(raw);
  result.hidden = false;
  result.className = "gw-check-result";
  if (!/^0x[0-9a-f]{40}$/.test(addr)) {
    result.classList.add("is-error");
    result.textContent = "That doesn't look like a wallet address. It should start with 0x and be 42 characters long.";
    return;
  }
  loadStatus(addr);
  const wins = [];
  for (const w of winnerHistory) {
    if (norm(w.grandPrize) === addr) wins.push({ week: w.weekOf, prize: 10000, place: "Grand Prize" });
    if (norm(w.first) === addr) wins.push({ week: w.weekOf, prize: cfg.prizes.first, place: "1st Place" });
    if (norm(w.second) === addr) wins.push({ week: w.weekOf, prize: cfg.prizes.second, place: "2nd Place" });
    if (norm(w.third) === addr) wins.push({ week: w.weekOf, prize: cfg.prizes.third, place: "3rd Place" });
  }
  if (!winnerHistory.length) {
    result.classList.add("is-miss");
    result.innerHTML = `<b>No drawings yet.</b> The first winners are announced this Wednesday. Come back then to see if this wallet won.`;
  } else if (wins.length) {
    result.classList.add("is-win");
    result.innerHTML = `<b>🎉 Congratulations, you're a winner!</b><ul>${wins
      .map((x) => `<li>${x.place}: <b>${fmt(x.prize)} TAOT</b> (${weekLabel(x.week)})</li>`).join("")}</ul>
      <small>Prizes are sent to the winning wallet. TAOT will never DM you or ask for your recovery phrase.</small>`;
  } else {
    result.classList.add("is-miss");
    result.innerHTML = `<b>Not this time.</b> A new week means a new chance to win. Enter this week's giveaway and check back on Winner Wednesday.`;
  }
}

// ── Live status from the TAOT tracker: this week's buys, tier, streak ─────
const statusBox = $("[data-status]");
const trackerBase = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://localhost:4747"
  : cfg.trackerUrl;
const money = (n) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const BADGE_STEPS = [{ name: "Bronze", weeks: 4 }, { name: "Silver", weeks: 8 }, { name: "Gold", weeks: 12 }];
let statusReq = 0;

async function loadStatus(addr) {
  if (!trackerBase) return;
  const req = ++statusReq;
  statusBox.hidden = false;
  statusBox.innerHTML = `<p class="gw-status-loading">Loading your streak…</p>`;
  let s;
  try {
    const r = await fetch(`${trackerBase}/public/giveaway/wallet/${addr}`, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    s = await r.json();
  } catch {
    if (req === statusReq) statusBox.innerHTML = `<p class="gw-status-loading">Your streak couldn't load right now. Try again in a minute.</p>`;
    return;
  }
  if (req !== statusReq) return;
  const w = s.thisWeek, st = s.streak;
  const closes = new Date(s.window.end).toLocaleString("en-US", { weekday: "long", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
  const places = [["1st", 1], ["2nd", 2], ["3rd", 3]];
  const inDraw = new Set(w.eligibleFor);
  const pct = Math.min(100, (st.current / 12) * 100);

  let headline;
  if (w.free) headline = `You're entered in all three drawings this week with a free entry.`;
  else if (w.tier) headline = `You're in the ${w.eligibleFor.join(", ").replace(/, ([^,]*)$/, " and $1")} place drawing${w.eligibleFor.length > 1 ? "s" : ""} this week.`;
  else headline = `You're not entered this week yet.`;
  const nudge = w.nextTier
    ? `Buy <b>${money(w.nextTier.needUsd)}</b> more TAOT before ${closes} ET to enter the <b>${w.nextTier.label}</b> drawing.`
    : w.tier === 1 ? `You've reached the top tier. Good luck on Winner Wednesday!` : "";
  const streakLine = st.current
    ? (st.qualifiedThisWeek ? `${st.current}-week streak` : `${st.current}-week streak. Enter this week to keep it going!`)
    : "Start your streak this week";

  statusBox.innerHTML = `
    <div class="gw-status-head">
      <span class="gw-status-flame" aria-hidden="true">🔥</span>
      <div><b>${streakLine}</b><small>${st.badge ? `${st.badge} badge earned` : "No badge yet"}${st.nextBadge ? ` · ${st.weeksToNext} more week${st.weeksToNext === 1 ? "" : "s"} to ${st.nextBadge}` : " · Top badge reached"}</small></div>
    </div>
    <div class="gw-streak-track" aria-label="Streak progress toward badges">
      <span class="gw-streak-fill" style="width:${pct}%"></span>
      ${BADGE_STEPS.map((b) => `<i class="${st.best >= b.weeks ? "got" : ""} b-${b.name.toLowerCase()}" style="left:${(b.weeks / 12) * 100}%"><em>${b.name}</em></i>`).join("")}
    </div>
    <div class="gw-week">
      <p class="gw-week-label">This week · closes ${closes} ET</p>
      <p class="gw-week-amount">${money(w.net)} <small>net TAOT bought</small></p>
      <div class="gw-week-draws">${places.map(([p, t]) => `<span class="${inDraw.has(p) ? "on" : ""} t${t}">${inDraw.has(p) ? "✓" : "✕"} ${p} place</span>`).join("")}</div>
      <p class="gw-week-msg">${headline}${nudge ? `<br>${nudge}` : ""}</p>
    </div>
    ${s.history.length > 1 ? `<div class="gw-weeks" aria-label="Recent weeks">${s.history.map((h) => `<span class="${h.tier ? "on" : ""} ${h.open ? "open" : ""}" title="${h.drawingDate}">${h.tier ? "✓" : ""}</span>`).join("")}</div>` : ""}
    <p class="gw-status-foot">Net buys = TAOT bought minus TAOT sold during this week's entry window, in USD at the time of each trade. Updates about once a minute.${s.countedAs ? " Buys from your linked app wallet are included." : ""}</p>`;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  checkWallet(input.value);
  try {
    if (remember.checked) localStorage.setItem(REMEMBER_KEY, norm(input.value));
    else localStorage.removeItem(REMEMBER_KEY);
  } catch { /* storage unavailable */ }
});

remember.addEventListener("change", () => {
  try { if (!remember.checked) localStorage.removeItem(REMEMBER_KEY); } catch {}
});

try {
  const saved = localStorage.getItem(REMEMBER_KEY);
  if (saved) {
    input.value = saved;
    remember.checked = true;
    checkWallet(saved);
  }
} catch { /* storage unavailable */ }

// ── Milestones ────────────────────────────────────────────────
(function milestones() {
  const n = cfg.appDownloads;
  const ms = cfg.milestones;
  const next = ms.find((m) => n < m.downloads);
  const max = ms[ms.length - 1].downloads;
  if (n == null) {
    $("[data-milestone-short]").innerHTML = `${ms.length}<small>milestones</small>`;
    $("[data-progress]").remove();
    $("[data-milestones]").innerHTML = ms.map((m) => `
      <li><span class="gw-ms-dot" aria-hidden="true"></span><b>${fmt(m.downloads)}</b><span>${m.reward}</span></li>`).join("");
    return;
  }
  $("[data-milestone-short]").innerHTML = `${fmt(n)}<small>downloads</small>`;
  const target = next ? next.downloads : max;
  $("[data-progress-fill]").style.width = `${Math.min(100, (n / target) * 100)}%`;
  $("[data-progress-label]").innerHTML = next
    ? `<b>${fmt(n)}</b> of ${fmt(next.downloads)} downloads. <b>${fmt(next.downloads - n)}</b> to go until: ${next.reward}`
    : `<b>${fmt(n)}</b> downloads. Every milestone unlocked!`;
  $("[data-milestones]").innerHTML = ms.map((m) => `
    <li class="${n >= m.downloads ? "is-done" : m === next ? "is-next" : ""}">
      <span class="gw-ms-dot" aria-hidden="true">${n >= m.downloads ? "✓" : ""}</span>
      <b>${fmt(m.downloads)}</b><span>${m.reward}</span>
    </li>`).join("");
})();

// ── GTA Console Giveaway: sign-up + live entry count ──────────
(function gtaGiveaway() {
  const g = cfg.gtaGiveaway;
  const box = $("[data-gta]");
  if (!g?.active || !box) return;
  box.hidden = false;
  $("[data-gta-jump]").hidden = false;
  box.querySelectorAll("[data-gta-per]").forEach((el) => (el.textContent = g.usdPerEntry));
  if (g.prize) $("[data-gta-prize]").textContent = g.prize;

  const GTA_KEY = "taot-gta-wallet";
  const end = new Date(g.endsAt).getTime();
  const endLabel = new Date(end).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET";
  const form = $("[data-gta-form]");
  const msg = $("[data-gta-msg]");
  const me = $("[data-gta-me]");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Countdown to the end
  const gcd = { d: $('[data-gcd="d"]'), h: $('[data-gcd="h"]'), m: $('[data-gcd="m"]'), s: $('[data-gcd="s"]') };
  function gtaTick() {
    const t = Math.max(0, Math.floor((end - Date.now()) / 1000));
    gcd.d.textContent = Math.floor(t / 86400);
    gcd.h.textContent = pad(Math.floor((t % 86400) / 3600));
    gcd.m.textContent = pad(Math.floor((t % 3600) / 60));
    gcd.s.textContent = pad(t % 60);
    if (!t) $("[data-gta-clock-label]").textContent = "This giveaway has ended";
  }
  gtaTick();
  setInterval(gtaTick, 1000);

  const ended = Date.now() > end;
  if (ended) {
    form.hidden = true;
    box.querySelector(".gta-steps").hidden = true;
    box.querySelector(".gta-help").hidden = true;
    const w = g.winner;
    me.hidden = false;
    me.className = "gta-me is-ended";
    me.innerHTML = w
      ? `<b>🏆 Winner</b><code>${esc(w)}</code><small>Congratulations! We'll contact the winner using the details they entered.</small>`
      : `<b>Entries are closed.</b><small>Thanks for entering! The winner will be announced here soon.</small>`;
  }

  function showMe(s) {
    me.hidden = false;
    me.className = "gta-me";
    const n = s.entries || 0; // tracker: 10 entries per $50 ($47+ counts)
    const since = new Date(s.signedUpAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
    me.innerHTML = `
      <div class="gta-me-count"><b>${n}</b><span>entr${n === 1 ? "y" : "ies"}</span></div>
      <div class="gta-me-text">
        <b>You're signed up${n ? " and in the drawing!" : "!"}</b>
        <span>${money(s.net || 0)} of TAOT bought since you signed up.${ended ? "" : ` Buy <b>${money(s.toNext ?? g.usdPerEntry)}</b> more for 10 more entries.`}</span>
        <small><code>${short(s.address)}</code> · signed up ${since} ET · ends ${endLabel}. Entries update about once a minute.</small>
      </div>
      <button type="button" class="gta-switch" data-gta-switch>Use a different wallet</button>`;
    me.querySelector("[data-gta-switch]").addEventListener("click", () => {
      try { localStorage.removeItem(GTA_KEY); } catch {}
      me.hidden = true;
      if (!ended) { form.hidden = false; form.address.focus(); }
    });
  }

  async function lookup(addr) {
    if (!trackerBase) return;
    try {
      const r = await fetch(`${trackerBase}/public/gta/wallet/${addr}`, { cache: "no-store" });
      if (!r.ok) return;
      const s = await r.json();
      if (!s.signedUp) return;
      if (!ended) form.hidden = true;
      showMe(s);
    } catch { /* tracker unreachable */ }
  }

  function say(text, kind) {
    msg.hidden = false;
    msg.className = `gta-msg is-${kind}`;
    msg.innerHTML = text;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = form.elements;
    const body = {
      address: norm(f.address.value), name: f.name.value.trim(), email: f.email.value.trim(),
      phone: f.phone.value.trim(), agree: f.agree.checked, website: f.website.value,
    };
    if (!/^0x[0-9a-f]{40}$/.test(body.address)) return say("That wallet address doesn't look right. It should start with <b>0x</b> and be 42 characters long. Use the <b>receive address</b> from the wallet you buy TAOT with.", "error");
    if (body.name.length < 2) return say("Please enter your name.", "error");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email)) return say("Please enter a valid email address.", "error");
    if (body.phone.replace(/\D/g, "").length < 10) return say("Please enter a valid phone number.", "error");
    if (!body.agree) return say("Please tick the box to agree to the giveaway rules.", "error");
    const btn = form.querySelector(".gta-submit");
    btn.disabled = true;
    btn.textContent = "Entering…";
    try {
      const r = await fetch(`${trackerBase}/public/gta/enter`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Something went wrong. Please try again.");
      try { localStorage.setItem(GTA_KEY, body.address); } catch {}
      msg.hidden = true;
      form.hidden = true;
      form.reset();
      if (j.address) showMe(j);
      me.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (err) {
      say(esc(err.message === "Failed to fetch" ? "We couldn't reach the giveaway server. Check your connection and try again." : err.message), "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Enter the giveaway";
    }
  });

  // Returning visitor: show their entries. Prefill from the weekly checker's saved wallet if there is one.
  try {
    const saved = localStorage.getItem(GTA_KEY);
    if (saved) lookup(saved);
    else if (localStorage.getItem(REMEMBER_KEY)) form.address.value = localStorage.getItem(REMEMBER_KEY);
  } catch { /* storage unavailable */ }
})();

// ── Jump links open the matching card ─────────────────────────
root.querySelectorAll('.gw-jump a[href^="#"]').forEach((a) => {
  a.addEventListener("click", () => {
    const el = document.querySelector(a.getAttribute("href"));
    if (el && el.tagName === "DETAILS") el.open = true;
  });
});
if (location.hash) {
  const el = document.querySelector(location.hash);
  if (el && el.tagName === "DETAILS") el.open = true;
}
