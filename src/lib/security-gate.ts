export type SensitiveAction = () => Promise<void>;

export type SensitiveActionRunner = (purpose: string, action: SensitiveAction) => Promise<boolean>;

export const SECURITY_UNLOCK_STORAGE_KEY = "settings:security-unlock-until";
export const SECURITY_UNLOCK_TTL_MS = 10 * 60 * 1000;

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [localPart, domainPart] = email.split("@");
  if (!domainPart) return email;

  const start = localPart.slice(0, 2);
  const maskedLocal = `${start}${localPart.length > 2 ? "***" : ""}`;
  return `${maskedLocal}@${domainPart}`;
}
