import { referralLeaders } from "./referral-data.js";

const list = document.querySelector("[data-referral-list]");
const empty = document.querySelector("[data-referral-empty]");
const medals = ["🥇", "🥈", "🥉"];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

if (list) {
  const leaders = referralLeaders.slice(0, 15);
  const rows = [];
  for (let i = 0; i < 15; i++) {
    const p = leaders[i];
    const rank = medals[i] || `#${i + 1}`;
    rows.push(`<li class="${p ? "" : "is-open"}">
      <span class="r-rank">${rank}</span>
      <span class="r-name">${p ? esc(p.name) : "Open spot"}</span>
      <span class="r-count">${p && p.referrals != null ? `${esc(p.referrals)} referral${p.referrals === 1 ? "" : "s"}` : "—"}</span>
    </li>`);
  }
  list.innerHTML = rows.join("");
  if (empty) empty.hidden = leaders.length > 0;
}
