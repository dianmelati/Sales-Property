export const LEAD_STATUSES = ["NEW", "CONTACTED", "FOLLOW_UP", "VIEWING", "NEGOTIATION", "CLOSED", "LOST"] as const;
export type LeadStatusKey = (typeof LEAD_STATUSES)[number];
export const STATUS_LABEL: Record<LeadStatusKey, string> = {
  NEW: "New", CONTACTED: "Contacted", FOLLOW_UP: "Follow up", VIEWING: "Viewing", NEGOTIATION: "Negotiation", CLOSED: "Closed", LOST: "Lost",
};
export const SOURCE_LABEL: Record<string, string> = {
  inquiry_form: "Inquiry form", viewing_request: "Viewing request", whatsapp: "WhatsApp", contact_page: "Contact page",
  phone: "Phone call", walk_in: "Walk-in", referral: "Referral", other: "Other",
};
export const MANUAL_SOURCES = ["phone", "walk_in", "referral", "whatsapp", "other"] as const;
