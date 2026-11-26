import { CONTACT_EMAIL, CONTACT_MAILTO, whatsappChatUrl } from "../lib/contact";

export function Contact() {
  return (
    <div className="page">
      <div className="shell page-hero">
        <span className="eyebrow">Get in touch</span>
        <h1>Contact Us</h1>
        <p>Reach Shubham Holidays by email — we typically reply within one business day.</p>
      </div>

      <div className="shell contact-grid mt-125">
        <a className="contact-card" href={CONTACT_MAILTO}>
          <span className="contact-card-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 7 9-7" />
            </svg>
          </span>
          <h2>Email</h2>
          <p className="ink-soft">Write to us for packages, quotes, and booking help.</p>
          <strong className="contact-card-value">{CONTACT_EMAIL}</strong>
          <span className="btn-text">Open email app →</span>
        </a>

        <a
          className="contact-card"
          href={whatsappChatUrl()}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="contact-card-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.05c-1.5 0-2.96-.4-4.24-1.16l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24s8.24 3.7 8.24 8.24-3.65 8.25-8.19 8.25zm4.52-6.16c-.25-.12-1.47-.72-1.7-.8-.23-.09-.39-.12-.56.12-.16.25-.64.8-.79.96-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.48-1.38-1.73-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.48c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74 2.49 1.08 2.49.72 2.94.67.45-.05 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
            </svg>
          </span>
          <h2>WhatsApp</h2>
          <p className="ink-soft">Message us to book domestic or international packages.</p>
          <strong className="contact-card-value">Chat on WhatsApp</strong>
          <span className="btn-text">Open WhatsApp →</span>
        </a>
      </div>
    </div>
  );
}
