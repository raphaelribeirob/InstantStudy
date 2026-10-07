export type Offer = Readonly<{
  key: string;
  product: string;
  plan: string;
  cadence: "monthly" | "annual";
  eyebrow: string;
  title: string;
  description: string;
}>;

const offers: Record<string, Offer> = {
  instant_speak_pro_monthly: {
    key: "instant_speak_pro_monthly",
    product: "InstantSpeak",
    plan: "Pro",
    cadence: "monthly",
    eyebrow: "LANGUAGE LEARNING",
    title: "Speak with your personal AI tutor.",
    description: "Unlimited premium practice, adaptive lessons and persistent progress.",
  },
  instant_speak_pro_annual: {
    key: "instant_speak_pro_annual",
    product: "InstantSpeak",
    plan: "Pro",
    cadence: "annual",
    eyebrow: "LANGUAGE LEARNING",
    title: "Speak with your personal AI tutor.",
    description: "Unlimited premium practice, adaptive lessons and persistent progress.",
  },
  instant_study_plus_monthly: {
    key: "instant_study_plus_monthly",
    product: "InstantStudy",
    plan: "Plus",
    cadence: "monthly",
    eyebrow: "LEARNING",
    title: "Turn your material into active learning.",
    description: "More Learn rounds, practice tests and persistent mastery.",
  },
  instant_study_plus_annual: {
    key: "instant_study_plus_annual",
    product: "InstantStudy",
    plan: "Plus",
    cadence: "annual",
    eyebrow: "LEARNING",
    title: "Turn your material into active learning.",
    description: "More Learn rounds, practice tests and persistent mastery.",
  },
  instant_study_unlimited_monthly: {
    key: "instant_study_unlimited_monthly",
    product: "InstantStudy",
    plan: "Unlimited",
    cadence: "monthly",
    eyebrow: "LEARNING",
    title: "Remove the limits from your study loop.",
    description: "Unlimited core study modes, reviews and supported AI agents.",
  },
  instant_study_unlimited_annual: {
    key: "instant_study_unlimited_annual",
    product: "InstantStudy",
    plan: "Unlimited",
    cadence: "annual",
    eyebrow: "LEARNING",
    title: "Remove the limits from your study loop.",
    description: "Unlimited core study modes, reviews and supported AI agents.",
  },
  instant_study_family_annual: {
    key: "instant_study_family_annual",
    product: "InstantStudy",
    plan: "Family",
    cadence: "annual",
    eyebrow: "LEARNING FOR FIVE",
    title: "Five independent learners. One family plan.",
    description: "Unlimited InstantStudy for one owner and up to four invited family members, each with separate progress.",
  },
  instant_bible_pro_monthly: {
    key: "instant_bible_pro_monthly",
    product: "InstantBible",
    plan: "Pro",
    cadence: "monthly",
    eyebrow: "SCRIPTURE",
    title: "Build a consistent daily Scripture practice.",
    description: "Unlock the complete personalized Scripture-to-action experience.",
  },
  instant_bible_pro_annual: {
    key: "instant_bible_pro_annual",
    product: "InstantBible",
    plan: "Pro",
    cadence: "annual",
    eyebrow: "SCRIPTURE",
    title: "Build a consistent daily Scripture practice.",
    description: "Unlock the complete personalized Scripture-to-action experience.",
  },
  instant_vest_pro_monthly: {
    key: "instant_vest_pro_monthly",
    product: "InstantVest",
    plan: "Pro",
    cadence: "monthly",
    eyebrow: "ENEM",
    title: "Train one competency at a time.",
    description: "Daily adaptive practice with persistent mastery and tutor memory.",
  },
  instant_vest_pro_annual: {
    key: "instant_vest_pro_annual",
    product: "InstantVest",
    plan: "Pro",
    cadence: "annual",
    eyebrow: "ENEM",
    title: "Train one competency at a time.",
    description: "Daily adaptive practice with persistent mastery and tutor memory.",
  },
  instant_closer_pro_monthly: {
    key: "instant_closer_pro_monthly",
    product: "InstantCloser",
    plan: "Pro",
    cadence: "monthly",
    eyebrow: "REVENUE",
    title: "Put an AI closer on your sales operation.",
    description: "Qualification, objections, follow-up and revenue intelligence.",
  },
  instant_closer_pro_annual: {
    key: "instant_closer_pro_annual",
    product: "InstantCloser",
    plan: "Pro",
    cadence: "annual",
    eyebrow: "REVENUE",
    title: "Put an AI closer on your sales operation.",
    description: "Qualification, objections, follow-up and revenue intelligence.",
  },
  dotspeak_premium_monthly: {
    key: "dotspeak_premium_monthly",
    product: "DotSpeak",
    plan: "Premium",
    cadence: "monthly",
    eyebrow: "FOR GUARDIANS",
    title: "Unlock the complete DotSpeak learning path.",
    description: "Guardian-controlled access to the complete child learning experience.",
  },
  dotspeak_premium_annual: {
    key: "dotspeak_premium_annual",
    product: "DotSpeak",
    plan: "Premium",
    cadence: "annual",
    eyebrow: "FOR GUARDIANS",
    title: "Unlock the complete DotSpeak learning path.",
    description: "Guardian-controlled access to the complete child learning experience.",
  },
  instant_one_monthly: {
    key: "instant_one_monthly",
    product: "Instant One",
    plan: "All Access",
    cadence: "monthly",
    eyebrow: "INSTANT MEMBERSHIP",
    title: "One membership. Every eligible Instant.",
    description: "One subscription for the consumer Instant ecosystem.",
  },
  instant_one_annual: {
    key: "instant_one_annual",
    product: "Instant One",
    plan: "All Access",
    cadence: "annual",
    eyebrow: "INSTANT MEMBERSHIP",
    title: "One membership. Every eligible Instant.",
    description: "One subscription for the consumer Instant ecosystem.",
  },
};

export function offerFor(key: string | null): Offer | null {
  if (!key) return null;
  return offers[key] ?? null;
}

export const defaultOffer = offers.instant_speak_pro_monthly;
