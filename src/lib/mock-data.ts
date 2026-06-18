// Shared formatters. All app data is loaded from Supabase per user — there
// are no hardcoded demo records anywhere in the app. New accounts start with
// completely empty collections and render polished empty-state placeholders.

export const formatMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export const formatMoneyCents = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
