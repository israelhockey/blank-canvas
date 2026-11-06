import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { BUSINESS, CITIES, cityParam, money, textUsHref, type City } from "@/lib/site-data";
import { CITY_LOCAL } from "@/lib/city-local";
import { GUIDES, SERVICE_PAGES } from "@/lib/seo-pages";
import { ArrowIcon, AutoVideo, BeforeAfter, ClockIcon, LeafIcon, PlugIcon } from "./bits";
import { openQuickLead } from "./QuickLead";

export function Notice() {
  return (
    <div className="notice">
      <div className="wrap">
        <span>
          <b className="offer-b">No deposit.</b> Pay after the job
          <span className="hide-sm"> · 100% Customer Satisfaction Guarantee</span>
        </span>
        <a href="#pricing" className="notice-cta">
          See prices
        </a>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <span className="brand-mark">
      <img src="/brand/mark-192.png" alt="" width={40} height={40} />
    </span>
  );
}

const NAV: [string, string][] = [
  ["#pricing", "Pricing"],
  ["#services", "Services"],
  ["#guarantee", "Guarantee"],
  ["#commercial", "Commercial"],
  ["#areas", "Areas"],
  ["#faq", "FAQ"],
];

const DRAWER: [string, string, string][] = [
  ["#pricing", "Pricing", "Build your price in 60 seconds"],
  ["#book", "Book a time", "Pick a day and arrival window"],
  ["#services", "Services", "Carpet, sofas, rugs, tile, gyms"],
  ["#guarantee", "Guarantee", "100% satisfaction"],
  ["#commercial", "Commercial", "$0.25 per sq ft"],
  ["#action", "See it in action", "How we clean"],
  ["#areas", "Service areas", "Fort Worth and 11 nearby cities"],
  ["#faq", "FAQ", "Dry time, payment, pets"],
];

/** On pages that don't have every section, anchors not on the page point to the home page. */
const fixAnchor = (h: string, local?: string[]) => (!local || local.includes(h) ? h : `/${h}`);

export function Header({ local }: { local?: string[] } = {}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="site">
      <div className="wrap">
        <Link className="brand" to="/" aria-label="Simple Surface Carpet Cleaning home">
          <BrandMark />
          <span>
            <b>Simple Surface</b>
            <small>{BUSINESS.tagline}</small>
          </span>
        </Link>
        <nav className="links" aria-label="Main">
          {NAV.map(([h, l]) => (
            <a key={h} href={fixAnchor(h, local)}>
              {l}
            </a>
          ))}
        </nav>
        <a className="head-phone" href={BUSINESS.phoneHref}>
          {BUSINESS.phoneDisplay}
        </a>
        <a className="btn btn-primary" href={fixAnchor("#book", local)}>
          Book now
        </a>
        <button
          className="menu-btn"
          type="button"
          aria-expanded={open}
          aria-controls="drawer"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      <nav
        className="drawer"
        id="drawer"
        aria-label="Sections"
        hidden={!open}
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
      >
        <div className="wrap">
          {DRAWER.map(([h, b, s]) => (
            <a key={h} href={fixAnchor(h, local)}>
              <b>{b}</b>
              <span>{s}</span>
            </a>
          ))}
          <a className="drawer-call" href={BUSINESS.phoneHref}>
            Call {BUSINESS.phoneDisplay}
          </a>
        </div>
      </nav>
    </header>
  );
}

export function Hero({ city }: { city?: City | undefined }) {
  return (
    <section className="hero">
      <AutoVideo
        className="hero-img"
        src="/vid/hero-duplex.mp4"
        poster="/vid/hero-duplex-poster.jpg"
        eager
        autoPlay
        aria-hidden="true"
      />
      <div className="hero-shade" aria-hidden="true" />
      <div className="wrap hero-in">
        {city ? (
          <>
            <p className="eyebrow">Simple Surface Carpet Cleaning · {city.name}, TX</p>
            <h1>
              Carpet cleaning in {city.name}. <span className="dry">Dry by dinner.</span>
            </h1>
            <p className="lede">
              Low-moisture carpet and upholstery cleaning for {city.name} homes and businesses.
              Plugs into one wall outlet, no hoses through your door, and floors you can walk on the
              same day.
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow">
              Simple Surface Carpet Cleaning
              <span className="hide-sm"> · Fort Worth, TX · Carpet · Tile · Upholstery · Rugs</span>
              <span className="show-sm"> · Fort Worth, TX</span>
            </p>
            <h1>
              Fort Worth carpet cleaning. <span className="dry">Dry by dinner.</span>
            </h1>
            <p className="lede">
              Low-moisture carpet cleaning for Fort Worth and Tarrant County that runs off a
              standard wall outlet. No truck idling in your driveway, no hoses through your front
              door, and floors you can walk on the same day.
            </p>
          </>
        )}
        <a className="offer-chip" href="#pricing">
          <b>Flat rates</b>
          <span>From $50 a room · No deposit</span>
        </a>
        <div className="hero-ctas">
          <a className="btn btn-primary" href="#pricing">
            See my price in 60 seconds <ArrowIcon />
          </a>
          <button className="btn btn-onimg" type="button" onClick={() => openQuickLead("quick")}>
            Get a quick quote
          </button>
          <a className="btn btn-onimg hide-sm" href={BUSINESS.phoneHref}>
            Call {BUSINESS.phoneDisplay}
          </a>
        </div>
        <div className="proof">
          <span>
            <PlugIcon />
            Plugs into one outlet
          </span>
          <span>
            <ClockIcon />
            Dry in hours, not days
          </span>
          <span>
            <LeafIcon />
            Eco-friendly solutions
          </span>
        </div>
      </div>
    </section>
  );
}

export function PromiseStrip() {
  return (
    <div className="promise" aria-label="Our promises">
      <div className="wrap">
        <span>
          <b>100%</b> satisfaction guarantee
        </span>
        <span>
          <b>Flat</b> per-room pricing
        </span>
        <span>
          <b>No</b> deposit
        </span>
        <span>
          <b>Pay</b> after the job
        </span>
        <span>
          <b>Book</b> online, 24/7
        </span>
      </div>
    </div>
  );
}

function CityChip({ c, active }: { c: City; active?: boolean }) {
  return (
    <Link
      to="/carpet-cleaning/$city"
      params={{ city: cityParam(c) }}
      className={active ? "home" : undefined}
    >
      {c.name}
    </Link>
  );
}

export function CityIntro({ city }: { city: City }) {
  return (
    <section className="city" id="city">
      <div className="wrap city-grid">
        <div>
          <p className="eyebrow">
            {city.name} · {city.county}
          </p>
          <h2 style={{ marginTop: 14 }}>Carpet &amp; upholstery cleaning in {city.name}, TX</h2>
        </div>
        <div className="city-body">
          <p className="lede">{city.text}</p>
          <ul className="city-facts">
            {city.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <div className="city-near">
            <span className="eyebrow">Also serving</span>
            <div className="cities">
              {CITIES.filter((c) => c.slug !== city.slug).map((c) => (
                <CityChip key={c.slug} c={c} />
              ))}
            </div>
          </div>
          <Link className="back-dfw" to="/">
            ← Fort Worth carpet cleaning
          </Link>
        </div>
      </div>
    </section>
  );
}

/** City pages: local details plus links to each service and guide (helps Google and visitors). */
export function CityLocal({ city }: { city: City }) {
  const local = CITY_LOCAL[city.slug];
  return (
    <section className="cp-body" id="city-services">
      <div className="wrap cp-article">
        <h2>{city.name} carpet cleaning services</h2>
        <p>
          Simple Surface Carpet Cleaning cleans homes, apartments, rentals and businesses all over{" "}
          {city.name}
          {local ? `, ${local.near}` : ""}. We bring portable, low-moisture equipment that plugs
          into a regular wall outlet, so there's no truck in your driveway and no hose through your
          front door. Carpet is usually dry in a few hours.
        </p>
        <p>
          Prices are flat and the same as Fort Worth: $50 per room, $100 for a master suite, $100
          for any sofa or sectional, $50 for chairs and loveseats, and rugs from $50. Commercial
          carpet and gym floors in {city.name} start at $0.25 per square foot. There&apos;s no
          deposit, and you pay after the job.
        </p>
        <ul className="cp-cities">
          {SERVICE_PAGES.map((sp) => (
            <li key={sp.slug}>
              <a href={`/services/${sp.slug}`}>
                {sp.serviceType} in {city.name}
              </a>
            </li>
          ))}
        </ul>
        {local && (
          <p>
            ZIP codes we serve in and around {city.name}: {local.zips.join(", ")}. Not sure if
            you&apos;re in our area? Call or text {BUSINESS.phoneDisplay}.
          </p>
        )}
        <h2 style={{ marginTop: 40 }}>Helpful guides</h2>
        <ul className="cp-cities">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <a href={`/guides/${g.slug}`}>{g.h1}</a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Why() {
  return (
    <section className="why">
      <div className="wrap">
        <div className="why-head">
          <div>
            <p className="eyebrow">Why it's different</p>
            <h2 style={{ marginTop: 14 }}>No hoses. No soaked floors.</h2>
          </div>
          <figure className="why-fig">
            <img
              src="/img/outlet.jpg"
              alt="Portable cleaning machine plugged into a standard wall outlet"
              loading="lazy"
            />
            <figcaption>
              Most carpet cleaners run a hose from a truck, through your front door, for the whole
              job. Our equipment needs one wall outlet. That changes more than you'd think.
            </figcaption>
          </figure>
        </div>
        <div className="why-grid">
          <div className="why-item">
            <span className="k">Your door stays shut</span>
            <h3>Keep the AC in</h3>
            <p>
              No hose propped through the doorway in a Texas summer, so the heat and bugs stay
              outside.
            </p>
          </div>
          <div className="why-item">
            <span className="k">Less water</span>
            <h3>Dry in hours</h3>
            <p>
              Deep steam cleaning without soaking the pad. Less moisture means a faster dry and less
              chance of that musty smell.
            </p>
          </div>
          <div className="why-item">
            <span className="k">Goes anywhere</span>
            <h3>Upstairs? No problem</h3>
            <p>
              Third-floor apartments, offices and gyms with no driveway access. If there's an
              outlet, we can clean it.
            </p>
          </div>
          <div className="why-item">
            <span className="k">Sanitized</span>
            <h3>Clean you can feel</h3>
            <p>
              Hot steam and eco-friendly solutions lift dirt and sanitize carpet, tile and fabric,
              not just rinse them.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const SERVICES: {
  img?: string;
  video?: string;
  poster?: string;
  alt: string;
  lbl: string;
  h: string;
  p: string;
  from: React.ReactNode;
}[] = [
  {
    img: "/img/carpet.jpg",
    alt: "Steam cleaning carpet",
    lbl: "Carpet",
    h: "Carpet cleaning",
    p: "Deep steam cleaning that pulls out dirt, allergens and traffic lanes without leaving the fibers soaked.",
    from: (
      <>
        From <b>$50</b> / room
      </>
    ),
  },
  {
    video: "/vid/sofa.mp4",
    poster: "/vid/sofa-poster.jpg",
    alt: "Technician cleaning a gray sectional sofa",
    lbl: "Upholstery",
    h: "Sofas & chairs",
    p: "Controlled warm moisture and strong suction refresh couches, recliners and dining chairs.",
    from: (
      <>
        From <b>$50</b> / piece
      </>
    ),
  },
  {
    img: "/img/rug.jpg",
    alt: "Cleaning a patterned area rug",
    lbl: "Area rugs",
    h: "Area rugs",
    p: "Cleaned in place on your floor. Standard 8×10 and oversize rugs.",
    from: (
      <>
        From <b>$50</b> / rug
      </>
    ),
  },
  {
    img: "/img/tile.jpg",
    alt: "Scrubbing grout lines on a kitchen tile floor",
    lbl: "Tile & grout",
    h: "Tile & grout",
    p: "Kitchens, bathrooms and entryways scrubbed and steamed so the grout lines come back to their real color.",
    from: <>Included with room pricing</>,
  },
  {
    img: "/img/gym-loft.jpg",
    alt: "Technician cleaning rubber gym flooring",
    lbl: "Rubber floors",
    h: "Gym floors",
    p: "Rubber gym flooring deep-scrubbed and sanitized. Sweat and odor out, back in use the same day.",
    from: (
      <>
        <b>$0.25</b> / sq ft
      </>
    ),
  },
  {
    img: "/img/hero-low.jpg",
    alt: "Carpet cleaning in an empty home between tenants",
    lbl: "Commercial",
    h: "Offices & rentals",
    p: "Offices, apartment turnovers and short-term rentals. Scheduled around your hours.",
    from: (
      <>
        <b>$0.25</b> / sq ft
      </>
    ),
  },
];

export function Services() {
  return (
    <section id="services" className="why">
      <div className="wrap">
        <div className="svc-head">
          <div>
            <p className="eyebrow">What we clean</p>
            <h2 style={{ marginTop: 14 }}>
              Every surface,
              <br />
              one visit
            </h2>
          </div>
          <a className="btn btn-ghost" href="#pricing">
            Price it out
          </a>
        </div>
        <div className="svc-grid">
          {SERVICES.map((s) => (
            <article className="svc" key={s.h}>
              <div className="swatch">
                {s.video ? (
                  <AutoVideo src={s.video} poster={s.poster} aria-label={s.alt} />
                ) : (
                  <img src={s.img} alt={s.alt} loading="lazy" />
                )}
                <span className="lbl">{s.lbl}</span>
              </div>
              <div className="svc-body">
                <h3>{s.h}</h3>
                <p>{s.p}</p>
                <span className="from">{s.from}</span>
              </div>
            </article>
          ))}
        </div>
        <p className="swipe-hint">Swipe to see all services →</p>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section>
      <div className="wrap">
        <p className="eyebrow">How it works</p>
        <h2 style={{ marginTop: 14 }}>Three steps. One day.</h2>
        <div className="steps">
          <div className="stp">
            <span className="n">1</span>
            <h3>Price it online</h3>
            <p>
              Pick your rooms and furniture above. You see the full price, tax included, before you
              book.
            </p>
          </div>
          <div className="stp">
            <span className="n">2</span>
            <h3>We confirm by text</h3>
            <p>We text you to lock in a time, Monday to Saturday between 9am and 6pm.</p>
          </div>
          <div className="stp">
            <span className="n">3</span>
            <h3>Walk on it same day</h3>
            <p>
              We plug in, clean and leave. Most carpet is dry within a few hours. Pay when the job
              is done.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Guarantee() {
  return (
    <section className="guar" id="guarantee">
      <div className="wrap guar-grid">
        <div className="seal" aria-hidden="true">
          <svg viewBox="0 0 200 200">
            <defs>
              <path id="ring" d="M100 100 m-74 0 a74 74 0 1 1 148 0 a74 74 0 1 1 -148 0" />
            </defs>
            <circle cx="100" cy="100" r="96" fill="var(--ink)" />
            <circle
              cx="100"
              cy="100"
              r="86"
              fill="none"
              stroke="#f4b23e"
              strokeWidth="1.5"
              strokeDasharray="2 5"
            />
            <text
              fontFamily="JetBrains Mono, monospace"
              fontSize="11.5"
              letterSpacing="3.2"
              fill="#8fd0ff"
            >
              <textPath href="#ring">SATISFACTION GUARANTEED · SIMPLE SURFACE · </textPath>
            </text>
            <text
              x="100"
              y="104"
              textAnchor="middle"
              fontFamily="Archivo, Arial Narrow, sans-serif"
              fontWeight="900"
              fontSize="50"
              fill="#fff"
            >
              100%
            </text>
            <text
              x="100"
              y="128"
              textAnchor="middle"
              fontFamily="Archivo, sans-serif"
              fontWeight="800"
              fontSize="13"
              letterSpacing="2.4"
              fill="#f4b23e"
            >
              SATISFIED
            </text>
          </svg>
        </div>
        <div>
          <p className="eyebrow">Our promise</p>
          <h2 style={{ marginTop: 14 }}>100% Customer Satisfaction Guarantee</h2>
          <p className="lede" style={{ marginTop: 16 }}>
            We will come out and touch up or spot clean anything that doesn't look right to you
            after we are gone!
          </p>
          <ul className="g-list">
            <li>
              <b>Touch-ups &amp; spot cleans</b>
              <span>If anything doesn't look right after we leave</span>
            </li>
            <li>
              <b>No deposit</b>
              <span>Pay after the job is done</span>
            </li>
            <li>
              <b>Flat prices</b>
              <span>The price you see is the price you pay</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

const TILES: {
  video?: string;
  poster?: string;
  img?: string;
  alt: string;
  b: string;
  s: string;
}[] = [
  {
    video: "/vid/lane.mp4",
    poster: "/vid/lane-poster.jpg",
    alt: "Steam cleaning revealing a clean lane in carpet",
    b: "The clean lane",
    s: "Steam lifts what vacuuming leaves behind",
  },
  {
    video: "/vid/plug.mp4",
    poster: "/vid/plug-poster.jpg",
    alt: "Gloved hand plugging the cleaning machine into a wall outlet",
    b: "One outlet",
    s: "No truck, no hoses through your door",
  },
  {
    img: "/img/rug2.jpg",
    alt: "Cleaning a patterned area rug",
    b: "Rugs in place",
    s: "Cleaned right on your floor",
  },
  {
    img: "/img/carpet2.jpg",
    alt: "Steam lifting carpet fibers",
    b: "Low moisture",
    s: "Fibers lifted, not soaked",
  },
];

export function Gallery() {
  return (
    <section id="action">
      <div className="wrap">
        <div className="svc-head" style={{ marginBottom: 0 }}>
          <div>
            <p className="eyebrow">How we clean</p>
            <h2 style={{ marginTop: 14 }}>See it in action</h2>
          </div>
          <p className="lede" style={{ maxWidth: "40ch" }}>
            A closer look at the process, from plugging in to the final pass.
          </p>
        </div>
        <div className="gal2">
          <BeforeAfter />
          <div className="gal">
            {TILES.map((t) => (
              <figure className="tile" key={t.b}>
                {t.video ? (
                  <AutoVideo src={t.video} poster={t.poster} aria-label={t.alt} />
                ) : (
                  <img src={t.img} alt={t.alt} loading="lazy" />
                )}
                <figcaption>
                  <b>{t.b}</b>
                  <span>{t.s}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQ: [string, string][] = [
  [
    "How long until I can walk on my carpet?",
    "Usually within a few hours. Low-moisture cleaning uses far less water than a truck-mounted system, so carpet dries much faster. Running your AC or a fan speeds it up.",
  ],
  [
    "Do you need water or a hose hookup?",
    "No. Our equipment plugs into a standard wall outlet. Nothing runs through your door, and we don't need your spigot or a spot in the driveway.",
  ],
  [
    "What counts as a master suite?",
    "The main bedroom plus its attached bathroom and closet, priced together at $100.",
  ],
  [
    "Do I need to move furniture?",
    "Please pick up small items, toys and anything fragile. We clean around large furniture like beds and dressers.",
  ],
  [
    "Are your products safe around kids and pets?",
    "We use eco-friendly cleaning solutions. Let us know about pets when you book and we'll plan the visit around them.",
  ],
  [
    "What is your satisfaction guarantee?",
    "We will come out and touch up or spot clean anything that doesn't look right to you after we are gone!",
  ],
  ["Do you require a deposit?", "No. There's no deposit to book. You pay after the job is done."],
  [
    "When do I pay?",
    "After the job is done. No deposit. Prices are flat per room or per piece. Texas sales tax of 8.25% is added to the total.",
  ],
];

/** FAQ shown on a page (and mirrored in its structured data). City pages lead with local questions. */
export function faqFor(city?: City): [string, string][] {
  const areaList = CITIES.map((c) => c.name).join(", ");
  if (!city)
    return [
      [
        "What areas does Simple Surface Carpet Cleaning serve?",
        `We're based in Fort Worth and clean homes and businesses across Tarrant County, including ${areaList}.`,
      ],
      ...FAQ,
    ];
  return [
    [
      `Do you offer carpet cleaning in ${city.name}, TX?`,
      `Yes. Simple Surface Carpet Cleaning cleans carpet, upholstery, rugs and tile for homes and businesses in ${city.name} and across ${city.county}. Book online in about a minute or call ${BUSINESS.phoneDisplay}.`,
    ],
    ...(CITY_LOCAL[city.slug]
      ? ([
          [
            `Which ${city.name} ZIP codes do you serve?`,
            `We clean throughout ${city.name}, including ZIP codes ${CITY_LOCAL[city.slug]!.zips.join(", ")}, and the rest of ${city.county}.`,
          ],
        ] as [string, string][])
      : []),
    [
      `How much does carpet cleaning cost in ${city.name}?`,
      `${city.name} gets the same flat prices as everywhere we work: $50 per room, $100 for a master suite, and flat prices for sofas, chairs and rugs. No deposit, and you pay after the job. Texas sales tax of 8.25% is added.`,
    ],
    ...FAQ,
  ];
}

export function AreasFaq({ city }: { city?: City | undefined }) {
  return (
    <section className="why" id="faq">
      <div className="wrap two">
        <div id="areas">
          <p className="eyebrow">Service area</p>
          <h2 style={{ marginTop: 14 }}>
            {city
              ? `Carpet cleaning in ${city.name} & nearby`
              : "Carpet cleaning in Fort Worth & nearby"}
          </h2>
          <div className="cities">
            {CITIES.map((c, i) => (
              <CityChip key={c.slug} c={c} active={city ? c.slug === city.slug : i === 0} />
            ))}
          </div>
          <dl className="hours">
            <dt>HOURS</dt>
            <dd>{BUSINESS.hours}</dd>
            <dt>PHONE</dt>
            <dd className="mono">
              <a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a>
            </dd>
            <dt>EMAIL</dt>
            <dd>
              <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
            </dd>
          </dl>
        </div>
        <div className="faq">
          <p className="eyebrow" style={{ marginBottom: 14 }}>
            Questions
          </p>
          {faqFor(city).map(([q, a], i) => (
            <details key={q} open={i === 0}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="final">
      <img className="final-img" src="/img/home.jpg" alt="" loading="lazy" />
      <div className="final-shade" aria-hidden="true" />
      <div className="wrap final-in">
        <h2>Ready for clean floors?</h2>
        <p>Price your job in a minute, or send us your number and we'll text you a price.</p>
        <div className="final-ctas">
          <a className="btn btn-primary" href="#pricing">
            Get my price
          </a>
          <button className="btn btn-onimg" type="button" onClick={() => openQuickLead("quick")}>
            Text me a quote
          </button>
          <a className="btn btn-onimg" href={textUsHref()}>
            Text us
          </a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div>
          <Link className="brand" to="/">
            <BrandMark />
            <span>
              <b>Simple Surface</b>
              <small>{BUSINESS.tagline}</small>
            </span>
          </Link>
          <p style={{ marginTop: 14, maxWidth: "34ch" }}>
            Simple Surface Carpet Cleaning: low-moisture carpet, tile, upholstery and rug cleaning
            for homes and businesses in Fort Worth and Tarrant County, TX.
          </p>
        </div>
        <div>
          <h4>Services</h4>
          <ul>
            <li>
              <a href="/guides/carpet-cleaning-cost-fort-worth">Carpet cleaning prices</a>
            </li>
            <li>
              <a href="/services/upholstery-cleaning">Upholstery &amp; couches</a>
            </li>
            <li>
              <a href="/services/rug-cleaning">Area rugs</a>
            </li>
            <li>
              <a href="/services/tile-grout-cleaning">Tile &amp; grout</a>
            </li>
            <li>
              <a href="/services/commercial-carpet-cleaning">Commercial</a>
            </li>
            <li>
              <a href="/services/pet-stain-odor-removal">Pet stains &amp; odor</a>
            </li>
            <li>
              <a href="/services/move-out-carpet-cleaning">Move-out cleaning</a>
            </li>
          </ul>
        </div>
        <div>
          <h4>Service areas</h4>
          <ul>
            {CITIES.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <CityChip c={c} />
              </li>
            ))}
            <li>
              <a href="/#areas">All areas</a>
            </li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li className="mono">
              <a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a>
            </li>
            <li>
              <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
            </li>
            <li>{BUSINESS.hours}</li>
          </ul>
        </div>
        <div>
          <h4>Guides</h4>
          <ul>
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <a href={`/guides/${g.slug}`}>{g.h1.replace(/\?$/, "")}</a>
              </li>
            ))}
            <li>
              <a href={BUSINESS.instagram} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>{" "}
              ·{" "}
              <a href={BUSINESS.facebook} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="wrap legal">
        <span>
          © {new Date().getFullYear()} {BUSINESS.legalName} · Fort Worth, TX
        </span>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms of Service</Link>
      </div>
    </footer>
  );
}

export function MobileBar({
  total,
  inPricing,
  cta,
}: {
  total: number;
  inPricing: boolean;
  cta?: { href: string; label: string } | undefined;
}) {
  const booking = inPricing && total > 0;
  return (
    <div className="mbar">
      <a className="btn btn-ghost" href={BUSINESS.phoneHref}>
        Call
      </a>
      <a className="btn btn-ghost" href={textUsHref()}>
        Text
      </a>
      {cta ? (
        <a className="btn btn-primary" href={cta.href}>
          {cta.label}
        </a>
      ) : (
        <a className="btn btn-primary" href={booking ? "#book" : "#pricing"}>
          {booking ? `Book · ${money(total)}` : "Get my price"}
        </a>
      )}
    </div>
  );
}

export function WhatsAppFab({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className="wa-fab" onClick={onOpen} aria-label="Get a quote on WhatsApp">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3 20.5l1.8-5.2A8.4 8.4 0 1 1 21 11.5z" />
      </svg>
      <span>WhatsApp</span>
    </button>
  );
}
