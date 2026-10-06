const offers = {
  instant_speak_pro_monthly: ["PADDLE_PRICE_INSTANT_SPEAK_PRO_MONTHLY", "instant_speak", "pro", "monthly", "instant_speak.pro"],
  instant_speak_pro_annual: ["PADDLE_PRICE_INSTANT_SPEAK_PRO_ANNUAL", "instant_speak", "pro", "annual", "instant_speak.pro"],
  instant_study_plus_monthly: ["PADDLE_PRICE_INSTANT_STUDY_PLUS_MONTHLY", "instant_study", "plus", "monthly", "instant_study.plus"],
  instant_study_plus_annual: ["PADDLE_PRICE_INSTANT_STUDY_PLUS_ANNUAL", "instant_study", "plus", "annual", "instant_study.plus"],
  instant_study_unlimited_monthly: ["PADDLE_PRICE_INSTANT_STUDY_UNLIMITED_MONTHLY", "instant_study", "unlimited", "monthly", "instant_study.unlimited"],
  instant_study_unlimited_annual: ["PADDLE_PRICE_INSTANT_STUDY_UNLIMITED_ANNUAL", "instant_study", "unlimited", "annual", "instant_study.unlimited"],
  instant_bible_pro_monthly: ["PADDLE_PRICE_INSTANT_BIBLE_PRO_MONTHLY", "instant_bible", "pro", "monthly", "instant_bible.pro"],
  instant_bible_pro_annual: ["PADDLE_PRICE_INSTANT_BIBLE_PRO_ANNUAL", "instant_bible", "pro", "annual", "instant_bible.pro"],
  instant_vest_pro_monthly: ["PADDLE_PRICE_INSTANT_VEST_PRO_MONTHLY", "instant_vest", "pro", "monthly", "instant_vest.pro"],
  instant_vest_pro_annual: ["PADDLE_PRICE_INSTANT_VEST_PRO_ANNUAL", "instant_vest", "pro", "annual", "instant_vest.pro"],
  instant_closer_pro_monthly: ["PADDLE_PRICE_INSTANT_CLOSER_PRO_MONTHLY", "instant_closer", "pro", "monthly", "instant_closer.pro"],
  instant_closer_pro_annual: ["PADDLE_PRICE_INSTANT_CLOSER_PRO_ANNUAL", "instant_closer", "pro", "annual", "instant_closer.pro"],
  dotspeak_premium_monthly: ["PADDLE_PRICE_DOTSPEAK_PREMIUM_MONTHLY", "dotspeak", "premium", "monthly", "dotspeak.premium"],
  dotspeak_premium_annual: ["PADDLE_PRICE_DOTSPEAK_PREMIUM_ANNUAL", "dotspeak", "premium", "annual", "dotspeak.premium"],
  instant_one_monthly: ["PADDLE_PRICE_INSTANT_ONE_MONTHLY", "instant_one", "all_access", "monthly", "instant_one.all"],
  instant_one_annual: ["PADDLE_PRICE_INSTANT_ONE_ANNUAL", "instant_one", "all_access", "annual", "instant_one.all"],
};

export function offerMetadata(key) {
  const value = String(key || "");
  const row = offers[value];
  if (!row) return null;
  const [envKey, product, plan, cadence, entitlement] = row;
  return { key: value, envKey, product, plan, cadence, entitlement };
}

export function resolveOffer(key) {
  const meta = offerMetadata(key);
  if (!meta) return null;
  const priceId = String(process.env[meta.envKey] || "").trim();
  if (!priceId || !/^pri_[a-z0-9]{20,40}$/.test(priceId)) return null;
  return { ...meta, priceId };
}
