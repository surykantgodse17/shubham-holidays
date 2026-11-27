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
            <strong>email address</strong> when needed to process a booking or respond to your enquiry.
            When you pay with Pi Network, we also store booking details (including guest name and email)
            in our application database and process payment identifiers needed to confirm the payment.
          </p>
        </section>

        <section>
          <h2>How we use your information</h2>
          <p>
            We use your details to confirm bookings, share itinerary updates, and contact you about
            your travel arrangements. Completed Pi payments are recorded so you can see them under
            My bookings. We do not sell your data to third parties.
          </p>
        </section>

        <section>
          <h2>Pi Network payments</h2>
          <p>
            If you choose Pay with Pi, payment approval and completion run through Pi Network’s
            APIs (including sandbox APIs on Testnet). Pi may receive payment amount, memo, and
            related transaction data required to process the payment. Guest name and email from
            checkout are stored with the confirmed booking on our servers.
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
