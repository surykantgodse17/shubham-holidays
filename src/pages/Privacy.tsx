import { CONTACT_EMAIL, CONTACT_MAILTO, CONTACT_PHONE_DISPLAY, CONTACT_TEL } from "../lib/contact";

export function Privacy() {
  return (
    <div className="page">
      <div className="shell page-hero">
        <span className="eyebrow">Legal</span>
        <h1>Privacy Policy</h1>
        <p>How Shubham Holidays handles your information when you book flights, hotels, and holiday packages.</p>
      </div>

      <div className="shell legal-doc mt-125">
        <section>
          <h2>Who we are</h2>
          <p>
            Shubham Holidays helps you book flights, hotels, and holiday packages. This Privacy Policy
            explains what information we collect and how we use it.
          </p>
        </section>

        <section>
          <h2>Information we collect</h2>
          <p>
            We collect your <strong>name</strong>, <strong>phone number</strong>, and{" "}
            <strong>email address</strong> only when needed to process a booking or respond to your enquiry.
          </p>
        </section>

        <section>
          <h2>How we use your information</h2>
          <p>
            We use your details solely to confirm bookings, share itinerary updates, and contact you about
            your travel arrangements. We do not sell your data to third parties.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about privacy? Reach us at{" "}
            <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a> or call{" "}
            <a href={CONTACT_TEL}>{CONTACT_PHONE_DISPLAY}</a> (9372010677).
          </p>
        </section>
      </div>
    </div>
  );
}
