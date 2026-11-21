// ─────────────────────────────────────────────────────────────
// TAOT GIVEAWAYS — EDIT THIS FILE EACH WEEK
// Everything on buytaot.com/giveaways.html that changes week to
// week lives here. You never need to touch the page itself.
// ─────────────────────────────────────────────────────────────

export const giveawayConfig = {
  // Set to true only when testing with made-up winners. Shows a
  // "sample data" notice so nobody mistakes them for real winners.
  isSampleData: false,

  // Weekly prize amounts (TAOT)
  prizes: { first: 5000, second: 2500, third: 1000 },

  // Winner Wednesday announcement time, US Eastern time.
  // weekday: 0 = Sunday … 3 = Wednesday … 6 = Saturday
  announcement: { weekday: 3, hour: 12, minute: 0, label: "Wednesday at 12:00 PM ET" },

  // Mystery Bonus Week: set active to true and fill in the amount to
  // show the "SURPRISE!" banner at the top of the page.
  mysteryBonus: { active: false, extraTaot: 2500 },

  // Community milestone tracker: put the current app download count here
  // (for example 1240). Leave as null to hide the progress bar.
  appDownloads: null,
  milestones: [
    { downloads: 1000, reward: "Bonus giveaway" },
    { downloads: 2500, reward: "Special TAOT prize" },
    { downloads: 5000, reward: "Community celebration giveaway" },
    { downloads: 10000, reward: "Major prize event" },
  ],
};

// Newest week first. The first entry is shown as "Last week's winners".
// While this list is empty, the page says when the first winners will
// be announced. To post winners, add a block like this at the top:
//
//   {
//     weekOf: "2026-11-25",          // the Winner Wednesday date
//     grandPrize: null,              // last Wednesday of the month: "0x…wallet"
//     first: "0x…full wallet address…",
//     second: "0x…full wallet address…",
//     third: "0x…full wallet address…",
//   },
export const winnerHistory = [
];
