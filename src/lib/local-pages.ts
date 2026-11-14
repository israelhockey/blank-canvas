import type { ContentPage, Photo } from "./seo-pages";

/*
 * City-specific service pages: /carpet-cleaning/<city>/<slug>.
 * Written for the searches Google already shows us for (Search Console, Nov 2026):
 * "carpet cleaning keller tx", "carpet cleaner keller", "keller tx carpet cleaning",
 * "move out carpet cleaning", "sofa / couch cleaning near me", "rug cleaners near me",
 * "pet treatment". Prices must match site-data.ts. No made-up reviews, job counts or drive times.
 */

/** Real photos from a recent upholstery job (Instagram, Nov 2026). */
export const LOVESEAT_PHOTOS: Photo[] = [
  {
    src: "/img/jobs/upholstered-loveseat-before-cleaning-water-stains.jpg",
    alt: "Back of a cream upholstered loveseat with brown water rings and body-oil stains before cleaning",
    caption: "Before: water rings and years of body oil on the back of a loveseat.",
  },
  {
    src: "/img/jobs/upholstered-loveseat-after-cleaning-back.jpg",
    alt: "Same cream loveseat after upholstery cleaning, stains lifted and fabric brightened",
    caption: "After: same loveseat, cleaned in the customer's living room.",
  },
  {
    src: "/img/jobs/upholstery-stains-close-up-before-cleaning.jpg",
    alt: "Close-up of set-in stains on ribbed upholstery fabric before professional cleaning",
    caption: "Close-up before cleaning. It hadn't been professionally cleaned in 10 years.",
  },
  {
    src: "/img/jobs/tufted-loveseat-after-upholstery-cleaning.jpg",
    alt: "Tufted cream loveseat looking fresh after low-moisture upholstery cleaning",
    caption: "After: the front of the tufted loveseat, dry the same day.",
  },
];

const local = (p: Omit<ContentPage, "kind" | "city">): ContentPage => ({
  kind: "local",
  city: "keller",
  ...p,
});

export const LOCAL_PAGES: ContentPage[] = [
  local({
    slug: "upholstery-cleaning",
    title: "Couch & Upholstery Cleaning Keller TX | Sofas $100 Flat",
    description:
      "Couch, sofa and upholstery cleaning in Keller, TX, done in your living room. Any sofa or sectional $100, chairs and loveseats $50. Dry the same day.",
    eyebrow: "Upholstery cleaning · Keller, TX",
    h1: "Couch and upholstery cleaning in Keller, TX",
    intro:
      "We clean sofas, sectionals, recliners, loveseats and dining chairs right where they sit in your Keller home. Any sofa or sectional is $100, chairs and loveseats are $50, and the fabric is dry enough to sit on later the same day.",
    image: "/img/jobs/tufted-loveseat-after-upholstery-cleaning.jpg",
    imageAlt: "Tufted cream loveseat after upholstery cleaning by Simple Surface",
    price: "Any sofa or sectional $100 · Chairs & loveseats $50",
    serviceType: "Upholstery cleaning",
    lowPrice: 50,
    preset: { sofa: 1, chair: 1 },
    gallery: LOVESEAT_PHOTOS,
    blocks: [
      {
        h: "What couch cleaning costs in Keller",
        p: [
          "We price furniture by the piece, not by the cushion. A full sofa or a sectional of any size is $100. A recliner, armchair or loveseat is $50. Texas sales tax of 8.25% is added, and you pay after the job, once you've seen the result.",
          "Most Keller families add a couch to a carpet cleaning visit. A living room, a family room and a sectional comes to $200 before tax. The price builder further down this page adds it up for you.",
        ],
      },
      {
        h: "Why Keller couches get dirty faster than you'd think",
        p: [
          "In a lot of Keller homes the sectional is the busiest piece of furniture in the house. Kids eat on it, dogs sleep on it, and everyone sits on the same two spots every night. Body oil from hands and heads builds up on arms and headrests and turns light fabric gray. Spills soak into the cushions and leave rings when they dry.",
          "Vacuuming takes care of crumbs and pet hair. It can't lift oil or old spills. That takes a cleaning solution worked into the fabric and strong suction to pull it back out.",
        ],
      },
      {
        h: "How we clean upholstery in your home",
        p: ["Nothing leaves your house, and nothing gets soaked."],
        list: [
          "We check the fabric tag and test a hidden spot first",
          "Arms, headrests and spots get pre-treated",
          "The fabric is cleaned with low-moisture steam and a soft brush",
          "Strong suction pulls the dirty water back out of the cushion",
          "We leave the nap brushed in one direction so it dries even",
        ],
      },
      {
        h: "A recent job",
        p: [
          "The photos on this page are from a recent upholstery job: a cream loveseat that hadn't been professionally cleaned in about 10 years. The back had brown water rings and a dull gray layer from years of use. One visit lifted the rings and brought the fabric back to its real color.",
        ],
      },
      {
        h: "Fabrics we're careful with",
        p: [
          "Most sofas are synthetic blends that clean up well. Tell us when you book if your piece is velvet, linen, silk or marked \"S\" (solvent only) on the tag. Some of those fabrics can shrink or water-mark, and we'll tell you honestly before we start if we don't think cleaning is a good idea.",
        ],
      },
    ],
    faqs: [
      [
        "How much does it cost to clean a couch in Keller?",
        "Any sofa or sectional is $100, and chairs, recliners and loveseats are $50, plus 8.25% sales tax. There's no deposit, and you pay after the job.",
      ],
      [
        "How long until I can sit on my couch again?",
        "Usually a few hours. We use low moisture, so the cushions don't stay wet overnight. Running a fan or the AC speeds it up.",
      ],
      [
        "Do you clean sofas and carpet in the same visit?",
        "Yes. Most of our Keller customers book carpet, a sofa and sometimes a rug together, so the whole room is done at once.",
      ],
      [
        "Can you get pet smell out of a couch?",
        "Normal pet odor usually comes out with cleaning. Heavy urine odor may need extra treatment, which we quote on site before doing anything.",
      ],
    ],
    related: ["keller/rug-cleaning", "keller/pet-stain-odor-removal", "upholstery-cleaning"],
  }),

  local({
    slug: "rug-cleaning",
    title: "Area Rug Cleaning Keller TX | Cleaned in Place, from $50",
    description:
      "Area rug cleaning in Keller, TX done on your floor. No drop-off, no pickup, no waiting a week. Rugs up to 8×10 $50, oversize rugs $100.",
    eyebrow: "Rug cleaning · Keller, TX",
    h1: "Area rug cleaning in Keller, without the drop-off",
    intro:
      "Most rug cleaners want you to roll the rug up and drop it off, or wait for a pickup and get it back a week later. We clean area rugs right on your floor in Keller. Rugs up to 8×10 are $50, larger rugs are $100, and you can walk on it again in a few hours.",
    image: "/img/area-rug-cleaned-in-place.jpg",
    imageAlt: "Cleaning wand leaving a clean stripe across an area rug on a hardwood floor",
    price: "Standard rugs $50 · Oversize rugs $100",
    serviceType: "Rug cleaning",
    lowPrice: 50,
    preset: { rug: 1, room: 1 },
    blocks: [
      {
        h: "Rug cleaning prices",
        p: [
          "A standard rug, up to 8×10, is $50. A rug bigger than 8×10 is $100. Normal spot treatment is included. Sales tax of 8.25% is added at the end, and you pay after we're done.",
          "Have a rug under the dining table and another in the living room? Add both in the price builder below, plus any carpeted rooms, and you'll see the total before you book.",
        ],
      },
      {
        h: "Drop-off vs. in-place rug cleaning",
        p: [
          "Drop-off and pickup services wash rugs at a plant. That's the right call for some antique and hand-knotted rugs. For the everyday rugs in most Keller homes, cleaning in place is faster, cheaper and a lot less hassle.",
        ],
        list: [
          "No rolling, carrying or loading a heavy rug into the car",
          "No pickup fee and no week without your rug",
          "Furniture only has to move off the rug, not out of the room",
          "We can clean the carpet and couch in the same visit",
        ],
      },
      {
        h: "How we clean a rug on your floor",
        list: [
          "A thorough vacuum to pull grit out of the base of the pile",
          "Pre-treatment on spots and the traffic path",
          "Low-moisture cleaning with eco-friendly solutions",
          "Strong extraction so the rug isn't left wet",
          "Grooming the pile so it dries evenly, usually within a few hours",
        ],
        p: [
          "If the rug sits on hardwood, let us know. We control the moisture and can put a barrier underneath while it dries.",
        ],
      },
      {
        h: "Wool, silk and antique rugs",
        p: [
          "Tell us what your rug is made of when you book. Wool cleans well with the right solution. Silk, viscose and some hand-dyed rugs can bleed or brown, and we'll be honest if your rug is better off with a specialist plant than with us.",
        ],
      },
      {
        h: "Rug cleaning across Keller",
        p: [
          "We clean rugs all over Keller, from Hidden Lakes and Marshall Ridge to the neighborhoods off Keller Parkway and around Keller Town Center, at the same flat price.",
        ],
      },
    ],
    faqs: [
      [
        "Do I need to drop my rug off?",
        "No. We clean it on your floor. There's no drop-off, no pickup fee and no waiting days to get it back.",
      ],
      [
        "How much is area rug cleaning in Keller?",
        "$50 for rugs up to 8×10 and $100 for anything larger, plus sales tax. No deposit.",
      ],
      [
        "Will cleaning the rug hurt my hardwood floor?",
        "We use little water and control it carefully. Tell us the rug is on hardwood and we'll protect the floor while it dries.",
      ],
      [
        "How long does a rug take to dry?",
        "Usually a few hours. Thick wool rugs can take longer. A fan helps.",
      ],
    ],
    related: ["keller/upholstery-cleaning", "keller/carpet-cleaning-cost", "rug-cleaning"],
  }),

  local({
    slug: "pet-stain-odor-removal",
    title: "Pet Stain & Odor Removal Keller TX | Carpet, Rugs, Couches",
    description:
      "Pet stain and odor removal in Keller, TX for carpet, rugs and couches. Eco-friendly pet treatment, rooms $50 flat, heavy odor quoted on site.",
    eyebrow: "Pet stains & odor · Keller, TX",
    h1: "Pet stain and odor removal in Keller, TX",
    intro:
      "Dog accidents, cat spots and that smell that comes back on humid days. We treat pet stains and odor in carpet, rugs and couches in Keller homes. Carpet is $50 a room, and any heavy odor treatment is priced on site before we start.",
    image: "/img/clean-carpet-living-room-with-dog.jpg",
    imageAlt: "Dog lying on clean carpet in a bright living room",
    price: "Rooms $50 · Heavy odor treatment quoted on site",
    serviceType: "Pet stain and odor removal",
    lowPrice: 50,
    preset: { room: 2, sofa: 1 },
    blocks: [
      {
        h: "Why pet odor comes back after you clean it",
        p: [
          "When a pet has an accident, the urine doesn't stay on top. It runs down into the carpet backing and sometimes the pad. Store-bought sprays clean the surface, so the spot looks fine, but the source is still underneath. On a humid day, or after the carpet gets damp, the smell comes right back.",
          "Getting rid of it means treating where the urine went, not just where you can see it.",
        ],
      },
      {
        h: "Our pet treatment",
        list: [
          "We look for spots, including old ones that don't show",
          "Each spot is pre-treated with an eco-friendly solution",
          "The carpet is cleaned with low-moisture steam and strong suction",
          "Heavy odor areas get an extra odor treatment, priced before we do it",
          "Carpet dries in a few hours, so pets are back on it the same day",
        ],
        p: [],
      },
      {
        h: "What it costs",
        p: [
          "Carpet is $50 a room and $100 for a master suite. Normal spot treatment is included. Heavy urine odor needs more product and time, so we look at it first and give you a price before doing anything extra. Couches are $100, chairs $50 and rugs from $50.",
        ],
      },
      {
        h: "Keller is a dog town",
        p: [
          "Between big backyards, Bear Creek Park and the trails around town, a lot of Keller dogs come in with muddy paws. Muddy prints and the odd accident are the most common thing we clean in Keller homes. Cleaning every 6 to 12 months keeps that from building up into a smell that's hard to get out.",
        ],
      },
      {
        h: "If your pet just had an accident",
        p: [
          "Blot it with a white towel and cold water. Press, don't scrub. Skip hot water and anything with ammonia, because ammonia smells like urine to pets and invites them back to the same spot. Our guide on getting pet urine out of carpet goes step by step.",
        ],
      },
    ],
    faqs: [
      [
        "Can you get dog urine smell out of carpet in Keller?",
        "Fresh spots usually come out with normal cleaning. Old urine and strong odor may need extra odor treatment, which we quote on site before starting.",
      ],
      [
        "Is your pet treatment safe for my dog?",
        "We use eco-friendly solutions. Keep pets off the carpet until it's dry, usually a few hours.",
      ],
      [
        "Do you charge extra for pet stains?",
        "Normal spot treatment is included in the room price. Only heavy odor treatment costs extra, and you get the price first.",
      ],
      [
        "Can you treat pet stains on my couch too?",
        "Yes. Sofas are $100 and chairs are $50, including normal spot treatment.",
      ],
    ],
    related: [
      "how-to-get-pet-urine-out-of-carpet",
      "keller/upholstery-cleaning",
      "pet-stain-odor-removal",
    ],
  }),

  local({
    slug: "move-out-carpet-cleaning",
    title: "Move-Out Carpet Cleaning Keller TX | $50 a Room, Dry Fast",
    description:
      "Move-out and move-in carpet cleaning in Keller, TX for renters, landlords and sellers. $50 a room, $100 master suite, dry in hours. No water hookup needed.",
    eyebrow: "Move-out carpet cleaning · Keller, TX",
    h1: "Move-out carpet cleaning in Keller, TX",
    intro:
      "Moving out of a Keller rental, getting a house ready to list, or turning over a unit between tenants? We clean the carpet so it's ready for the walkthrough or the photos. Rooms are $50, a master suite is $100, and it's dry in a few hours.",
    image: "/img/low-moisture-carpet-cleaning-living-room.jpg",
    imageAlt: "Carpet being cleaned with low-moisture equipment in an empty room",
    price: "Rooms $50 · Master suite $100",
    serviceType: "Move-out carpet cleaning",
    lowPrice: 50,
    preset: { room: 3, master: 1 },
    blocks: [
      {
        h: "Who books move-out cleaning in Keller",
        p: [
          "Renters book it to help get their deposit back. Landlords and property managers book it between tenants. Sellers book it before listing photos and showings, because clean carpet makes an empty room look newer in pictures. Buyers book it the week before they move in, while the house is empty.",
        ],
      },
      {
        h: "Prices for a typical Keller move-out",
        p: [
          "Every bedroom, living room or dining room is $50. A master suite, meaning the main bedroom with its bathroom and closet, is $100. Here's what common Keller homes come to before tax:",
        ],
        list: [
          "3 bedrooms + master suite: $250",
          "4 bedrooms + master suite + game room: $350",
          "4 bedrooms + master suite + living room + game room: $400",
        ],
      },
      {
        h: "Stairs, closets and heavy stains",
        p: [
          "Hallways and stairs are quoted on site because they vary so much from house to house. Closets are part of the room they open into. Heavy stains and pet odor treatment are priced after we see them, and we always give you the number before doing the work.",
        ],
      },
      {
        h: "Easy for an empty house",
        p: [
          "We only need the power on and a way in. Our machine plugs into a regular outlet, so there's no water hookup, no hose through the front door and no truck blocking the driveway or bothering the HOA.",
        ],
        list: [
          "Book online and pick a 2-hour arrival window",
          "Leave access notes, like a lockbox code, when you book",
          "We clean, extract and groom the carpet",
          "It's dry in a few hours, ready for the walkthrough",
        ],
      },
      {
        h: "A receipt for your landlord",
        p: [
          "Many leases ask for proof of professional carpet cleaning. When you pay, we email a receipt with the date and the rooms we cleaned that you can forward to your landlord or property manager.",
        ],
      },
    ],
    faqs: [
      [
        "How much is move-out carpet cleaning in Keller?",
        "$50 per room and $100 for a master suite, plus tax. A 3-bedroom home with a master suite is $250 before tax.",
      ],
      [
        "Can you clean the same day as my walkthrough?",
        "Often, yes. The carpet dries in a few hours, so a morning clean is usually dry by the afternoon. Book early to get the window you need.",
      ],
      [
        "Do the utilities need to be on?",
        "We need electricity. We don't need water or a hose hookup.",
      ],
      [
        "Do I need to be there?",
        "No. Add a lockbox code or access instructions when you book, and we'll text you when we're done.",
      ],
    ],
    related: [
      "move-out-carpet-cleaning-checklist",
      "keller/carpet-cleaning-cost",
      "move-out-carpet-cleaning",
    ],
  }),

  local({
    slug: "carpet-cleaning-cost",
    title: "Carpet Cleaning Cost in Keller TX (2026 Prices)",
    description:
      "What carpet cleaning costs in Keller, TX: $50 per room, $100 master suite, sofas $100, rugs from $50. Real Keller home examples and what changes the price.",
    eyebrow: "Prices · Keller, TX",
    h1: "How much does carpet cleaning cost in Keller?",
    intro:
      "With Simple Surface, carpet cleaning in Keller is $50 per room and $100 for a master suite. Sofas are $100, chairs $50 and rugs from $50, plus 8.25% Texas sales tax. No trip charge, no deposit, and you pay after the job.",
    image: "/img/carpet-cleaning-wand-light-carpet.jpg",
    imageAlt: "Steam cleaning wand on light-colored carpet",
    preset: { room: 4, master: 1 },
    blocks: [
      {
        h: "Our Keller price list",
        p: ["Same prices as Fort Worth. Coming to Keller doesn't cost extra."],
        list: [
          "Bedroom, living room, game room or dining room: $50",
          "Master suite (bedroom + bathroom + closet): $100",
          "Sofa or sectional, any size: $100",
          "Recliner, armchair or loveseat: $50",
          "Area rug up to 8×10: $50",
          "Area rug larger than 8×10: $100",
        ],
      },
      {
        h: "What typical Keller homes cost",
        p: [
          "Keller homes tend to be on the bigger side, with more bedrooms and a game room or media room upstairs. Here's what common setups come to before tax:",
        ],
        list: [
          "3 bedrooms + master suite: $250",
          "4 bedrooms + master suite + game room: $350",
          "4 bedrooms + master + game room + sectional: $450",
          "Living room + sectional + one rug: $200",
        ],
      },
      {
        h: "Why some quotes in Keller look cheaper",
        p: [
          'You\'ll see ads for "3 rooms for $99." Read the fine print. Those prices often have a small room-size limit, charge extra for pre-treatment, deodorizer or moving furniture, and add a trip fee. The final bill can end up much higher than the ad.',
          "Our price includes pre-treating normal spots and moving light furniture. What you see in the price builder is what you pay, plus tax.",
        ],
      },
      {
        h: "What can change the price",
        list: [
          "Hallways and stairs (quoted on site)",
          "Heavy stains that need extra work",
          "Pet urine odor treatment",
          "Commercial spaces, priced at $0.25 per sq ft after a free walkthrough",
        ],
        p: ["We always tell you the price of anything extra before we do it."],
      },
      {
        h: "How to pay",
        p: [
          "No deposit. You pay after the job by card, cash or check, once you've seen the result. If anything doesn't look right after we leave, we'll come back and touch it up.",
        ],
      },
    ],
    faqs: [
      [
        "How much does it cost to clean carpet in a 4-bedroom house in Keller?",
        "A 4-bedroom home with a master suite and a game room is $350 before tax. Add $100 for a sofa or sectional.",
      ],
      [
        "Do you charge a trip fee to come to Keller?",
        "No. Keller has the same flat prices as Fort Worth, with no trip charge.",
      ],
      [
        "Is it priced by square foot?",
        "Not for homes. We price per room and per piece. Commercial jobs are $0.25 per square foot.",
      ],
      [
        "Is pre-treatment included?",
        "Yes, for normal spots and traffic areas. Only heavy stains and pet odor treatment are extra, and you get the price first.",
      ],
    ],
    related: [
      "carpet-cleaning-cost-fort-worth",
      "keller/carpet-cleaner",
      "keller/upholstery-cleaning",
    ],
  }),

  local({
    slug: "carpet-cleaner",
    title: "Choosing a Carpet Cleaner in Keller TX: 7 Things to Ask",
    description:
      "Hiring a carpet cleaner in Keller, TX? Seven questions to ask about price, drying time, pet stains and guarantees before you book anyone, us included.",
    eyebrow: "Guide · Keller, TX",
    h1: "How to choose a carpet cleaner in Keller, TX",
    intro:
      "There are plenty of carpet cleaners working in Keller, from national franchises to one-person crews. Here are the questions worth asking before you book anyone, and how we answer them.",
    image: "/img/portable-carpet-cleaner-plugged-into-wall-outlet.jpg",
    imageAlt: "Portable carpet cleaning machine plugged into a standard wall outlet",
    preset: { room: 3, master: 1 },
    blocks: [
      {
        h: "1. Is the price per room or per square foot?",
        p: [
          "Per-room pricing is easy to check before anyone shows up. Square-foot pricing is fair too, but ask for the total in writing. Watch for ads with a low room price and a small size limit, where big Keller living rooms count as two rooms.",
          "Our answer: $50 per room, $100 for a master suite, no size games.",
        ],
      },
      {
        h: "2. What's included, and what costs extra?",
        p: [
          "Ask directly whether pre-treatment, deodorizer, moving furniture and a trip charge are in the price. Those add-ons are where a cheap quote turns into an expensive bill.",
          "Our answer: normal pre-treatment and moving light furniture are included. No trip charge in Keller.",
        ],
      },
      {
        h: "3. How long will the carpet stay wet?",
        p: [
          "Truck-mounted hot-water extraction can leave carpet damp for 6 to 24 hours. Low-moisture methods are usually dry in a few hours. If you have kids, pets or guests coming, drying time matters.",
          "Our answer: low-moisture cleaning, usually dry in a few hours.",
        ],
      },
      {
        h: "4. Do they need a hose through the front door?",
        p: [
          "Truck mounts run a hose from the driveway through your door, which means the door stays cracked open and the truck sits outside while they work. Some HOAs aren't fans either.",
          "Our answer: our machine plugs into a regular wall outlet inside. No hose, no truck in the driveway.",
        ],
      },
      {
        h: "5. How do they handle pet stains?",
        p: [
          "Ask whether they treat the source of the odor or just the surface, and whether odor treatment costs extra. A good cleaner will look before quoting heavy pet odor rather than promising it'll all come out.",
          "Our answer: normal spots are included, and heavy odor treatment is priced on site before we start.",
        ],
      },
      {
        h: "6. Do you pay up front?",
        p: [
          "Some companies take a deposit when you book. There's nothing wrong with that, but it's worth knowing.",
          "Our answer: no deposit. You pay after the job.",
        ],
      },
      {
        h: "7. What happens if a spot comes back?",
        p: [
          "Wicking happens: a stain deep in the pad can creep back up as the carpet dries. Ask what the company does if that happens.",
          "Our answer: we will come out and touch up or spot clean anything that doesn't look right to you after we are gone.",
        ],
      },
    ],
    faqs: [
      [
        "What's the best type of carpet cleaning for Keller homes?",
        "It depends on the carpet and your schedule. Hot-water extraction is a deep clean but stays wet longer. Low-moisture cleaning is deep enough for most homes and dries in hours. We explain the difference in our guide comparing the two.",
      ],
      [
        "Are carpet cleaners in Keller licensed?",
        "Texas doesn't require a special state license for residential carpet cleaning. Ask for proof of insurance and look at recent work and reviews instead.",
      ],
      [
        "How often should Keller homes have carpet cleaned?",
        "Every 12 months for most homes, and every 6 months with pets or young kids.",
      ],
    ],
    related: [
      "low-moisture-vs-hot-water-extraction",
      "keller/carpet-cleaning-cost",
      "how-often-should-you-clean-carpet",
    ],
  }),
];
