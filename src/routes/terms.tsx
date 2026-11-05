import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/site/LegalPage";
import { pageMeta } from "@/lib/seo";
import { BUSINESS, COMMERCIAL_RATE } from "@/lib/site-data";

export const Route = createFileRoute("/terms")({
  head: () =>
    pageMeta({
      title: "Terms of Service | Simple Surface Carpet Cleaning",
      description:
        "Pricing, booking, payment and guarantee terms for Simple Surface Carpet Cleaning in Fort Worth, TX.",
      path: "/terms",
    }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="November 5, 2026">
      <p>
        These terms apply when you use simplesurfacecarpetcleaning.com or book cleaning with{" "}
        {BUSINESS.legalName} (&ldquo;Simple Surface Carpet Cleaning,&rdquo; &ldquo;we,&rdquo;
        &ldquo;us&rdquo;). By booking, you agree to them.
      </p>

      <h2>Booking</h2>
      <p>
        An online booking is a request. Your appointment is set once we confirm the day and arrival
        window with you by text, call or email. Arrival windows are estimates; we&rsquo;ll let you
        know if we&rsquo;re running late.
      </p>

      <h2>Prices</h2>
      <ul>
        <li>
          Residential prices are flat per room or per item as shown on the website or in your quote.
          Commercial cleaning is priced by the square foot (from ${COMMERCIAL_RATE.toFixed(2)} per
          sq ft) or by written quote.
        </li>
        <li>Texas sales tax of 8.25% is added to the total.</li>
        <li>
          If what we find on arrival is different from the booking (for example, more or larger
          rooms), we&rsquo;ll tell you the new price before we start. Nothing extra is done without
          your OK.
        </li>
        <li>Written quotes are good through the date shown on the quote.</li>
      </ul>

      <h2>Payment</h2>
      <p>
        No deposit is required. Payment is due when the job is done, by card through a Square
        invoice, cash or check.
      </p>

      <h2>Rescheduling and canceling</h2>
      <p>
        Plans change. If you need to move or cancel your appointment, please call or text{" "}
        {BUSINESS.phoneDisplay} as early as you can so we can offer the time to someone else.
      </p>

      <h2>Getting ready</h2>
      <ul>
        <li>
          Please pick up small items, toys and anything fragile from the floors we&rsquo;re
          cleaning.
        </li>
        <li>We clean around large furniture like beds and dressers.</li>
        <li>Tell us about pets, gate codes or parking so we can plan the visit.</li>
        <li>We&rsquo;ll need access to a standard wall outlet.</li>
      </ul>

      <h2>100% Customer Satisfaction Guarantee</h2>
      <p>
        We will come out and touch up or spot clean anything that doesn&rsquo;t look right to you
        after we are gone! Just call or text {BUSINESS.phoneDisplay} and tell us what you see.
      </p>

      <h2>Results</h2>
      <p>
        We work hard on every stain, but some can&rsquo;t be fully removed, such as permanent dyes,
        bleach spots, burns, or wear and sun fading. We&rsquo;ll tell you if we think a spot may not
        come out. Carpet and upholstery can be slippery while drying, so please take care until
        it&rsquo;s dry.
      </p>

      <h2>Damage</h2>
      <p>
        If you think we damaged something during a visit, please tell us within 48 hours so we can
        look at it and make it right.
      </p>

      <h2>Messages</h2>
      <p>
        By submitting a form, you agree we may contact you about your request by phone, text or
        email. See our <a href="/privacy">Privacy Policy</a> for details and how to opt out.
      </p>

      <h2>Website</h2>
      <p>
        We try to keep prices and information on this site accurate, but mistakes can happen. The
        confirmed booking or written quote is what counts.
      </p>

      <h2>Questions</h2>
      <p>
        Call or text <a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a> or email{" "}
        <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
      </p>
    </LegalPage>
  );
}
