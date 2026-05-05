// Server-only helpers for GoHighLevel v2 REST API.
// Only imported from *.functions.ts and server route handlers.

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

export type GhlContact = {
  id: string;
  locationId?: string;
  firstName?: string | null;
  lastName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  tags?: string[];
  dateUpdated?: string;
  dateAdded?: string;
};

export type LocalClient = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  tags: string[] | null;
  ghl_contact_id: string | null;
  updated_at: string;
};

function token() {
  const t = process.env.GHL_PRIVATE_TOKEN;
  if (!t) throw new Error("GHL_PRIVATE_TOKEN is not configured");
  return t;
}

function headers() {
  return {
    Authorization: `Bearer ${token()}`,
    Version: GHL_VERSION,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function ghlFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    throw new Error(`GHL ${init.method || "GET"} ${path} failed [${res.status}]: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body;
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = (name || "").trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: parts[0] || "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function clientToGhlPayload(c: LocalClient, locationId: string) {
  const { firstName, lastName } = splitName(c.name);
  const payload: Record<string, unknown> = {
    locationId,
    firstName,
    lastName,
  };
  if (c.email) payload.email = c.email;
  if (c.phone) payload.phone = c.phone;
  if (c.company) payload.companyName = c.company;
  if (c.address) payload.address1 = c.address;
  if (c.city) payload.city = c.city;
  if (c.state) payload.state = c.state;
  if (c.postal_code) payload.postalCode = c.postal_code;
  if (c.country) payload.country = c.country;
  if (c.tags && c.tags.length) payload.tags = c.tags;
  return payload;
}

export function ghlToClientPatch(g: GhlContact): Partial<LocalClient> {
  const name =
    g.contactName ||
    [g.firstName, g.lastName].filter(Boolean).join(" ").trim() ||
    g.email ||
    g.phone ||
    "Unnamed Contact";
  return {
    name,
    email: g.email ?? null,
    phone: g.phone ?? null,
    company: g.companyName ?? null,
    address: g.address1 ?? null,
    city: g.city ?? null,
    state: g.state ?? null,
    postal_code: g.postalCode ?? null,
    country: g.country ?? null,
    tags: g.tags && g.tags.length ? g.tags : null,
    ghl_contact_id: g.id,
  };
}

export async function ghlSearchByEmailOrPhone(locationId: string, email?: string | null, phone?: string | null) {
  // GHL v2 search endpoint
  const filters: any[] = [];
  if (email) filters.push({ field: "email", operator: "eq", value: email });
  if (phone) filters.push({ field: "phone", operator: "eq", value: phone });
  if (!filters.length) return null;
  try {
    const body = await ghlFetch(`/contacts/search`, {
      method: "POST",
      body: JSON.stringify({ locationId, pageLimit: 1, filters: [{ group: "OR", filters }] }),
    });
    const c = body?.contacts?.[0];
    return (c as GhlContact) || null;
  } catch {
    return null;
  }
}

export async function ghlCreateContact(locationId: string, c: LocalClient) {
  const body = await ghlFetch(`/contacts/`, {
    method: "POST",
    body: JSON.stringify(clientToGhlPayload(c, locationId)),
  });
  return (body?.contact ?? body) as GhlContact;
}

export async function ghlUpdateContact(contactId: string, c: LocalClient, locationId: string) {
  const payload = clientToGhlPayload(c, locationId);
  // Update endpoint does not accept locationId in the body
  delete (payload as any).locationId;
  const body = await ghlFetch(`/contacts/${contactId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return (body?.contact ?? body) as GhlContact;
}

export async function ghlGetContact(contactId: string) {
  const body = await ghlFetch(`/contacts/${contactId}`, { method: "GET" });
  return (body?.contact ?? body) as GhlContact;
}

export async function ghlListContacts(locationId: string, page = 1, limit = 100) {
  // The v2 list endpoint uses query params
  const url = `/contacts/?locationId=${encodeURIComponent(locationId)}&limit=${limit}&page=${page}`;
  const body = await ghlFetch(url, { method: "GET" });
  return (body?.contacts ?? []) as GhlContact[];
}
