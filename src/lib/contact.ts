/** Public contact details — shown sitewide (header, footer, Contact page). */
export const CONTACT_EMAIL = "shubhamholidays01@gmail.com";
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;

export function whatsappChatUrl(prefill = "Hi Shubham Holidays,"): string {
  const phone = String(import.meta.env.VITE_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  const q = encodeURIComponent(prefill);
  return phone ? `https://wa.me/${phone}?text=${q}` : `https://wa.me/?text=${q}`;
}
