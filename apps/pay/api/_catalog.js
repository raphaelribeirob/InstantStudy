const offers = {
  instant_speak_pro_monthly: ["PADDLE_PRICE_INSTANT_SPEAK_PRO_MONTHLY", "instant_speak", "pro", "monthly"],
  instant_speak_pro_annual: ["PADDLE_PRICE_INSTANT_SPEAK_PRO_ANNUAL", "instant_speak", "pro", "annual"],
  instant_study_plus_monthly: ["PADDLE_PRICE_INSTANT_STUDY_PLUS_MONTHLY", "instant_study", "plus", "monthly"],
  instant_study_plus_annual: ["PADDLE_PRICE_INSTANT_STUDY_PLUS_ANNUAL", "instant_study", "plus", "annual"],
  instant_study_unlimited_monthly: ["PADDLE_PRICE_INSTANT_STUDY_UNLIMITED_MONTHLY", "instant_study", "unlimited", "monthly"],
  instant_study_unlimited_annual: ["PADDLE_PRICE_INSTANT_STUDY_UNLIMITED_ANNUAL", "instant_study", "unlimited", "annual"],
  instant_bible_pro_monthly: ["PADDLE_PRICE_INSTANT_BIBLE_PRO_MONTHLY", "instant_bible", "pro", "monthly"],
  instant_bible_pro_annual: ["PADDLE_PRICE_INSTANT_BIBLE_PRO_ANNUAL", "instant_bible", "pro", "annual"],
  instant_vest_pro_monthly: ["PADDLE_PRICE_INSTANT_VEST_PRO_MONTHLY", "instant_vest", "pro", "monthly"],
  instant_vest_pro_annual: ["PADDLE_PRICE_INSTANT_VEST_PRO_ANNUAL", "instant_vest", "pro", "annual"],
  instant_closer_pro_monthly: ["PADDLE_PRICE_INSTANT_CLOSER_PRO_MONTHLY", "instant_closer", "pro", "monthly"],
  instant_closer_pro_annual: ["PADDLE_PRICE_INSTANT_CLOSER_PRO_ANNUAL", "instant_closer", "pro", "annual"],
  dotspeak_premium_monthly: ["PADDLE_PRICE_DOTSPEAK_PREMIUM_MONTHLY", "dotspeak", "premium", "monthly"],
  dotspeak_premium_annual: ["PADDLE_PRICE_DOTSPEAK_PREMIUM_ANNUAL", "dotspeak", "premium", "annual"],
  instant_one_monthly: ["PADDLE_PRICE_INSTANT_ONE_MONTHLY", "instant_one", "all_access", "monthly"],
  instant_one_annual: ["PADDLE_PRICE_INSTANT_ONE_ANNUAL", "instant_one", "all_access", "annual"],
};

export function resolveOffer(key) {
  const row = offers[String(key || "")];
  if (!row) return null;
  const [envKey, product, plan, cadence] = row;
  const priceId = String(process.env[envKey] || "").trim();
  if (!priceId) return null;
  if (!/^pri_[a-z0-9]{20,40}$/.test(priceId)) return null;
  return { key: String(key), priceId, product, plan, cadence };
}
