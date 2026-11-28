import { Link } from "react-router-dom";
import {
  CONTACT_EMAIL,
  CONTACT_MAILTO,
  CONTACT_PHONE_DISPLAY,
  CONTACT_TEL,
  CONTACT_WHATSAPP_URL,
} from "../lib/contact";
import { useI18n } from "../i18n/I18nProvider";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="footer">
      <div className="shell footer-inner">
        <div className="footer-brand">
          <img
            src="/logo-full.png"
            alt="Shubham Holidays"
            className="footer-logo"
            width={160}
            height={70}
            decoding="async"
          />
          <p className="footer-brand-name">Shubham Holidays</p>
          <p className="footer-tagline">{t("footer.tagline")}</p>
        </div>
        <div className="footer-links">
          <Link to="/flights">{t("nav.flights")}</Link>
          <Link to="/hotels">{t("nav.hotels")}</Link>
          <Link to="/explore">{t("nav.explore")}</Link>
          <Link to="/bookings">{t("footer.bookings")}</Link>
          <Link to="/contact">{t("nav.contact")}</Link>
          <Link to="/privacy">{t("footer.privacy")}</Link>
          <Link to="/terms">{t("footer.terms")}</Link>
        </div>
        <div className="footer-contact">
          <h3 className="footer-contact-title">{t("footer.contact")}</h3>
          <a className="footer-contact-link" href={CONTACT_MAILTO}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 7 9-7" />
            </svg>
            <span>{CONTACT_EMAIL}</span>
          </a>
          <a className="footer-contact-link" href={CONTACT_TEL}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.8 19.8 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
            </svg>
            <span>{CONTACT_PHONE_DISPLAY}</span>
          </a>
          <a
            className="footer-contact-link footer-whatsapp"
            href={CONTACT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.05c-1.5 0-2.96-.4-4.24-1.16l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24s8.24 3.7 8.24 8.24-3.65 8.25-8.19 8.25zm4.52-6.16c-.25-.12-1.47-.72-1.7-.8-.23-.09-.39-.12-.56.12-.16.25-.64.8-.79.96-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.48-1.38-1.73-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.48c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74 2.49 1.08 2.49.72 2.94.67.45-.05 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
            </svg>
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
