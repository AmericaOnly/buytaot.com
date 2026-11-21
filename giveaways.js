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
