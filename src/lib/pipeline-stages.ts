export type Stage =
  | "in_funnel"
  | "new_lead"
  | "new_listing"
  | "on_mls"
  | "no_response"
  | "in_conversation"
  | "contract_signed"
  | "under_agreement"
  | "commitment"
  | "clear_to_close"
  | "sold"
  | "canceled";

export type StageTone = "muted" | "warning" | "primary" | "success";

export const STAGES: { key: Stage; label: string; tone: StageTone }[] = [
  { key: "in_funnel", label: "In Funnel", tone: "muted" },
  { key: "new_lead", label: "New Lead", tone: "muted" },
  { key: "new_listing", label: "New Listing", tone: "primary" },
  { key: "on_mls", label: "On MLS", tone: "primary" },
  { key: "no_response", label: "No Response Yet", tone: "muted" },
  { key: "in_conversation", label: "In Conversation", tone: "primary" },
  { key: "contract_signed", label: "Buy/Seller Contract Signed", tone: "warning" },
  { key: "under_agreement", label: "Under Agreement", tone: "warning" },
  { key: "commitment", label: "Commitment", tone: "primary" },
  { key: "clear_to_close", label: "Clear to Close", tone: "primary" },
  { key: "sold", label: "Sold", tone: "success" },
  { key: "canceled", label: "Canceled", tone: "warning" },
];

// Map legacy DB values to current stages so existing rows still display.
const LEGACY_MAP: Record<string, Stage> = {
  pending: "new_lead",
  lead: "new_lead",
  funnel: "in_funnel",
  listed: "new_listing",
  active_listing: "on_mls",
  under_contract: "contract_signed",
  closing: "clear_to_close",
  closed: "sold",
  cancelled: "canceled",
  dead: "no_response",
};

export function normalizeStage(status: string | null | undefined): Stage {
  if (!status) return "new_lead";
  if (STAGES.some((s) => s.key === status)) return status as Stage;
  return LEGACY_MAP[status] ?? "new_lead";
}

export function stageLabel(status: string | null | undefined): string {
  const key = normalizeStage(status);
  return STAGES.find((s) => s.key === key)?.label ?? "New Lead";
}

export function stageTone(status: string | null | undefined): StageTone {
  const key = normalizeStage(status);
  return STAGES.find((s) => s.key === key)?.tone ?? "muted";
}
