/** Public contact details — shown sitewide (header, footer, Contact page). */
export const CONTACT_EMAIL = "shubhamholidays01@gmail.com";
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;

export const CONTACT_PHONE_DISPLAY = "+91 93720 10677";
export const CONTACT_PHONE_E164 = "919372010677";
export const CONTACT_TEL = `tel:+${CONTACT_PHONE_E164}`;
export const CONTACT_WHATSAPP_URL = `https://wa.me/${CONTACT_PHONE_E164}`;

export function whatsappChatUrl(prefill = "Hi Shubham Holidays,"): string {
  const q = encodeURIComponent(prefill);
  return `${CONTACT_WHATSAPP_URL}?text=${q}`;
}
