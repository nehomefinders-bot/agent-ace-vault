export type DealStage = "Lead" | "Under Contract" | "Closing" | "Closed";

export interface Deal {
  id: string;
  property: string;
  client: string;
  value: number;
  stage: DealStage;
  closeDate: string;
  lastActivity: string;
}

export const deals: Deal[] = [
  { id: "D-1042", property: "Oakwood Residence", client: "Sarah Chen", value: 750000, stage: "Under Contract", closeDate: "Dec 15, 2025", lastActivity: "2 days ago" },
  { id: "D-1041", property: "Downtown Loft 4B", client: "Mark & Emily Davis", value: 1200000, stage: "Closing", closeDate: "Nov 30, 2025", lastActivity: "Today" },
  { id: "D-1040", property: "Elm Street Townhouse", client: "David Lee", value: 580000, stage: "Closed", closeDate: "Oct 22, 2025", lastActivity: "1 week ago" },
  { id: "D-1039", property: "Willow Creek Estate", client: "Jessica Kim", value: 2500000, stage: "Lead", closeDate: "Q1 2026", lastActivity: "3 days ago" },
  { id: "D-1038", property: "Harbor View Condo", client: "Anthony Rivera", value: 920000, stage: "Under Contract", closeDate: "Dec 5, 2025", lastActivity: "Yesterday" },
  { id: "D-1037", property: "Maple Grove House", client: "Priya Patel", value: 465000, stage: "Lead", closeDate: "—", lastActivity: "5 days ago" },
  { id: "D-1036", property: "Sunset Ridge Villa", client: "The Nguyen Family", value: 1850000, stage: "Closing", closeDate: "Dec 1, 2025", lastActivity: "Today" },
];

export interface Invoice {
  id: string;
  client: string;
  description: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue" | "Draft";
  due: string;
}

export const invoices: Invoice[] = [
  { id: "INV-00876", client: "Pacific Realty Co.", description: "Property mgmt fee — Oct", amount: 4200, status: "Paid", due: "Oct 25" },
  { id: "INV-00875", client: "Sarah Chen", description: "Transaction coordination", amount: 1850, status: "Pending", due: "Nov 12" },
  { id: "INV-00874", client: "Mark Davis", description: "Closing fee — Loft 4B", amount: 9500, status: "Paid", due: "Oct 30" },
  { id: "INV-00873", client: "Bayside Brokers", description: "Referral commission", amount: 12400, status: "Overdue", due: "Oct 5" },
  { id: "INV-00872", client: "Jessica Kim", description: "Marketing reimbursement", amount: 780, status: "Pending", due: "Nov 20" },
  { id: "INV-00871", client: "David Lee", description: "Earnest money handling", amount: 5000, status: "Paid", due: "Sep 28" },
];

export interface Expense {
  id: string;
  category: string;
  vendor: string;
  amount: number;
  date: string;
  hasReceipt: boolean;
  deal?: string;
}

export const expenses: Expense[] = [
  { id: "E-552", category: "Travel", vendor: "Lyft", amount: 45.5, date: "Oct 26", hasReceipt: true, deal: "Oakwood" },
  { id: "E-551", category: "Meals", vendor: "Bistro Verde", amount: 78.2, date: "Oct 25", hasReceipt: true, deal: "Loft 4B" },
  { id: "E-550", category: "Software", vendor: "Canva Pro", amount: 99.0, date: "Oct 24", hasReceipt: false },
  { id: "E-549", category: "Marketing", vendor: "Meta Ads", amount: 420.0, date: "Oct 22", hasReceipt: true, deal: "Willow Creek" },
  { id: "E-548", category: "Office", vendor: "Staples", amount: 64.31, date: "Oct 20", hasReceipt: true },
  { id: "E-547", category: "MLS Dues", vendor: "Local Board", amount: 185.0, date: "Oct 15", hasReceipt: true },
];

export interface Listing {
  id: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  status: "Active" | "Pending" | "Sold";
  daysOnMarket: number;
}

export const listings: Listing[] = [
  { id: "L-201", address: "1422 Oakwood Dr, Mill Valley", price: 1450000, beds: 4, baths: 3, sqft: 2840, status: "Active", daysOnMarket: 12 },
  { id: "L-202", address: "88 Bay Street #4B, San Francisco", price: 1200000, beds: 2, baths: 2, sqft: 1320, status: "Pending", daysOnMarket: 28 },
  { id: "L-203", address: "55 Elm St, Berkeley", price: 580000, beds: 3, baths: 2, sqft: 1610, status: "Sold", daysOnMarket: 41 },
  { id: "L-204", address: "9 Willow Creek Ln, Hillsborough", price: 2500000, beds: 5, baths: 4, sqft: 4120, status: "Active", daysOnMarket: 6 },
];

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "Buyer" | "Seller" | "Both" | "Lead";
  lastContact: string;
}

export const clients: Client[] = [
  { id: "C-91", name: "Sarah Chen", email: "sarah.chen@email.com", phone: "(415) 555-0142", type: "Buyer", lastContact: "2d ago" },
  { id: "C-90", name: "Mark & Emily Davis", email: "davis.family@email.com", phone: "(415) 555-0188", type: "Both", lastContact: "Today" },
  { id: "C-89", name: "David Lee", email: "dlee@email.com", phone: "(510) 555-0119", type: "Buyer", lastContact: "1w ago" },
  { id: "C-88", name: "Jessica Kim", email: "jess.kim@email.com", phone: "(650) 555-0177", type: "Lead", lastContact: "3d ago" },
  { id: "C-87", name: "Anthony Rivera", email: "a.rivera@email.com", phone: "(415) 555-0203", type: "Seller", lastContact: "Yesterday" },
];

export interface MileageEntry {
  id: string;
  date: string;
  from: string;
  to: string;
  miles: number;
  purpose: string;
}

export const mileage: MileageEntry[] = [
  { id: "M-77", date: "Oct 26", from: "Office", to: "1422 Oakwood Dr", miles: 18.4, purpose: "Showing" },
  { id: "M-76", date: "Oct 25", from: "Home", to: "88 Bay Street", miles: 12.1, purpose: "Closing prep" },
  { id: "M-75", date: "Oct 24", from: "Office", to: "9 Willow Creek Ln", miles: 27.8, purpose: "Listing visit" },
  { id: "M-74", date: "Oct 22", from: "Office", to: "Title Co.", miles: 5.6, purpose: "Document drop" },
];

export const irsRate = 0.67; // $/mile 2025

export const kpis = {
  ytdCommission: 215480,
  pipelineValue: deals.filter(d => d.stage !== "Closed").reduce((s, d) => s + d.value, 0),
  outstandingInvoices: invoices.filter(i => i.status !== "Paid").reduce((s, i) => s + i.amount, 0),
  closedDealsMTD: 7,
  avgDealSize: 185000,
  totalMiles: mileage.reduce((s, m) => s + m.miles, 0),
};

export const formatMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export const formatMoneyCents = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
