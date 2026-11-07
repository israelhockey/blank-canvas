/*
 * Copy written for each city page so the 12 pages aren't near-copies of each other
 * (Google treats near-identical city pages as thin). Keep claims general and true:
 * no invented job counts, reviews or drive times.
 */
export type CityContent = {
  /** Heading for the local section. */
  h: string;
  /** 2–3 short paragraphs about homes and cleaning needs in this city. */
  p: string[];
  /** Areas and neighborhoods we clean, shown as a list. */
  areas: string[];
  /** One question people in this city ask, used on the page and in FAQ data. */
  faq: [string, string];
};

export const CITY_CONTENT: Record<string, CityContent> = {
  "fort-worth": {
    h: "Carpet cleaning across Fort Worth, from the Near Southside to Alliance",
    p: [
      "Fort Worth is our home base, so it gets the widest choice of days and times. The city's homes range from 1920s bungalows in Fairmount and Arlington Heights to brand-new builds up by Alliance, and each needs something a little different. Older homes often have wool rugs and original carpet on the bedroom floors; newer homes on the north side tend to have big open living rooms and light-colored carpet that shows every traffic lane.",
      "North Texas red clay and dust get tracked in every season, and spring oak pollen and winter cedar season fill carpet fibers with allergens. A low-moisture clean pulls that out without soaking the pad, which matters in older pier-and-beam houses where moisture can linger under the floor.",
      "We also clean a lot of apartments and rentals near TCU and downtown, where move-out deadlines are tight. Carpet is dry in a few hours, so a move-out clean can happen the same morning as the walkthrough.",
    ],
    areas: [
      "Near Southside & Fairmount",
      "Arlington Heights & West 7th",
      "TCU, Berkeley & Bluebonnet Hills",
      "Tanglewood & Ridglea",
      "Wedgwood & southwest Fort Worth",
      "Alliance, Heritage & Presidio",
      "Sendera Ranch & far north Fort Worth",
      "Downtown lofts and apartments",
    ],
    faq: [
      "Can you clean carpet in an older Fort Worth pier-and-beam home?",
      "Yes. Our low-moisture method uses far less water than hot-water extraction, so the pad and subfloor don't get soaked. That's a good fit for older Fort Worth homes, where extra moisture under the floor takes a long time to dry.",
    ],
  },
  arlington: {
    h: "Carpet cleaning for Arlington homes, apartments and rentals",
    p: [
      "Arlington has a big mix of housing: apartments and student rentals around UT Arlington, established neighborhoods in north and central Arlington, and larger newer homes in south Arlington and Viridian. A lot of our Arlington work is move-in and move-out cleaning, where landlords and tenants need carpet dry before the next walkthrough.",
      "Because our machine runs off a regular outlet, upstairs apartments are no problem. There's no hose running up the stairs or across the parking lot, and no truck taking up a space at your complex.",
      "Arlington families who host for game days and holidays like that the carpet is dry in a few hours. You can book in the morning and have people over that evening.",
    ],
    areas: [
      "Downtown Arlington & UTA",
      "Entertainment District",
      "Viridian",
      "North Arlington",
      "South Arlington",
      "Lake Arlington area",
      "Southwest Arlington",
    ],
    faq: [
      "Do you clean upstairs apartments in Arlington?",
      "Yes. Our equipment is portable and plugs into a standard outlet inside your unit, so second- and third-floor apartments cost the same as anywhere else. Nothing runs up the stairs from a truck.",
    ],
  },
  keller: {
    h: "Whole-home carpet cleaning in Keller",
    p: [
      "Keller homes tend to be larger, with more bedrooms, game rooms and long hallways, and the carpet sees a lot of traffic from kids and pets. Flat per-room pricing makes a whole-house clean easy to budget: count the rooms, add a sofa if you want it, and you have your price before we arrive.",
      "Pet accidents and muddy paws are the most common requests we get from Keller families. We treat spots before the full clean and use solutions that are safe once dry for kids and pets.",
      "Many Keller homes have formal rugs and upholstered dining chairs too. We can do the carpet, the sofa and the rugs in one visit so you only clear your schedule once.",
    ],
    areas: [
      "Keller Town Center",
      "Hidden Lakes",
      "Marshall Ridge",
      "Neighborhoods off Keller Parkway",
      "Bear Creek Park area",
      "North and east Keller",
    ],
    faq: [
      "How much does it cost to clean carpet in a typical Keller house?",
      "It depends on the number of rooms. Each room is a flat $50 and a master suite is $100, so a four-bedroom home with a master suite and a game room is $300 before tax. The price builder on this page shows your exact total.",
    ],
  },
  southlake: {
    h: "Carpet, rug and upholstery cleaning in Southlake",
    p: [
      "Southlake homes often have more than carpet to care for: area rugs on hardwood, upholstered dining chairs, sectionals and media-room carpet. We clean all of it in one visit, with flat prices for each piece so there are no surprises.",
      "Our low-moisture method is gentle on fine fabrics and rugs and leaves them dry in hours, not days. That matters when the rug is in the main living area or you have guests coming.",
      "There's no truck or hose involved, which keeps things simple with HOA rules and long driveways. We park like any visitor and carry the equipment in.",
    ],
    areas: [
      "Southlake Town Square area",
      "Timarron",
      "Carillon",
      "Neighborhoods near Bob Jones Park",
      "Homes across Carroll ISD",
    ],
    faq: [
      "Do you clean area rugs and upholstery in Southlake homes?",
      "Yes. Standard rugs are $50, oversize rugs are $100, any sofa or sectional is $100 and chairs or loveseats are $50. We clean them in your home, so nothing has to be hauled out.",
    ],
  },
  "north-richland-hills": {
    h: "Carpet cleaning for North Richland Hills families",
    p: [
      "North Richland Hills is full of established family neighborhoods, many with carpeted bedrooms and living rooms that have seen years of foot traffic. Traffic lanes and old spots are the most common thing we're asked to fix here.",
      "With parks, NRH2O and youth sports all around, a lot of dirt comes in on shoes. Regular cleaning every 6 to 12 months keeps that grit from wearing down the carpet fibers.",
      "We clean homes from the HomeTown area to the neighborhoods off Davis Boulevard and Rufe Snow, at the same flat prices as Fort Worth.",
    ],
    areas: [
      "HomeTown NRH",
      "Neighborhoods off Davis Boulevard",
      "Rufe Snow corridor",
      "Smithfield area",
      "Iron Horse area",
    ],
    faq: [
      "Can you remove traffic lanes from older carpet in North Richland Hills?",
      "In most cases, yes. We pre-treat traffic lanes and agitate them before the main clean, which lifts the ground-in dirt that makes them look gray. Worn or crushed fibers can't be repaired by cleaning, and we'll tell you up front if that's what we see.",
    ],
  },
  hurst: {
    h: "Carpet cleaning in Hurst",
    p: [
      "Hurst has many well-kept homes from the 1960s through the 1980s, along with apartments near North East Mall and Precinct Line Road. Older carpet responds well to a deep low-moisture clean, and it's much gentler on aging pads than soaking them with a hot-water wand.",
      "Hurst homeowners often book us before selling or listing a home, when carpet needs to look its best for photos and showings. Since it dries in hours, it fits into a tight listing schedule.",
      "Rentals and apartments in Hurst get the same flat pricing, with no extra charge for upstairs units.",
    ],
    areas: [
      "North East Mall area",
      "Neighborhoods off Precinct Line Road",
      "Chisholm Park area",
      "Central Hurst",
      "Apartments along Pipeline Road",
    ],
    faq: [
      "Can you clean carpet before I list my Hurst home for sale?",
      "Yes. Book a day or two before your listing photos. The carpet is dry in a few hours, and we'll pay extra attention to the main living areas and traffic lanes buyers notice first.",
    ],
  },
  euless: {
    h: "Carpet cleaning in Euless, from Glade Parks to the airport side",
    p: [
      "Euless sits right next to DFW Airport, and a lot of residents travel for work or rent their homes out. We do many rental turnovers and short-term-rental cleans here, where carpet has to be ready for the next guest the same day.",
      "Homes near Glade Parks and in north Euless tend to be newer, while central Euless has established neighborhoods and apartment communities. All of them get the same flat per-room price.",
      "Because our machine runs off a standard outlet, we can clean apartments and condos without running anything through common areas or parking lots.",
    ],
    areas: [
      "Glade Parks",
      "North Euless",
      "Central Euless",
      "Neighborhoods near Texas Star Golf Course",
      "Apartments along Highway 10",
    ],
    faq: [
      "Can you clean between short-term rental guests in Euless?",
      "Yes. Carpet is usually dry in a few hours, so a mid-morning clean is ready for an afternoon check-in. Text us your checkout and check-in times and we'll pick a window that fits.",
    ],
  },
  bedford: {
    h: "Carpet cleaning for Bedford homes",
    p: [
      "Bedford is mostly established single-family neighborhoods, many with carpet in the bedrooms and living areas and a few wool or patterned area rugs. Our low-moisture method is gentle on older carpet and rugs and keeps the pad from getting soaked.",
      "Allergy season is rough in North Texas, with cedar pollen in winter and oak in spring. A deep clean pulls out the pollen and dust that settle into carpet fibers, which is why many Bedford customers book in early spring.",
      "We also clean sofas, recliners and chairs at flat prices, so you can refresh a whole room in one visit.",
    ],
    areas: [
      "Neighborhoods off Central Drive",
      "Bedford Boys Ranch Park area",
      "Old Bedford School area",
      "North Bedford",
      "South Bedford",
    ],
    faq: [
      "Does carpet cleaning help with allergies?",
      "It can. Carpet holds pollen, dust and pet dander, and a deep clean removes much of it. Many Bedford customers schedule a clean in late winter or early spring, after cedar season and before oak pollen peaks.",
    ],
  },
  "haltom-city": {
    h: "Carpet cleaning in Haltom City",
    p: [
      "Haltom City has a mix of older single-family homes, duplexes and rentals, plus newer neighborhoods on the north side. Landlords and property managers here book us for turnovers, and families book us for regular cleans and pet stains.",
      "Our flat pricing is simple for rentals: $50 per room, no trip charge, no deposit, and you pay after the job. Landlords can text us the address and room count and we'll handle the rest.",
      "Older carpet in Haltom City homes often has years of buildup in traffic lanes. We pre-treat those areas so they come out as clean as possible.",
    ],
    areas: [
      "Neighborhoods off Belknap Street",
      "Denton Highway corridor",
      "North Haltom City",
      "Areas near Loop 820",
      "Birdville ISD neighborhoods",
    ],
    faq: [
      "Do you work with landlords and property managers in Haltom City?",
      "Yes. We clean rentals between tenants at the same flat per-room prices, with no deposit. You can book online, or text us the address, room count and move-out date.",
    ],
  },
  benbrook: {
    h: "Carpet cleaning in Benbrook",
    p: [
      "Benbrook homeowners spend a lot of time outdoors, around Benbrook Lake, the trails and the golf courses, and that means dirt and grass on the carpet. Regular cleaning keeps that grit from grinding into the fibers.",
      "Neighborhoods range from established homes near the lake to newer builds in Whitestone Ranch and off Winscott Road. Either way, you get flat prices per room, and a whole-house clean takes just a few hours.",
      "Pet owners in Benbrook often book us for odor and accident spots. We treat those areas first, then clean the whole room.",
    ],
    areas: [
      "Benbrook Lake area",
      "Whitestone Ranch",
      "Neighborhoods off Winscott Road",
      "Central Benbrook",
      "Areas near Pecan Valley Golf Course",
    ],
    faq: [
      "Do you come out to Benbrook at the same price as Fort Worth?",
      "Yes. Benbrook gets the same flat prices as Fort Worth, with no trip charge: $50 per room, $100 for a master suite, and flat prices for sofas, chairs and rugs.",
    ],
  },
  burleson: {
    h: "Carpet cleaning in Burleson",
    p: [
      "Burleson has grown fast, with many newer neighborhoods off Chisholm Trail Parkway alongside established homes near Old Town. New-construction carpet often looks fine at first, but builder-grade carpet shows traffic lanes quickly. Cleaning early and regularly keeps it looking new longer.",
      "Families with kids and pets are our most common Burleson customers. We pre-treat stains and accident spots, then clean the whole room, using solutions that are safe once dry.",
      "Burleson is on the south edge of where we work, so book a few days ahead for the best choice of times.",
    ],
    areas: [
      "Old Town Burleson",
      "Neighborhoods off Chisholm Trail Parkway",
      "Areas near Bailey Lake",
      "North Burleson",
      "Newer neighborhoods on the west side",
    ],
    faq: [
      "How soon can you clean in Burleson?",
      "Burleson is on the south edge of our area, so we group appointments there on certain days. Check the booking calendar on this page for open times, or call or text and we'll find the soonest slot.",
    ],
  },
  saginaw: {
    h: "Carpet cleaning in Saginaw",
    p: [
      "Saginaw is full of newer neighborhoods and young families, which means a lot of carpet in bedrooms and game rooms and a lot of traffic from kids and pets. Flat per-room pricing makes it easy to clean just the rooms that need it.",
      "Light-colored builder carpet shows dirt fast. A low-moisture clean brightens it without soaking it, and you can walk on it again the same day.",
      "We clean homes across Saginaw and the nearby north Fort Worth neighborhoods at the same prices as everywhere else.",
    ],
    areas: [
      "Neighborhoods off Bailey Boswell Road",
      "Willow Creek area",
      "Old Saginaw near Main Street",
      "Neighborhoods off Blue Mound Road",
      "Eagle Mountain-Saginaw ISD neighborhoods",
    ],
    faq: [
      "Will cleaning damage my newer builder-grade carpet?",
      "No. Our low-moisture method is gentle and uses much less water than a truck-mounted wand, so it won't soak the pad or loosen the backing. Cleaning early actually helps lighter carpet keep its color.",
    ],
  },
};
