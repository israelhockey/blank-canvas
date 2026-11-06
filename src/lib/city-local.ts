/* Local details for each city page: ZIP codes served and a well-known local reference. */
export const CITY_LOCAL: Record<string, { zips: string[]; near: string }> = {
  "fort-worth": {
    zips: [
      "76102",
      "76104",
      "76107",
      "76109",
      "76110",
      "76116",
      "76123",
      "76132",
      "76137",
      "76244",
    ],
    near: "from the Near Southside and Tanglewood to Alliance and the far north side",
  },
  arlington: {
    zips: [
      "76001",
      "76002",
      "76006",
      "76010",
      "76011",
      "76012",
      "76013",
      "76014",
      "76015",
      "76016",
      "76017",
      "76018",
    ],
    near: "from Downtown Arlington and the Entertainment District to Lake Arlington and south Arlington",
  },
  keller: {
    zips: ["76248", "76244"],
    near: "around Keller Town Center and the neighborhoods off Keller Parkway",
  },
  southlake: {
    zips: ["76092"],
    near: "around Southlake Town Square and across Carroll ISD neighborhoods",
  },
  "north-richland-hills": {
    zips: ["76180", "76182"],
    near: "from HomeTown NRH to the neighborhoods off Davis Boulevard",
  },
  hurst: {
    zips: ["76053", "76054"],
    near: "around North East Mall and the neighborhoods off Precinct Line Road",
  },
  euless: {
    zips: ["76039", "76040"],
    near: "from Glade Parks to the neighborhoods near DFW Airport",
  },
  bedford: {
    zips: ["76021", "76022"],
    near: "around Bedford Boys Ranch Park and the neighborhoods off Central Drive",
  },
  "haltom-city": {
    zips: ["76117", "76137", "76148"],
    near: "along Denton Highway and the neighborhoods off Belknap",
  },
  benbrook: {
    zips: ["76126", "76132"],
    near: "around Benbrook Lake and the neighborhoods off Winscott Road",
  },
  burleson: {
    zips: ["76028"],
    near: "from Old Town Burleson to the newer neighborhoods off Chisholm Trail Parkway",
  },
  saginaw: {
    zips: ["76131", "76179"],
    near: "across Saginaw's newer neighborhoods off Bailey Boswell Road",
  },
};
