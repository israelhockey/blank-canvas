import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/site/LegalPage";
import { pageMeta } from "@/lib/seo";
import { BUSINESS } from "@/lib/site-data";

export const Route = createFileRoute("/privacy")({
  head: () =>
    pageMeta({
      title: "Privacy Policy | Simple Surface Carpet Cleaning",
      description:
        "How Simple Surface Carpet Cleaning collects, uses and protects the information you share when you book or contact us.",
      path: "/privacy",
    }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="November 5, 2026">
      <p>
        This policy explains what information {BUSINESS.legalName} (&ldquo;Simple Surface Carpet
        Cleaning,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) collects through
        simplesurfacecarpetcleaning.com and how we use it. We&rsquo;re a local cleaning business in
        Fort Worth, Texas, and we keep this simple: we use your information to quote, book and do
        your cleaning, and we don&rsquo;t sell it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <b>What you give us</b> when you book, request a walkthrough or accept a quote: your name,
          phone number, email, address, ZIP code, the items you want cleaned, your preferred day and
          time, and any notes (like gate codes or pets).
        </li>
        <li>
          <b>Job records</b> we create while serving you: appointments, quotes, payments, receipts
          and before-and-after photos of the areas we clean.
        </li>
        <li>
          <b>Website usage</b>: pages viewed, buttons tapped, the site or link that sent you to us,
          and general device and browser information. We use our own analytics and may use Google
          Analytics, Microsoft Clarity and the Meta (Facebook) Pixel, which use cookies or similar
          technology.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To give you a price, schedule your cleaning and show up at the right place.</li>
        <li>
          To contact you about your request by phone, text or email: confirmations, reminders,
          receipts and follow-up questions.
        </li>
        <li>
          To ask how we did, and occasionally to remind you when it&rsquo;s time for another
          cleaning. You can opt out of these at any time.
        </li>
        <li>To take payment, keep business records, and improve our website and service.</li>
      </ul>

      <h2>Text messages and calls</h2>
      <p>
        When you submit a form, you agree that we may call or text you about that request. Message
        frequency varies. Message and data rates may apply. Reply STOP to stop texts or HELP for
        help, or just tell us. We don&rsquo;t share your phone number with third parties for their
        marketing.
      </p>

      <h2>Who we share it with</h2>
      <p>
        We don&rsquo;t sell or rent your personal information. We share it only with service
        providers that help us run the business, such as our website and database host, our email
        provider, Square for invoices and payments, and the analytics tools above, and only so they
        can provide that service. We may also share information if the law requires it.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep customer and job records for as long as we need them to serve you and for normal
        business, tax and accounting purposes. You can ask us to delete your information at any
        time, and we&rsquo;ll do so unless we&rsquo;re required to keep it.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Ask to see, correct or delete the information we have about you.</li>
        <li>Opt out of reminder and follow-up emails or texts.</li>
        <li>Block or delete cookies in your browser settings.</li>
      </ul>

      <h2>Children</h2>
      <p>
        Our services are for adults. We don&rsquo;t knowingly collect information from children
        under 13.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we&rsquo;ll post the new version here with a new &ldquo;last
        updated&rdquo; date.
      </p>

      <h2>Contact us</h2>
      <p>
        {BUSINESS.legalName}, Fort Worth, TX
        <br />
        Phone or text: <a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a>
        <br />
        Email: <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
      </p>
    </LegalPage>
  );
}
