// Floating action buttons render ONLY inside the authenticated app.
// Every public-facing path (landing, auth, legal, pricing) hides them.
const HIDDEN_FAB_PATHS = new Set([
  "/",
  "/landing",
  "/auth",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/thankyou",
  "/terms",
  "/terms-and-conditions",
  "/privacy",
  "/privacy-policy",
]);

export function shouldHideFabs(path: string, extraHidden: string[] = []): boolean {
  if (HIDDEN_FAB_PATHS.has(path)) return true;
  return extraHidden.includes(path);
}
