#!/usr/bin/env node
/** Refuse certification unless all 48 acceptance records and locales are evidenced. */
process.env.INSTANTSTUDY_CERTIFY_100 = "1";
await import("./check-quizlet-parity.mjs");
