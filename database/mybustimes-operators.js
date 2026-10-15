/* Swift Connect — database: MyBusTimes operator map (seed defaults).
 * These are the Swift Connect group operators on mybustimes.cc.
 * Names/IDs were resolved via https://mybustimes.cc/api/operator/?operator_code=<CODE>.
 * The live sync panel (database/mybustimes.js) can refresh names from the API;
 * edits made in the app are stored in localStorage via window.DB ("mbtOperators").
 */
window.DB_SEED_MBT_OPERATORS = [
  { code: "SWSH", id: 978,   name: "Swift Connecting Shropshire",    slug: "swift-connecting-shropshire",    depotHint: ["Hadley", "Shifnal", "Bridgnorth", "Wellington"], fallbackDepot: "" },
  { code: "SWCO", id: 979,   name: "Swift Connect Yard",             slug: "swift-connect-yard",             depotHint: ["Yard"], fallbackDepot: "Yard" },
  { code: "SWRY", id: 12313, name: "Swift Connect Retrofit Yard",    slug: "swift-connect-retrofit-yard",    depotHint: ["Retrofit Yard"], fallbackDepot: "Retrofit Yard" },
  { code: "SWCE", id: 12314, name: "Swift Connecting East Midlands", slug: "swift-connecting-east-midlands", depotHint: ["Cossall", "Phoenix Park", "Cotes Park"] },
  { code: "SCRY", id: 12080, name: "Swift Connecting Railway",       slug: "swift-connecting-railway",       depotHint: ["Swift Connecting Railway"] },
  { code: "SWCW", id: 9238,  name: "Swift Connecting Wales",         slug: "swift-connecting-wales",         depotHint: ["Talbot Green", "Wrexham", "Colwyn Bay"] },
  { code: "SWST", id: 10118, name: "Swift Connecting Staffordshire", slug: "swift-connecting-staffordshire", depotHint: ["Stoke"] },
  { code: "SWWM", id: 10119, name: "Swift Connexions West Midlands", slug: "swift-connecting-west-midlands", depotHint: ["Dudley", "Willenhall"] },
  { code: "SWCL", id: 11591, name: "Swift Connecting South London",  slug: "swift-connecting-south-london",  depotHint: ["Elmers End"] },
  { code: "SWEA", id: 14161, name: "Swift Connecting East Anglia",   slug: "swift-connecting-east-anglia",   depotHint: ["Cromer", "Fakenham", "Islas of Lincolnshire"] },
  { code: "WRCO", id: 14320, name: "Wrekin Connect",                 slug: "wrekin-connect",                 depotHint: ["Hadley", "Wellington"] }
];
