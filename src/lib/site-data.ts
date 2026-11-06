/* ---------- Business details and prices: edit here ---------- */

export const BUSINESS = {
  name: "Simple Surface",
  brandName: "Simple Surface Carpet Cleaning",
  domain: "simplesurfacecarpetcleaning.com",
  legalName: "Simple Surface LLC",
  tagline: "Eco-friendly - Low moisture - Steam",
  phoneDisplay: "214-562-3449",
  phoneHref: "tel:+12145623449",
  email: "simplesurfacellc@gmail.com",
  hours: "Mon–Sat, 9am–6pm",
  instagram: "https://www.instagram.com/simplesurfacellc/",
  facebook: "https://www.facebook.com/simplesurfacellc",
};

/** The live site. Customer links (quotes, emails) always point here, except during local testing. */
export const SITE_ORIGIN = "https://simplesurfacecarpetcleaning.com";
export function publicOrigin(): string {
  if (typeof window === "undefined") return SITE_ORIGIN;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" ? window.location.origin : SITE_ORIGIN;
}

/**
 * Leave-the-site pop-up. offer "quote" = "Want your price texted to you?";
 * "guide" = free Holiday Stain Guide by email. People who used the price builder always get
 * "Save your price?". Set enabled: false to turn it off.
 */
export const EXIT_POPUP: { enabled: boolean; offer: "quote" | "guide" } = {
  enabled: true,
  offer: "quote",
};

export const TAX = 0.0825;
export const COMMERCIAL_RATE = 0.25; // dollars per sq ft

export type Item = { id: string; name: string; sub: string; price: number };
export type ItemGroup = { group: string; items: Item[] };

export const ITEM_GROUPS: ItemGroup[] = [
  {
    group: "Rooms",
    items: [
      { id: "room", name: "Room", sub: "Bedroom, family room, kitchen or dining room", price: 50 },
      { id: "master", name: "Master suite", sub: "Room + bathroom + closet", price: 100 },
    ],
  },
  {
    group: "Furniture",
    items: [
      {
        id: "chair",
        name: "Recliner, armchair or loveseat",
        sub: "Two-seat sofas included",
        price: 50,
      },
      { id: "sofa", name: "Full-size or sectional sofa", sub: "Any size sectional", price: 100 },
    ],
  },
  {
    group: "Rugs",
    items: [
      { id: "rug", name: "Standard rug", sub: "Up to 8×10", price: 50 },
      { id: "rugxl", name: "Oversize rug", sub: "Larger than 8×10", price: 100 },
    ],
  },
];

export const ITEMS: Item[] = ITEM_GROUPS.flatMap((g) => g.items);

export type Quantities = Record<string, number>;

export const PRESETS: { id: string; label: string; q: Quantities }[] = [
  { id: "apt", label: "Apartment refresh", q: { room: 2, chair: 1 } },
  { id: "home", label: "Family home", q: { room: 3, master: 1, sofa: 1 } },
  { id: "move", label: "Move-out clean", q: { room: 3, master: 1 } },
  { id: "couch", label: "Couch rescue", q: { sofa: 1, chair: 2 } },
];

export const DEFAULT_PRESET = "home";

/** How many jobs he can take per arrival window. */
export const SLOTS_PER_WINDOW = 1;

export const ARRIVAL_WINDOWS = ["9–11am", "11am–1pm", "1–3pm", "3–5pm"];

export function emptyQuantities(): Quantities {
  return Object.fromEntries(ITEMS.map((i) => [i.id, 0]));
}

export function totals(q: Quantities) {
  const sub = ITEMS.reduce((s, i) => s + (q[i.id] ?? 0) * i.price, 0);
  const tax = Math.round(sub * TAX * 100) / 100;
  return { sub, tax, total: sub + tax };
}

export function lineItems(q: Quantities) {
  return ITEMS.filter((i) => (q[i.id] ?? 0) > 0).map((i) => ({
    label: `${q[i.id]} × ${i.name}`,
    amount: (q[i.id] ?? 0) * i.price,
  }));
}

/** Quantities in a short link-friendly form, e.g. "room:3,sofa:1" (for "send me this price"). */
export const encodeQuantities = (q: Quantities) =>
  ITEMS.filter((i) => (q[i.id] ?? 0) > 0)
    .map((i) => `${i.id}:${q[i.id]}`)
    .join(",");

export function decodeQuantities(s: string): Quantities | null {
  const q = emptyQuantities();
  let any = false;
  for (const part of s.split(",")) {
    const [id, n] = part.split(":");
    const count = Math.min(20, Math.max(0, Math.floor(Number(n))));
    if (id && id in q && count > 0) {
      q[id] = count;
      any = true;
    }
  }
  return any ? q : null;
}

/**
 * WhatsApp number that receives "Message us on WhatsApp" leads (country code + number, digits only).
 * WhatsApp click-to-chat goes to one number; the team alert email covers everyone else.
 */
export const WHATSAPP_NUMBER = "12145623449";
export const whatsappHref = (text: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

/** Opens the customer's texting app with a message ready to send. */
export const textUsHref = (body = "Hi! I'd like a quote for carpet cleaning.") =>
  `sms:+12145623449?&body=${encodeURIComponent(body)}`;

export const money = (n: number, digits = 0) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/* ---------- Service-area city pages ---------- */

export type City = {
  slug: string;
  name: string;
  county: string;
  text: string;
  facts: string[];
};

export const CITIES: City[] = [
  {
    slug: "fort-worth",
    name: "Fort Worth",
    county: "Tarrant County",
    text: "From older pier-and-beam homes to new builds on the north side, Fort Worth homes get deep-cleaned carpet without a hose run through the front door. We're based here, so Fort Worth gets the most open booking windows.",
    facts: [
      "Home base: the widest choice of days and times",
      "Apartments, condos and townhomes on any floor",
      "Homes, offices, gyms and short-term rentals",
    ],
  },
  {
    slug: "arlington",
    name: "Arlington",
    county: "Tarrant County",
    text: "Arlington households get carpet that's dry in hours, so hosting family or a game-day crowd doesn't mean tiptoeing around wet floors.",
    facts: [
      "Same flat per-room pricing as Fort Worth",
      "Great for apartments and upstairs units",
      "Move-out cleans for renters and landlords",
    ],
  },
  {
    slug: "keller",
    name: "Keller",
    county: "Tarrant County",
    text: "Keller's larger family homes mean more rooms and more traffic lanes. Our flat per-room pricing keeps whole-house cleans simple to budget.",
    facts: [
      "Whole-home packages priced up front",
      "Kid- and pet-friendly cleaning solutions",
      "Sofas, sectionals and area rugs in the same visit",
    ],
  },
  {
    slug: "southlake",
    name: "Southlake",
    county: "Tarrant County",
    text: "Southlake homeowners get a quiet, clean visit: no truck idling in the driveway and no hoses across the entry, just portable equipment plugged into one outlet.",
    facts: [
      "No truck or hoses at the curb",
      "Fine area rugs cleaned in place",
      "Upholstery and sectionals refreshed",
    ],
  },
  {
    slug: "north-richland-hills",
    name: "North Richland Hills",
    county: "Tarrant County",
    text: "North Richland Hills homes get steam-cleaned carpet that dries fast, so the house is back to normal the same day.",
    facts: [
      "Same-day dry for busy households",
      "Pet stain and odor spots treated on site",
      "Flat prices with tax shown up front",
    ],
  },
  {
    slug: "hurst",
    name: "Hurst",
    county: "Tarrant County",
    text: "Hurst homes and apartments get low-moisture carpet cleaning with flat prices you can see before you book.",
    facts: [
      "Instant online price",
      "Apartments and townhomes welcome",
      "Pay after the job is done",
    ],
  },
  {
    slug: "euless",
    name: "Euless",
    county: "Tarrant County",
    text: "Euless families and renters get deep-cleaned carpet and upholstery without soaking the floors or waiting a day for them to dry.",
    facts: [
      "Move-in and move-out cleans",
      "Sofas and recliners refreshed",
      "Dry in hours, not days",
    ],
  },
  {
    slug: "bedford",
    name: "Bedford",
    county: "Tarrant County",
    text: "Bedford homes get carpet, tile and upholstery cleaned in one visit, with no hose through the door and floors ready the same day.",
    facts: [
      "Carpet, tile and upholstery in one visit",
      "Flat per-room pricing",
      "100% satisfaction guarantee",
    ],
  },
  {
    slug: "haltom-city",
    name: "Haltom City",
    county: "Tarrant County",
    text: "Haltom City homes and businesses get affordable flat-rate carpet cleaning just minutes from Fort Worth.",
    facts: [
      "Homes, shops and offices",
      "Commercial at $0.25 per sq ft",
      "Evening and early slots for businesses",
    ],
  },
  {
    slug: "benbrook",
    name: "Benbrook",
    county: "Tarrant County",
    text: "Benbrook homes on the southwest side of Fort Worth get the same flat pricing and fast-dry cleaning as the city.",
    facts: ["Flat per-room pricing", "Area rugs cleaned in place", "Pay after the job"],
  },
  {
    slug: "burleson",
    name: "Burleson",
    county: "Johnson County",
    text: "Burleson homes get low-moisture carpet cleaning that's dry in hours, with flat prices shown before you book.",
    facts: ["Instant online price", "Whole-home and move-out cleans", "Pet-friendly solutions"],
  },
  {
    slug: "saginaw",
    name: "Saginaw",
    county: "Tarrant County",
    text: "Saginaw's newer neighborhoods get fast-dry carpet and upholstery cleaning with nothing run through the front door.",
    facts: [
      "New-build and family homes",
      "Sofas, sectionals and rugs",
      "100% satisfaction guarantee",
    ],
  },
];

/** URL param for a city page, e.g. "keller-tx" → /carpet-cleaning/keller-tx */
export const cityParam = (c: City) => `${c.slug}-tx`;
export const findCity = (param: string) => CITIES.find((c) => cityParam(c) === param);
