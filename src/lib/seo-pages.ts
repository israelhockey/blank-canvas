import type { Quantities } from "./site-data";

/*
 * Service pages (/services/<slug>) and guides (/guides/<slug>).
 * Every price here matches site-data.ts. Keep facts to what the business actually offers.
 */

export type Block = { h: string; p: string[]; list?: string[] };

export type ContentPage = {
  kind: "service" | "guide";
  slug: string;
  /** <title>, ~60 characters, main keyword first */
  title: string;
  /** meta description, ~155 characters */
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  image: string;
  imageAlt: string;
  /** Short price line shown in the hero */
  price?: string;
  /** schema.org Service name + offer */
  serviceType?: string;
  lowPrice?: number;
  blocks: Block[];
  faqs: [string, string][];
  /** Pre-fills the price builder on this page */
  preset?: Quantities;
  /** Commercial page shows the walkthrough form instead of the residential builder */
  commercial?: boolean;
  related: string[];
};

const svc = (p: Omit<ContentPage, "kind">): ContentPage => ({ kind: "service", ...p });
const guide = (p: Omit<ContentPage, "kind">): ContentPage => ({ kind: "guide", ...p });

export const SERVICE_PAGES: ContentPage[] = [
  svc({
    slug: "upholstery-cleaning",
    title: "Upholstery & Couch Cleaning Fort Worth | Sofas from $100",
    description:
      "Couch and upholstery cleaning in Fort Worth and Tarrant County. Sofas and sectionals $100 flat, chairs and loveseats $50. Cleaned at your home, dry in hours.",
    eyebrow: "Upholstery cleaning · Fort Worth, TX",
    h1: "Couch & upholstery cleaning in Fort Worth",
    intro:
      "Sofas, sectionals, recliners and dining chairs cleaned right in your living room. Controlled warm moisture and strong suction lift body oils, food, pet hair and everyday grime without soaking the cushions, so your couch is ready to use again the same day.",
    image: "/vid/sofa-poster.jpg",
    imageAlt: "Technician cleaning a light gray sectional sofa in a Fort Worth home",
    price: "Any sofa or sectional $100 · Chairs & loveseats $50",
    serviceType: "Upholstery cleaning",
    lowPrice: 50,
    preset: { sofa: 1, chair: 1 },
    blocks: [
      {
        h: "Flat upholstery cleaning prices",
        p: [
          "Upholstery is priced per piece, not by the cushion or the seat, so you know the total before we arrive. A full-size sofa or any size sectional is $100. A recliner, armchair or loveseat is $50. Texas sales tax of 8.25% is added, there's no deposit, and you pay after the job.",
          "Most customers book upholstery with their carpet in the same visit. Add rooms, sofas and rugs in the price builder below and the total updates as you go.",
        ],
      },
      {
        h: "What our couch cleaning includes",
        p: [
          "Every piece gets the same careful process, whether it's a family-room sectional or a single recliner.",
        ],
        list: [
          "A quick look at the fabric and any stains before we start",
          "Vacuuming of cushions, arms and crevices to pull up loose dirt and pet hair",
          "Pre-treatment of spots and high-contact areas like arms and headrests",
          "Low-moisture cleaning with warm water and eco-friendly solutions",
          "Strong extraction so cushions dry in hours, not days",
          "A final grooming of the fabric so it dries evenly",
        ],
      },
      {
        h: "Why low-moisture works for upholstery",
        p: [
          "Couch cushions hold water much longer than carpet. Too much moisture can leave rings, a musty smell or a cushion that stays damp overnight. Our portable equipment uses far less water than a truck-mounted system and pulls most of it back out, so fabric dries quickly.",
          "The machine plugs into a regular wall outlet. There are no hoses run through your front door and no truck idling in the driveway, which makes it a good fit for apartments, upstairs units and gated communities.",
        ],
      },
      {
        h: "Upholstery cleaning across Tarrant County",
        p: [
          "We're based in Fort Worth and clean sofas and chairs in Keller, Southlake, Arlington, North Richland Hills, Hurst, Euless, Bedford, Haltom City, Benbrook, Burleson and Saginaw. Prices are the same in every city.",
        ],
      },
    ],
    faqs: [
      [
        "How much does couch cleaning cost in Fort Worth?",
        "A full-size sofa or any size sectional is $100 flat. Recliners, armchairs and loveseats are $50 each. Texas sales tax of 8.25% is added, with no deposit, and you pay after the job.",
      ],
      [
        "How long does a couch take to dry?",
        "Usually a few hours. Low-moisture cleaning leaves far less water in the cushions than other methods, and a fan or your AC speeds it up.",
      ],
      [
        "Can you clean a sectional?",
        "Yes. Any size sectional is priced the same as a full-size sofa: $100 flat.",
      ],
      [
        "Can you get pet hair and odor out of a couch?",
        "We vacuum pet hair before cleaning and treat spots during the clean. Heavy pet odor treatment is quoted on site after we see it.",
      ],
      [
        "Do I need to be home?",
        "Someone needs to let us in and point out the pieces. Most upholstery jobs take well under an hour per piece.",
      ],
    ],
    related: ["rug-cleaning", "pet-stain-odor-removal", "how-long-does-carpet-take-to-dry"],
  }),
  svc({
    slug: "rug-cleaning",
    title: "Area Rug Cleaning Fort Worth | Cleaned in Place from $50",
    description:
      "Area rug cleaning in Fort Worth and Tarrant County, done in place on your floor. Standard rugs up to 8×10 are $50, oversize rugs $100. No pickup, no deposit.",
    eyebrow: "Rug cleaning · Fort Worth, TX",
    h1: "Area rug cleaning in Fort Worth, done in place",
    intro:
      "We clean area rugs right where they lie, so there's no rolling, hauling or waiting a week for a pickup service. Standard rugs up to 8×10 are $50 and oversize rugs are $100, with no deposit and payment after the job.",
    image: "/img/rug.jpg",
    imageAlt: "Cleaning wand leaving a bright clean stripe across an area rug",
    price: "Standard rugs $50 · Oversize rugs $100",
    serviceType: "Rug cleaning",
    lowPrice: 50,
    preset: { rug: 1, room: 2 },
    blocks: [
      {
        h: "Rug cleaning prices",
        p: [
          "A standard area rug, up to 8×10, is $50. Anything larger than 8×10 is an oversize rug at $100. Prices include pre-treatment of normal spots. Texas sales tax of 8.25% is added at the end.",
          "Have carpet too? Add rooms in the price builder below and we'll clean everything in one visit.",
        ],
      },
      {
        h: "How in-place rug cleaning works",
        p: ["Cleaning a rug on your floor is faster and easier than sending it out."],
        list: [
          "We vacuum the rug thoroughly to lift grit from deep in the pile",
          "Spots and traffic areas are pre-treated",
          "The rug is cleaned with low-moisture steam and eco-friendly solutions",
          "Strong suction pulls the water and dirt back out",
          "We groom the pile so it dries evenly, usually within a few hours",
        ],
      },
      {
        h: "Which rugs we clean",
        p: [
          "We clean most everyday area rugs: living room and bedroom rugs, runners, kitchen rugs and large rugs under dining tables. Tell us about your rug when you book, especially if it's wool, silk, hand-knotted or antique. Delicate fibers and loose dyes need a closer look, and we'll let you know honestly what we recommend before we start.",
        ],
      },
      {
        h: "Rug cleaning near you",
        p: [
          "We clean rugs in Fort Worth, Keller, Southlake, Arlington, North Richland Hills, Hurst, Euless, Bedford, Haltom City, Benbrook, Burleson and Saginaw, at the same flat prices everywhere.",
        ],
      },
    ],
    faqs: [
      [
        "How much does rug cleaning cost?",
        "Standard rugs up to 8×10 are $50. Rugs larger than 8×10 are $100. Tax is added, there's no deposit, and you pay after the job.",
      ],
      [
        "Do you pick up rugs?",
        "No, we clean rugs in place on your floor. That means no pickup fee and no waiting days to get your rug back.",
      ],
      [
        "Will cleaning damage my floor under the rug?",
        "Low-moisture cleaning uses little water, and we control it carefully. Let us know if the rug sits on hardwood so we can plan for it.",
      ],
      [
        "Can you clean wool or silk rugs?",
        "Tell us the material when you book. Some delicate or antique rugs need special care, and we'll tell you honestly what we recommend.",
      ],
    ],
    related: [
      "upholstery-cleaning",
      "pet-stain-odor-removal",
      "low-moisture-vs-hot-water-extraction",
    ],
  }),
  svc({
    slug: "pet-stain-odor-removal",
    title: "Pet Stain & Odor Removal Carpet Fort Worth | Simple Surface",
    description:
      "Pet stain and odor removal for carpet, rugs and couches in Fort Worth and Tarrant County. Eco-friendly solutions, flat room prices, odor treatment quoted on site.",
    eyebrow: "Pet stains & odor · Fort Worth, TX",
    h1: "Pet stain & odor removal for carpet in Fort Worth",
    intro:
      "Accidents happen. We clean pet stains out of carpet, rugs and upholstery with eco-friendly solutions, and treat odor where it starts. Rooms are a flat $50, and heavy odor treatment is quoted on site once we can see what's going on.",
    image: "/img/home.jpg",
    imageAlt: "Dog relaxing on clean carpet in a bright living room",
    price: "Rooms $50 · Odor treatment quoted on site",
    serviceType: "Pet stain and odor removal",
    lowPrice: 50,
    preset: { room: 2, sofa: 1 },
    blocks: [
      {
        h: "How we handle pet stains and odor",
        p: [
          "A pet stain is two problems: the mark you can see and the odor that can soak below it. Normal cleaning lifts most fresh spots. Older urine spots and strong odors may need extra treatment, which is why we look first and give you the price before doing anything extra.",
        ],
        list: [
          "We find the spots, including ones you might not see",
          "Spots are pre-treated with eco-friendly solutions",
          "The carpet is cleaned with low-moisture steam and strong extraction",
          "Odor treatment is applied where it's needed, quoted on site",
          "Floors dry in hours, so pets and kids are back on them the same day",
        ],
      },
      {
        h: "Pet-friendly cleaning",
        p: [
          "We use eco-friendly cleaning solutions. Let us know about your pets when you book and we'll plan the visit around them. Many owners keep pets in another room or the backyard while we work, then let them back in once the carpet is dry.",
        ],
      },
      {
        h: "What to do before we get there",
        p: [
          "For a fresh accident, blot up as much as you can with a white towel and cold water. Don't scrub, and skip hot water or strong-smelling cleaners, which can push the stain deeper or make odors worse. Our guide on getting pet urine out of carpet has more tips.",
        ],
      },
      {
        h: "Prices",
        p: [
          "Carpet is $50 per room and $100 for a master suite. Sofas and sectionals are $100, chairs $50, and rugs from $50. Heavy pet odor treatment is quoted on site before we start. No deposit, and you pay after the job.",
        ],
      },
    ],
    faqs: [
      [
        "Can you get dog and cat urine smell out of carpet?",
        "Fresh spots usually come out with normal cleaning. Older urine and strong odors may need extra odor treatment, which we quote on site after seeing it.",
      ],
      [
        "Are your products safe for pets?",
        "We use eco-friendly cleaning solutions. Keep pets off the carpet until it's dry, usually a few hours.",
      ],
      [
        "Do you charge extra for pet stains?",
        "Normal spot treatment is included in the room price. Heavy pet odor treatment is quoted on site, and we tell you the price before doing it.",
      ],
      [
        "Can you clean pet stains on a couch?",
        "Yes. Sofas and sectionals are $100 and chairs are $50, including normal spot treatment.",
      ],
    ],
    related: ["how-to-get-pet-urine-out-of-carpet", "upholstery-cleaning", "rug-cleaning"],
  }),
  svc({
    slug: "move-out-carpet-cleaning",
    title: "Move-Out Carpet Cleaning Fort Worth | $50 a Room, Dry Fast",
    description:
      "Move-out and move-in carpet cleaning in Fort Worth and Tarrant County for renters, landlords and realtors. Flat $50 per room, dry in hours, no deposit.",
    eyebrow: "Move-out carpet cleaning · Fort Worth, TX",
    h1: "Move-out carpet cleaning in Fort Worth",
    intro:
      "Get the carpet clean before the final walkthrough, the listing photos or the new tenant. Rooms are a flat $50, a master suite is $100, and low-moisture cleaning means the carpet is dry in hours, not holding up your move.",
    image: "/img/hero-low.jpg",
    imageAlt: "Carpet being cleaned in an empty home between tenants",
    price: "Rooms $50 · Master suite $100",
    serviceType: "Move-out carpet cleaning",
    lowPrice: 50,
    preset: { room: 3, master: 1 },
    blocks: [
      {
        h: "For renters, landlords and realtors",
        p: [
          "Renters book us to help get their deposit back. Landlords and property managers book us between tenants. Realtors book us before photos and showings. In every case, the carpet looks cleaner, smells fresher and dries fast enough to keep the schedule moving.",
        ],
      },
      {
        h: "Move-out carpet cleaning prices",
        p: [
          "Each bedroom, living room or dining room is $50. A master suite, which is the main bedroom plus its bathroom and closet, is $100. A typical 3-bedroom move-out with a master suite comes to $250 before tax. Hallways, stairs, heavy stains and pet odor treatment are quoted on site.",
          "There's no deposit, and you pay after the job. Need a receipt for your landlord? We email one when you pay.",
        ],
      },
      {
        h: "Easy to schedule in an empty home",
        p: [
          "Empty homes are the easiest to clean well. We need power at the outlets and a way in. Our equipment plugs into a standard wall outlet, so we don't need water hookups, a hose through the door or a spot in the driveway.",
        ],
        list: [
          "Book online and pick a 2-hour arrival window",
          "Let us know how we're getting in (you, a lockbox or the property manager)",
          "We clean, extract and groom the carpet",
          "Carpet is dry in hours, ready for the walkthrough",
        ],
      },
      {
        h: "Move-out cleans across the area",
        p: [
          "We do move-out and move-in carpet cleaning in Fort Worth, Arlington, Keller, Southlake, North Richland Hills, Hurst, Euless, Bedford, Haltom City, Benbrook, Burleson and Saginaw.",
        ],
      },
    ],
    faqs: [
      [
        "How much is move-out carpet cleaning?",
        "$50 per room and $100 for a master suite. A 3-bedroom home with a master suite is $250 plus tax. Stairs and heavy stains are quoted on site.",
      ],
      [
        "Will this help me get my deposit back?",
        "Clean carpet helps at the walkthrough, but every lease is different. Check your lease for the carpet-cleaning terms and ask us for a receipt.",
      ],
      [
        "Do you need the utilities on?",
        "We need electricity. We don't need a water hookup or hose access.",
      ],
      [
        "Can a property manager book for an empty unit?",
        "Yes. Book online and add access notes, like a lockbox code, in the notes box.",
      ],
    ],
    related: [
      "move-out-carpet-cleaning-checklist",
      "carpet-cleaning-cost-fort-worth",
      "tile-grout-cleaning",
    ],
  }),
  svc({
    slug: "tile-grout-cleaning",
    title: "Tile & Grout Cleaning Fort Worth | Simple Surface",
    description:
      "Tile and grout cleaning in Fort Worth and Tarrant County for kitchens, bathrooms and entryways. Priced like rooms, done in the same visit as your carpet.",
    eyebrow: "Tile & grout cleaning · Fort Worth, TX",
    h1: "Tile & grout cleaning in Fort Worth",
    intro:
      "Kitchens, bathrooms and entryways scrubbed and steamed so the grout lines come back to their real color. Tile is priced like a room, so it's easy to add to your carpet cleaning in the same visit.",
    image: "/img/tile.jpg",
    imageAlt: "Scrubbing dirty grout lines on a kitchen tile floor",
    price: "Priced like a room · Same visit as your carpet",
    serviceType: "Tile and grout cleaning",
    lowPrice: 50,
    preset: { room: 3 },
    blocks: [
      {
        h: "Why grout gets dark",
        p: [
          "Grout is porous, so it soaks up spills, mop water and everyday dirt. Regular mopping often spreads dirty water into the grout lines, which is why they get darker over time even in a clean home.",
        ],
      },
      {
        h: "How we clean tile and grout",
        p: ["We clean tile with the same low-moisture approach we use on carpet."],
        list: [
          "Grout lines are pre-treated to loosen built-up dirt",
          "Tile and grout are scrubbed",
          "Steam lifts the loosened grime",
          "We extract the dirty water instead of leaving it behind",
          "Floors are ready to walk on shortly after",
        ],
      },
      {
        h: "Tile & grout pricing",
        p: [
          "Tile floors are priced like rooms, using the same flat room pricing as carpet. Add a kitchen, bathroom or entry as a room in the price builder below. Large open areas, heavy buildup and commercial tile are quoted on site.",
        ],
      },
      {
        h: "Carpet, tile and upholstery in one visit",
        p: [
          "Most homes have a mix of carpet and tile. We clean both in one visit, along with sofas and rugs, so the whole house is done at once. We serve Fort Worth and Tarrant County, including Keller, Southlake, Arlington, NRH, Hurst, Euless and Bedford.",
        ],
      },
    ],
    faqs: [
      [
        "How much does tile and grout cleaning cost?",
        "Tile floors are priced like rooms, using our flat room pricing. Large areas, heavy buildup and commercial tile are quoted on site.",
      ],
      [
        "Can you clean tile and carpet in the same visit?",
        "Yes. Most of our customers book carpet, tile and upholstery together.",
      ],
      ["Do you seal grout?", "Ask us when you book. We'll tell you what we offer for your floor."],
    ],
    related: [
      "move-out-carpet-cleaning",
      "commercial-carpet-cleaning",
      "how-often-should-you-clean-carpet",
    ],
  }),
  svc({
    slug: "commercial-carpet-cleaning",
    title: "Commercial Carpet Cleaning Fort Worth | From $0.25 per Sq Ft",
    description:
      "Commercial carpet and floor cleaning in Fort Worth and Tarrant County for offices, gyms, studios and rentals. From $0.25 per sq ft, free walkthrough.",
    eyebrow: "Commercial cleaning · Fort Worth, TX",
    h1: "Commercial carpet cleaning in Fort Worth",
    intro:
      "Offices, gyms, studios, salons, churches and rental properties cleaned around your hours. Commercial carpet and rubber gym floors start at $0.25 per square foot, and we'll do a free walkthrough to give you an exact price.",
    image: "/img/gym-loft.jpg",
    imageAlt: "Technician cleaning rubber gym flooring with a floor machine",
    price: "From $0.25 per sq ft · Free walkthrough",
    serviceType: "Commercial carpet cleaning",
    commercial: true,
    blocks: [
      {
        h: "Who we clean for",
        p: ["We work with businesses that need clean floors without shutting down for a day."],
        list: [
          "Offices and coworking spaces",
          "Gyms, fitness studios and rubber gym floors",
          "Salons, clinics and retail shops",
          "Churches and event spaces",
          "Apartment turnovers and short-term rentals",
        ],
      },
      {
        h: "Commercial pricing",
        p: [
          "Commercial carpet and rubber flooring start at $0.25 per square foot. Larger spaces and recurring cleanings, like monthly or quarterly service, are priced by walkthrough. Tell us the square footage and how often you'd like service in the form below, and we'll set up a free walkthrough.",
        ],
      },
      {
        h: "Back in business the same day",
        p: [
          "Low-moisture cleaning leaves far less water behind than truck-mounted systems, so floors dry fast and you're back in use the same day. Our equipment plugs into a standard outlet, with no hoses run through your entrance and no truck blocking your parking lot. We can schedule early, late or around your busiest hours.",
        ],
      },
      {
        h: "Gym floor cleaning",
        p: [
          "Rubber gym flooring holds sweat, chalk and odor. We deep-scrub and sanitize it so the floor looks and smells clean, and it's back in use the same day.",
        ],
      },
    ],
    faqs: [
      [
        "How much is commercial carpet cleaning?",
        "Commercial carpet and rubber gym floors start at $0.25 per square foot. We'll confirm the price at a free walkthrough.",
      ],
      [
        "Can you clean after hours?",
        "Yes. Tell us your hours when you request a walkthrough, and we'll schedule around them.",
      ],
      [
        "Do you offer recurring service?",
        "Yes. Choose how often you'd like service in the walkthrough form, and we'll price a recurring plan.",
      ],
      [
        "Do you clean gym floors?",
        "Yes. We deep-scrub and sanitize rubber gym flooring, and it's back in use the same day.",
      ],
    ],
    related: [
      "tile-grout-cleaning",
      "low-moisture-vs-hot-water-extraction",
      "how-often-should-you-clean-carpet",
    ],
  }),
];

export const GUIDES: ContentPage[] = [
  guide({
    slug: "carpet-cleaning-cost-fort-worth",
    title: "How Much Does Carpet Cleaning Cost in Fort Worth? (2026)",
    description:
      "Carpet cleaning prices in Fort Worth for 2026: per room, master suites, sofas, rugs and commercial. Real flat-rate examples and what changes the price.",
    eyebrow: "Guide · Prices",
    h1: "How much does carpet cleaning cost in Fort Worth?",
    intro:
      "At Simple Surface Carpet Cleaning, carpet cleaning in Fort Worth is a flat $50 per room and $100 for a master suite. Sofas are $100, chairs $50 and rugs from $50, plus 8.25% Texas sales tax. Here's how pricing works, with real examples.",
    image: "/img/carpet.jpg",
    imageAlt: "Steam cleaning wand on light carpet",
    preset: { room: 3, master: 1, sofa: 1 },
    blocks: [
      {
        h: "Our flat prices",
        p: ["Every price is per room or per piece, the same in every city we serve."],
        list: [
          "Room (bedroom, family room, kitchen or dining room): $50",
          "Master suite (main bedroom + bathroom + closet): $100",
          "Full-size or sectional sofa: $100",
          "Recliner, armchair or loveseat: $50",
          "Standard rug up to 8×10: $50",
          "Oversize rug larger than 8×10: $100",
          "Commercial carpet and gym floors: from $0.25 per sq ft",
        ],
      },
      {
        h: "Real examples",
        p: [
          "A 2-bedroom apartment with a loveseat comes to $150 before tax. A family home with 3 rooms, a master suite and a sofa comes to $350 before tax. A 3-bedroom move-out with a master suite is $250 before tax. Texas sales tax of 8.25% is added to each total.",
          "You can build your exact price in the calculator on this page. It shows the tax and total before you book.",
        ],
      },
      {
        h: "What changes the price",
        p: [
          "Some companies quote by square foot, charge extra for pre-treatment or add a trip fee. We keep it simple: flat per room or per piece. A few things are quoted on site because they vary a lot from home to home.",
        ],
        list: [
          "Hallways and stairs",
          "Heavy stains",
          "Pet odor treatment",
          "Large commercial spaces (priced by walkthrough)",
        ],
      },
      {
        h: "No deposit, pay after",
        p: [
          "We don't take a deposit. You pay after the job is done, by card, cash or check. If anything doesn't look right after we leave, our 100% Customer Satisfaction Guarantee means we'll come back and touch it up.",
        ],
      },
    ],
    faqs: [
      [
        "How much does it cost to clean a 3-bedroom house?",
        "With our flat pricing, 3 rooms plus a master suite is $250 before tax. Add $100 for a sofa.",
      ],
      [
        "Is carpet cleaning priced by square foot?",
        "Not for homes. We price residential carpet per room. Commercial jobs start at $0.25 per square foot.",
      ],
      [
        "Do you charge a trip fee?",
        "No. Our prices are flat per room or per piece, with tax added.",
      ],
    ],
    related: [
      "move-out-carpet-cleaning",
      "upholstery-cleaning",
      "how-often-should-you-clean-carpet",
    ],
  }),
  guide({
    slug: "how-long-does-carpet-take-to-dry",
    title: "How Long Does Carpet Take to Dry After Cleaning?",
    description:
      "How long carpet takes to dry after professional cleaning, what slows it down, and how to speed it up. Low-moisture cleaning usually dries in a few hours.",
    eyebrow: "Guide · Drying time",
    h1: "How long does carpet take to dry after cleaning?",
    intro:
      "After low-moisture cleaning, carpet is usually dry in a few hours. Heavier wet-cleaning methods can take much longer. How fast yours dries depends on the method, the carpet and the air in the room.",
    image: "/img/hero-low.jpg",
    imageAlt: "Freshly cleaned carpet drying in an empty room",
    preset: { room: 3, master: 1 },
    blocks: [
      {
        h: "Why low-moisture dries faster",
        p: [
          "The biggest factor is how much water goes into the carpet. Truck-mounted hot water extraction pushes a lot of water into the fibers and backing, so drying can take much of the day or longer. Low-moisture cleaning uses far less water and pulls most of it back out, which is why our customers are usually walking on their carpet the same afternoon.",
        ],
      },
      {
        h: "What slows drying down",
        list: [
          "Humid weather and closed-up rooms",
          "Thick, plush or high-pile carpet",
          "Heavily soiled carpet that needs more cleaning",
          "Furniture put back too soon on damp carpet",
        ],
        p: [],
      },
      {
        h: "How to help carpet dry faster",
        list: [
          "Run your AC or heat, which pulls moisture out of the air",
          "Turn on ceiling fans and box fans",
          "Open windows on a dry, breezy day",
          "Wait until it's dry to put furniture legs back, or use foil or wood blocks under them",
          "Keep pets and kids off it until it's dry",
        ],
        p: [],
      },
      {
        h: "Can you walk on it while it's damp?",
        p: [
          "You can walk on it carefully in clean socks, but carpet can be slippery while drying, especially at the edges where it meets tile or wood. Avoid shoes until it's fully dry so you don't track dirt into damp fibers.",
        ],
      },
    ],
    faqs: [
      [
        "How long does carpet take to dry after steam cleaning?",
        "With low-moisture cleaning, usually a few hours. Heavier wet methods can take much longer.",
      ],
      [
        "Can I put furniture back the same day?",
        "Yes, once the carpet is dry. If you need to sooner, put foil or wood blocks under the legs.",
      ],
      [
        "Why does my carpet smell after cleaning?",
        "Carpet that stays wet too long can smell musty. Using less water and drying it fast prevents that.",
      ],
    ],
    related: [
      "low-moisture-vs-hot-water-extraction",
      "carpet-cleaning-cost-fort-worth",
      "upholstery-cleaning",
    ],
  }),
  guide({
    slug: "low-moisture-vs-hot-water-extraction",
    title: "Low-Moisture vs. Hot Water Extraction Carpet Cleaning",
    description:
      "Low-moisture carpet cleaning vs. hot water extraction (truck-mounted steam): how each works, drying time, and which is right for your home or business.",
    eyebrow: "Guide · Cleaning methods",
    h1: "Low-moisture vs. hot water extraction carpet cleaning",
    intro:
      "Both methods clean carpet, but they use very different amounts of water. Hot water extraction floods the carpet and vacuums it back out. Low-moisture cleaning uses far less water, so carpet dries in hours instead of most of a day.",
    image: "/vid/hero-duplex-poster.jpg",
    imageAlt: "Portable low-moisture carpet cleaning machine in a living room",
    preset: { room: 3 },
    blocks: [
      {
        h: "How hot water extraction works",
        p: [
          "Hot water extraction, often called steam cleaning, sprays hot water and cleaning solution into the carpet and immediately vacuums it back out. Many companies run it from a truck-mounted unit, with long hoses running from the driveway into your home. It's powerful, but it puts a lot of water into the carpet, so drying usually takes longer.",
        ],
      },
      {
        h: "How low-moisture cleaning works",
        p: [
          "Low-moisture cleaning uses a small amount of warm water and solution, agitation to loosen dirt, and strong extraction to pull it out. Our machine is portable and plugs into a regular wall outlet, so there's no truck and no hoses through the door.",
        ],
      },
      {
        h: "Side by side",
        list: [
          "Water used: hot water extraction uses a lot; low-moisture uses far less",
          "Drying time: extraction is often most of a day; low-moisture is usually a few hours",
          "Equipment: extraction often needs a truck and long hoses; low-moisture is portable and plugs into an outlet",
          "Good for: extraction can suit heavy restoration; low-moisture suits regular cleaning, apartments, upstairs units, offices and gyms",
        ],
        p: [],
      },
      {
        h: "Which is right for you?",
        p: [
          "For most homes and businesses that want clean carpet without losing the day, low-moisture cleaning is a great fit. It's especially handy in apartments and upstairs units where a truck can't reach, and in offices and gyms that need to reopen quickly.",
        ],
      },
    ],
    faqs: [
      [
        "Is low-moisture carpet cleaning as good as steam cleaning?",
        "For regular cleaning, low-moisture cleaning lifts dirt, stains and traffic lanes, and dries much faster. Very heavy restoration jobs can be a different story, and we'll tell you honestly if yours is one.",
      ],
      [
        "Does low-moisture cleaning use chemicals?",
        "We use eco-friendly cleaning solutions with warm water.",
      ],
      [
        "Why don't you use a truck?",
        "Our portable equipment plugs into a standard outlet, so we can clean apartments, upstairs units and homes without hoses through the door.",
      ],
    ],
    related: [
      "how-long-does-carpet-take-to-dry",
      "commercial-carpet-cleaning",
      "carpet-cleaning-cost-fort-worth",
    ],
  }),
  guide({
    slug: "how-to-get-pet-urine-out-of-carpet",
    title: "How to Get Pet Urine Out of Carpet (Smell & Stain)",
    description:
      "How to get dog or cat urine out of carpet: what to do right away, what not to use, and when to call a professional for pet stains and odor in Fort Worth.",
    eyebrow: "Guide · Pet stains",
    h1: "How to get pet urine out of carpet",
    intro:
      "The faster you act, the better your chances. Blot up as much as you can, rinse with cold water, and use an enzyme cleaner made for pet urine. Skip hot water, steam and ammonia on fresh urine, which can make the smell harder to get out.",
    image: "/img/home.jpg",
    imageAlt: "Dog lying on carpet in a bright living room",
    preset: { room: 2 },
    blocks: [
      {
        h: "Right away: blot, don't scrub",
        list: [
          "Blot with paper towels or a white cloth, pressing firmly to soak up as much as possible",
          "Don't rub or scrub, which spreads it and pushes it deeper",
          "Pour a little cold water on the spot and blot again",
          "Repeat until the towel comes up mostly dry",
        ],
        p: [],
      },
      {
        h: "Treat the odor",
        p: [
          "Pet urine odor comes from residue that soaks into the carpet and backing. Enzyme cleaners made for pet urine are designed to break that residue down. Follow the label, let it sit as directed, and let the spot air dry.",
        ],
      },
      {
        h: "What not to use",
        list: [
          "Ammonia cleaners, which can smell like urine to pets and draw them back to the spot",
          "Hot water or a steam cleaner on fresh urine, which can set the stain and odor",
          "Lots of water, which spreads the urine further into the pad",
          "Strong perfumes that cover the smell instead of removing it",
        ],
        p: [],
      },
      {
        h: "When to call a pro",
        p: [
          "If the spot keeps coming back, the whole room smells, or you've found several old spots, it's time for professional cleaning. We clean the carpet and treat pet odor where it's needed. Odor treatment is quoted on site, so you know the price before we start. Rooms are a flat $50.",
        ],
      },
    ],
    faqs: [
      [
        "Does vinegar get pet urine smell out of carpet?",
        "A diluted vinegar rinse can help with fresh spots, but enzyme cleaners made for pet urine usually work better on odor.",
      ],
      [
        "Why does the smell come back on humid days?",
        "Urine residue left in the carpet or pad can release odor again when it gets damp. That's a sign it needs deeper treatment.",
      ],
      [
        "How much does pet odor removal cost?",
        "Carpet cleaning is $50 per room. Heavy pet odor treatment is quoted on site before we start.",
      ],
    ],
    related: ["pet-stain-odor-removal", "upholstery-cleaning", "how-often-should-you-clean-carpet"],
  }),
  guide({
    slug: "move-out-carpet-cleaning-checklist",
    title: "Move-Out Carpet Cleaning Checklist for Renters & Landlords",
    description:
      "A move-out carpet cleaning checklist for Fort Worth renters and landlords: what to do before the cleaners arrive, what it costs, and how to keep your schedule.",
    eyebrow: "Guide · Moving out",
    h1: "Move-out carpet cleaning checklist",
    intro:
      "Moving out is busy enough. Use this checklist to get the carpet ready for the final walkthrough without holding up your move. With low-moisture cleaning, the carpet is usually dry in a few hours.",
    image: "/img/hero-low.jpg",
    imageAlt: "Empty room with freshly cleaned carpet",
    preset: { room: 3, master: 1 },
    blocks: [
      {
        h: "1–2 weeks before",
        list: [
          "Check your lease for carpet-cleaning requirements",
          "Count your rooms and get a price (flat $50 a room, $100 for a master suite)",
          "Book the cleaning for after the movers and before the walkthrough",
        ],
        p: [],
      },
      {
        h: "The day before",
        list: [
          "Move out furniture and boxes, or at least clear the floors",
          "Vacuum up large debris",
          "Make sure the power is still on (we plug into a regular outlet)",
          "Note any stains you want us to focus on",
        ],
        p: [],
      },
      {
        h: "Cleaning day",
        list: [
          "Let us in, or leave lockbox or access details in your booking notes",
          "We clean, extract and groom the carpet",
          "Open windows or run the AC to speed drying",
          "Ask for a receipt for your landlord",
        ],
        p: [],
      },
      {
        h: "For landlords and property managers",
        p: [
          "Schedule carpet cleaning between the move-out and the next move-in. Low-moisture cleaning dries fast, so it fits in a tight turnover. Book online with access notes, and we'll email the receipt.",
        ],
      },
    ],
    faqs: [
      [
        "When should I schedule move-out carpet cleaning?",
        "After the furniture is out and before your final walkthrough. Carpet is usually dry in a few hours.",
      ],
      [
        "How much does move-out carpet cleaning cost?",
        "$50 per room and $100 for a master suite. A 3-bedroom with a master suite is $250 plus tax.",
      ],
      ["Do you provide a receipt?", "Yes, we email a receipt when you pay."],
    ],
    related: ["move-out-carpet-cleaning", "carpet-cleaning-cost-fort-worth", "tile-grout-cleaning"],
  }),
  guide({
    slug: "how-often-should-you-clean-carpet",
    title: "How Often Should You Clean Your Carpet? (Pets, Kids & More)",
    description:
      "How often to get carpet professionally cleaned: every 12–18 months for most homes, more often with pets, kids or allergies. Plus easy ways to make it last.",
    eyebrow: "Guide · Carpet care",
    h1: "How often should you clean your carpet?",
    intro:
      "Many carpet manufacturers recommend professional cleaning every 12 to 18 months, and some warranties require it. Homes with pets, kids, allergies or heavy foot traffic often do better with cleaning every 6 to 12 months.",
    image: "/img/carpet2.jpg",
    imageAlt: "Close-up of a carpet being cleaned",
    preset: { room: 3, master: 1 },
    blocks: [
      {
        h: "A simple schedule",
        list: [
          "Most homes: every 12–18 months",
          "Homes with pets or young kids: every 6–12 months",
          "Allergies or asthma in the home: every 6–12 months",
          "High-traffic areas and entryways: spot clean as needed",
          "Offices and gyms: quarterly or monthly, depending on traffic",
        ],
        p: [],
      },
      {
        h: "Signs it's time",
        list: [
          "Gray traffic lanes in hallways and in front of the couch",
          "Spots that come back after you clean them",
          "A musty or pet smell",
          "Carpet that feels rough or matted",
        ],
        p: [],
      },
      {
        h: "Make your carpet last longer",
        list: [
          "Vacuum high-traffic areas twice a week",
          "Use doormats and take shoes off at the door",
          "Blot spills right away with cold water",
          "Move furniture slightly now and then to avoid dents and wear lines",
        ],
        p: [],
      },
      {
        h: "We'll remind you",
        p: [
          "After your cleaning, we can send you a friendly reminder when it's time again. Prices stay flat: $50 a room, $100 for a master suite, no deposit.",
        ],
      },
    ],
    faqs: [
      [
        "How often should carpet be professionally cleaned?",
        "Many manufacturers recommend every 12 to 18 months. With pets, kids or allergies, every 6 to 12 months is common.",
      ],
      [
        "Can cleaning too often damage carpet?",
        "Not when it's done right. Low-moisture cleaning with strong extraction doesn't leave soapy residue or soak the backing.",
      ],
      [
        "Does my carpet warranty require cleaning?",
        "Some carpet warranties require professional cleaning on a schedule. Check your warranty, and ask us for a receipt each time.",
      ],
    ],
    related: [
      "carpet-cleaning-cost-fort-worth",
      "how-to-get-pet-urine-out-of-carpet",
      "how-long-does-carpet-take-to-dry",
    ],
  }),
];

export const ALL_PAGES = [...SERVICE_PAGES, ...GUIDES];
export const findPage = (kind: ContentPage["kind"], slug: string) =>
  ALL_PAGES.find((p) => p.kind === kind && p.slug === slug);
export const pagePath = (p: ContentPage) =>
  p.kind === "service" ? `/services/${p.slug}` : `/guides/${p.slug}`;
export const pageBySlug = (slug: string) => ALL_PAGES.find((p) => p.slug === slug);
