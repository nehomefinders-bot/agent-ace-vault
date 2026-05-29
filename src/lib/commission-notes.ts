export interface CommissionNoteMeta {
  status: "Paid" | "Pending";
  concessions: number;
  deductions: number;
  deductionNotes: string;
}

const DEFAULT_META: CommissionNoteMeta = {
  status: "Pending",
  concessions: 0,
  deductions: 0,
  deductionNotes: "",
};

function parseAmount(value: string | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function isCommissionMetaPart(part: string) {
  return /^(Commission (Status|Concessions|Deductions|Deduction Notes)|Status|Deductions|Concessions|Deduction Notes):/i.test(part.trim());
}

export function parseCommissionNotes(notes: string | null | undefined): CommissionNoteMeta {
  if (!notes) return { ...DEFAULT_META };

  const meta = { ...DEFAULT_META };
  const parts = notes
    .split(/\r?\n|\s\|\s/)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const match = part.match(/^(?:Commission\s+)?([^:]+):\s*(.*)$/i);
    if (!match) continue;
    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();

    if (key === "status") {
      meta.status = /paid/i.test(value) ? "Paid" : "Pending";
    } else if (key === "concessions") {
      meta.concessions = parseAmount(value);
    } else if (key === "deductions") {
      meta.deductions = parseAmount(value);
    } else if (key === "deduction notes") {
      meta.deductionNotes = value;
    }
  }

  return meta;
}

export function mergeCommissionNotes(
  existingNotes: string | null | undefined,
  meta: CommissionNoteMeta,
) {
  const preserved = (existingNotes ?? "")
    .split(/\r?\n|\s\|\s/)
    .map((part) => part.trim())
    .filter((part) => part && !isCommissionMetaPart(part));

  const commissionParts = [
    `Commission Status: ${meta.status}`,
    `Commission Concessions: ${meta.concessions}`,
    `Commission Deductions: ${meta.deductions}`,
  ];

  if (meta.deductionNotes.trim()) {
    commissionParts.push(`Commission Deduction Notes: ${meta.deductionNotes.trim()}`);
  }

  const combined = [...preserved, ...commissionParts].join("\n").trim();
  return combined || null;
}
