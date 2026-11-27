import { CONTACT_EMAIL, CONTACT_MAILTO, CONTACT_PHONE_DISPLAY, CONTACT_TEL } from "../lib/contact";

export function Terms() {
  return (
    <div className="page">
      <div className="shell page-hero">
        <span className="eyebrow">Legal</span>
        <h1>Terms of Service</h1>
        <p>Booking terms for Shubham Holidays flights, hotels, and holiday packages.</p>
      </div>

      <div className="shell legal-doc mt-125">
        <section>
          <h2>Bookings</h2>
          <p>
            When you book flights, hotels, or holiday packages through Shubham Holidays, you agree to
            provide accurate passenger and contact details so we can complete and confirm your reservation.
          </p>
        </section>

        <section>
          <h2>Cancellation and refunds</h2>
          <p>
            Cancellation and refund eligibility follow the applicable airline and hotel policies for your
            booking. Service fees charged by Shubham Holidays (if any) may be non-refundable unless stated
            otherwise at the time of booking.
          </p>
        </section>

        <section>
          <h2>Payment</h2>
          <p>
            Payments may be made via <strong>Pi</strong> or <strong>UPI</strong>, as offered at checkout.
            A booking is confirmed only after payment is successfully received and the supplier confirms
            availability.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For booking help, email <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a> or call{" "}
            <a href={CONTACT_TEL}>{CONTACT_PHONE_DISPLAY}</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
