export type TrialProfile = {
  plan?: string | null;
  trial_end_date?: string | null;
};

export function getTrialState(profile: TrialProfile | null, createdAt?: string, now = Date.now()) {
  const fallback = createdAt ? Date.parse(createdAt) + 14 * 86400000 : null;
  const endsAt = profile?.trial_end_date ? Date.parse(profile.trial_end_date) : fallback;
  const active = endsAt !== null && Number.isFinite(endsAt) && now < endsAt;
  return { endsAt, active, daysRemaining: active && endsAt ? Math.ceil((endsAt - now) / 86400000) : 0 };
}

export function isExtendedVipTrial(email?: string) {
  return email?.trim().toLowerCase() === "kaylaalvarado051@gmail.com";
}