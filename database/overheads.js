/* Swift Connect — database seed: recurring overheads (depot rent lives on the depot rows; everything else lives here).
 * Figures modelled Oct 2026 from: CPT Cost Monitor Feb 2026, ONS ASHE 2025, RAC fuel Oct 2026,
 * Connection-Technologies 2026 energy guides, GOV.UK 2026/27 rates multipliers, ABI fleet data.
 * Per-row assumptions are noted in the bill names. Tiers by depot size: large 40+ veh,
 * mid 30-39, small 10-29, micro <10. */
window.DB_SEED_OVERHEADS = [
  // ---- Company-wide ----
  { id: "oh-seed-ins", name: "Fleet Motor & Liability Insurance (109 veh @ ~£3,080/yr)", category: "Insurance", scope: "Company-wide", amount: 28000, freq: "monthly" },
  { id: "oh-seed-hqnet", name: "HQ Broadband, VoIP & Mobiles (~£29-70/site + handsets)", category: "Internet", scope: "Company-wide", amount: 350, freq: "monthly" },
  { id: "oh-seed-soft", name: "Ticketing & ETM Software Licences (~109 veh @ £15/mo)", category: "Other", scope: "Company-wide", amount: 1600, freq: "monthly" },
  { id: "oh-seed-comp", name: "O-Licence, CPC & Compliance (estimate)", category: "Compliance", scope: "Company-wide", amount: 750, freq: "monthly" },
  // ---- Cossall (61 veh, large) ----
  { id: "oh-seed-cos-e", name: "Depot Electricity (≈20 MWh @ 25p/kWh)", category: "Utilities", scope: "Cossall", amount: 5000, freq: "monthly" },
  { id: "oh-seed-cos-g", name: "Depot Gas (≈8 MWh @ 8p/kWh)", category: "Utilities", scope: "Cossall", amount: 650, freq: "monthly" },
  { id: "oh-seed-cos-w", name: "Water & Sewerage (bus wash, ≈300 m³ @ £3.50)", category: "Utilities", scope: "Cossall", amount: 1000, freq: "monthly" },
  { id: "oh-seed-cos-r", name: "Business Rates (illustrative RV £120k × 48p)", category: "Business Rates", scope: "Cossall", amount: 4800, freq: "monthly" },
  { id: "oh-seed-cos-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Cossall", amount: 35, freq: "monthly" },
  // ---- Hadley (49 veh, large) ----
  { id: "oh-seed-had-e", name: "Depot Electricity (≈20 MWh @ 25p/kWh)", category: "Utilities", scope: "Hadley", amount: 5000, freq: "monthly" },
  { id: "oh-seed-had-g", name: "Depot Gas (≈8 MWh @ 8p/kWh)", category: "Utilities", scope: "Hadley", amount: 650, freq: "monthly" },
  { id: "oh-seed-had-w", name: "Water & Sewerage (bus wash, ≈300 m³ @ £3.50)", category: "Utilities", scope: "Hadley", amount: 1000, freq: "monthly" },
  { id: "oh-seed-had-r", name: "Business Rates (illustrative RV £120k × 48p)", category: "Business Rates", scope: "Hadley", amount: 4800, freq: "monthly" },
  { id: "oh-seed-had-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Hadley", amount: 35, freq: "monthly" },
  // ---- Cotes Park (44 veh, large) ----
  { id: "oh-seed-cot-e", name: "Depot Electricity (≈20 MWh @ 25p/kWh)", category: "Utilities", scope: "Cotes Park", amount: 5000, freq: "monthly" },
  { id: "oh-seed-cot-g", name: "Depot Gas (≈8 MWh @ 8p/kWh)", category: "Utilities", scope: "Cotes Park", amount: 650, freq: "monthly" },
  { id: "oh-seed-cot-w", name: "Water & Sewerage (bus wash, ≈300 m³ @ £3.50)", category: "Utilities", scope: "Cotes Park", amount: 1000, freq: "monthly" },
  { id: "oh-seed-cot-r", name: "Business Rates (illustrative RV £120k × 48p)", category: "Business Rates", scope: "Cotes Park", amount: 4800, freq: "monthly" },
  { id: "oh-seed-cot-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Cotes Park", amount: 35, freq: "monthly" },
  // ---- Talbot Green (37 veh, mid) ----
  { id: "oh-seed-tal-e", name: "Depot Electricity (≈12 MWh @ 25p/kWh)", category: "Utilities", scope: "Talbot Green", amount: 3000, freq: "monthly" },
  { id: "oh-seed-tal-g", name: "Depot Gas (≈5 MWh @ 8p/kWh)", category: "Utilities", scope: "Talbot Green", amount: 400, freq: "monthly" },
  { id: "oh-seed-tal-w", name: "Water & Sewerage (bus wash, ≈170 m³ @ £3.50)", category: "Utilities", scope: "Talbot Green", amount: 600, freq: "monthly" },
  { id: "oh-seed-tal-r", name: "Business Rates (illustrative RV £80k × 48p)", category: "Business Rates", scope: "Talbot Green", amount: 3200, freq: "monthly" },
  { id: "oh-seed-tal-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Talbot Green", amount: 35, freq: "monthly" },
  // ---- Stoke (38 veh, mid) ----
  { id: "oh-seed-sto-e", name: "Depot Electricity (≈12 MWh @ 25p/kWh)", category: "Utilities", scope: "Stoke", amount: 3000, freq: "monthly" },
  { id: "oh-seed-sto-g", name: "Depot Gas (≈5 MWh @ 8p/kWh)", category: "Utilities", scope: "Stoke", amount: 400, freq: "monthly" },
  { id: "oh-seed-sto-w", name: "Water & Sewerage (bus wash, ≈170 m³ @ £3.50)", category: "Utilities", scope: "Stoke", amount: 600, freq: "monthly" },
  { id: "oh-seed-sto-r", name: "Business Rates (illustrative RV £80k × 48p)", category: "Business Rates", scope: "Stoke", amount: 3200, freq: "monthly" },
  { id: "oh-seed-sto-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Stoke", amount: 35, freq: "monthly" },
  // ---- Dudley (34 veh, mid) ----
  { id: "oh-seed-dud-e", name: "Depot Electricity (≈12 MWh @ 25p/kWh)", category: "Utilities", scope: "Dudley", amount: 3000, freq: "monthly" },
  { id: "oh-seed-dud-g", name: "Depot Gas (≈5 MWh @ 8p/kWh)", category: "Utilities", scope: "Dudley", amount: 400, freq: "monthly" },
  { id: "oh-seed-dud-w", name: "Water & Sewerage (bus wash, ≈170 m³ @ £3.50)", category: "Utilities", scope: "Dudley", amount: 600, freq: "monthly" },
  { id: "oh-seed-dud-r", name: "Business Rates (illustrative RV £80k × 48p)", category: "Business Rates", scope: "Dudley", amount: 3200, freq: "monthly" },
  { id: "oh-seed-dud-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Dudley", amount: 35, freq: "monthly" },
  // ---- Elmers End (30 veh, mid, London) ----
  { id: "oh-seed-elm-e", name: "Depot Electricity (≈12 MWh @ 25p/kWh)", category: "Utilities", scope: "Elmers End", amount: 3000, freq: "monthly" },
  { id: "oh-seed-elm-g", name: "Depot Gas (≈5 MWh @ 8p/kWh)", category: "Utilities", scope: "Elmers End", amount: 400, freq: "monthly" },
  { id: "oh-seed-elm-w", name: "Water & Sewerage (bus wash, ≈170 m³ @ £3.50)", category: "Utilities", scope: "Elmers End", amount: 600, freq: "monthly" },
  { id: "oh-seed-elm-r", name: "Business Rates (London, illustrative RV £100k × 48p)", category: "Business Rates", scope: "Elmers End", amount: 4000, freq: "monthly" },
  { id: "oh-seed-elm-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Elmers End", amount: 35, freq: "monthly" },
  // ---- Cromer (30 veh, mid) ----
  { id: "oh-seed-cro-e", name: "Depot Electricity (≈12 MWh @ 25p/kWh)", category: "Utilities", scope: "Cromer", amount: 3000, freq: "monthly" },
  { id: "oh-seed-cro-g", name: "Depot Gas (≈5 MWh @ 8p/kWh)", category: "Utilities", scope: "Cromer", amount: 400, freq: "monthly" },
  { id: "oh-seed-cro-w", name: "Water & Sewerage (bus wash, ≈170 m³ @ £3.50)", category: "Utilities", scope: "Cromer", amount: 600, freq: "monthly" },
  { id: "oh-seed-cro-r", name: "Business Rates (illustrative RV £80k × 48p)", category: "Business Rates", scope: "Cromer", amount: 3200, freq: "monthly" },
  { id: "oh-seed-cro-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Cromer", amount: 35, freq: "monthly" },
  // ---- Willenhall (21 veh, small) ----
  { id: "oh-seed-wil-e", name: "Depot Electricity (≈6 MWh @ 25p/kWh)", category: "Utilities", scope: "Willenhall", amount: 1500, freq: "monthly" },
  { id: "oh-seed-wil-g", name: "Depot Gas (≈3 MWh @ 8p/kWh)", category: "Utilities", scope: "Willenhall", amount: 250, freq: "monthly" },
  { id: "oh-seed-wil-w", name: "Water & Sewerage (bus wash, ≈100 m³ @ £3.50)", category: "Utilities", scope: "Willenhall", amount: 350, freq: "monthly" },
  { id: "oh-seed-wil-r", name: "Business Rates (illustrative RV £40k × 43.2p small)", category: "Business Rates", scope: "Willenhall", amount: 1440, freq: "monthly" },
  { id: "oh-seed-wil-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Willenhall", amount: 35, freq: "monthly" },
  // ---- Wrexham (19 veh, small) ----
  { id: "oh-seed-wre-e", name: "Depot Electricity (≈6 MWh @ 25p/kWh)", category: "Utilities", scope: "Wrexham", amount: 1500, freq: "monthly" },
  { id: "oh-seed-wre-g", name: "Depot Gas (≈3 MWh @ 8p/kWh)", category: "Utilities", scope: "Wrexham", amount: 250, freq: "monthly" },
  { id: "oh-seed-wre-w", name: "Water & Sewerage (bus wash, ≈100 m³ @ £3.50)", category: "Utilities", scope: "Wrexham", amount: 350, freq: "monthly" },
  { id: "oh-seed-wre-r", name: "Business Rates (illustrative RV £40k × 43.2p small)", category: "Business Rates", scope: "Wrexham", amount: 1440, freq: "monthly" },
  { id: "oh-seed-wre-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Wrexham", amount: 35, freq: "monthly" },
  // ---- Islas of Lincolnshire (17 veh, small) ----
  { id: "oh-seed-lin-e", name: "Depot Electricity (≈6 MWh @ 25p/kWh)", category: "Utilities", scope: "Islas of Lincolnshire", amount: 1500, freq: "monthly" },
  { id: "oh-seed-lin-g", name: "Depot Gas (≈3 MWh @ 8p/kWh)", category: "Utilities", scope: "Islas of Lincolnshire", amount: 250, freq: "monthly" },
  { id: "oh-seed-lin-w", name: "Water & Sewerage (bus wash, ≈100 m³ @ £3.50)", category: "Utilities", scope: "Islas of Lincolnshire", amount: 350, freq: "monthly" },
  { id: "oh-seed-lin-r", name: "Business Rates (illustrative RV £40k × 43.2p small)", category: "Business Rates", scope: "Islas of Lincolnshire", amount: 1440, freq: "monthly" },
  { id: "oh-seed-lin-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Islas of Lincolnshire", amount: 35, freq: "monthly" },
  // ---- Wellington (13 veh, small) ----
  { id: "oh-seed-wel-e", name: "Depot Electricity (≈6 MWh @ 25p/kWh)", category: "Utilities", scope: "Wellington", amount: 1500, freq: "monthly" },
  { id: "oh-seed-wel-g", name: "Depot Gas (≈3 MWh @ 8p/kWh)", category: "Utilities", scope: "Wellington", amount: 250, freq: "monthly" },
  { id: "oh-seed-wel-w", name: "Water & Sewerage (bus wash, ≈100 m³ @ £3.50)", category: "Utilities", scope: "Wellington", amount: 350, freq: "monthly" },
  { id: "oh-seed-wel-r", name: "Business Rates (illustrative RV £40k × 43.2p small)", category: "Business Rates", scope: "Wellington", amount: 1440, freq: "monthly" },
  { id: "oh-seed-wel-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Wellington", amount: 35, freq: "monthly" },
  // ---- Bridgnorth (10 veh, small) ----
  { id: "oh-seed-bri-e", name: "Depot Electricity (≈6 MWh @ 25p/kWh)", category: "Utilities", scope: "Bridgnorth", amount: 1500, freq: "monthly" },
  { id: "oh-seed-bri-g", name: "Depot Gas (≈3 MWh @ 8p/kWh)", category: "Utilities", scope: "Bridgnorth", amount: 250, freq: "monthly" },
  { id: "oh-seed-bri-w", name: "Water & Sewerage (bus wash, ≈100 m³ @ £3.50)", category: "Utilities", scope: "Bridgnorth", amount: 350, freq: "monthly" },
  { id: "oh-seed-bri-r", name: "Business Rates (illustrative RV £40k × 43.2p small)", category: "Business Rates", scope: "Bridgnorth", amount: 1440, freq: "monthly" },
  { id: "oh-seed-bri-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Bridgnorth", amount: 35, freq: "monthly" },
  // ---- Fakenham (10 veh, small) ----
  { id: "oh-seed-fak-e", name: "Depot Electricity (≈6 MWh @ 25p/kWh)", category: "Utilities", scope: "Fakenham", amount: 1500, freq: "monthly" },
  { id: "oh-seed-fak-g", name: "Depot Gas (≈3 MWh @ 8p/kWh)", category: "Utilities", scope: "Fakenham", amount: 250, freq: "monthly" },
  { id: "oh-seed-fak-w", name: "Water & Sewerage (bus wash, ≈100 m³ @ £3.50)", category: "Utilities", scope: "Fakenham", amount: 350, freq: "monthly" },
  { id: "oh-seed-fak-r", name: "Business Rates (illustrative RV £40k × 43.2p small)", category: "Business Rates", scope: "Fakenham", amount: 1440, freq: "monthly" },
  { id: "oh-seed-fak-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Fakenham", amount: 35, freq: "monthly" },
  // ---- Colwyn Bay (6 veh, micro) ----
  { id: "oh-seed-col-e", name: "Depot Electricity (≈3 MWh @ 25p/kWh)", category: "Utilities", scope: "Colwyn Bay", amount: 800, freq: "monthly" },
  { id: "oh-seed-col-g", name: "Depot Gas (≈2 MWh @ 8p/kWh)", category: "Utilities", scope: "Colwyn Bay", amount: 150, freq: "monthly" },
  { id: "oh-seed-col-w", name: "Water & Sewerage (bus wash, ≈60 m³ @ £3.50)", category: "Utilities", scope: "Colwyn Bay", amount: 200, freq: "monthly" },
  { id: "oh-seed-col-r", name: "Business Rates (illustrative RV £25k × 43.2p small)", category: "Business Rates", scope: "Colwyn Bay", amount: 900, freq: "monthly" },
  { id: "oh-seed-col-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Colwyn Bay", amount: 35, freq: "monthly" },
  // ---- Phoenix Park (5 veh, micro) ----
  { id: "oh-seed-pho-e", name: "Depot Electricity (≈3 MWh @ 25p/kWh)", category: "Utilities", scope: "Phoenix Park", amount: 800, freq: "monthly" },
  { id: "oh-seed-pho-g", name: "Depot Gas (≈2 MWh @ 8p/kWh)", category: "Utilities", scope: "Phoenix Park", amount: 150, freq: "monthly" },
  { id: "oh-seed-pho-w", name: "Water & Sewerage (bus wash, ≈60 m³ @ £3.50)", category: "Utilities", scope: "Phoenix Park", amount: 200, freq: "monthly" },
  { id: "oh-seed-pho-r", name: "Business Rates (illustrative RV £25k × 43.2p small)", category: "Business Rates", scope: "Phoenix Park", amount: 900, freq: "monthly" },
  { id: "oh-seed-pho-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Phoenix Park", amount: 35, freq: "monthly" },
  // ---- Swift Connecting Railway (4 veh, micro) ----
  { id: "oh-seed-rai-e", name: "Depot Electricity (≈3 MWh @ 25p/kWh)", category: "Utilities", scope: "Swift Connecting Railway", amount: 800, freq: "monthly" },
  { id: "oh-seed-rai-g", name: "Depot Gas (≈2 MWh @ 8p/kWh)", category: "Utilities", scope: "Swift Connecting Railway", amount: 150, freq: "monthly" },
  { id: "oh-seed-rai-w", name: "Water & Sewerage (bus wash, ≈60 m³ @ £3.50)", category: "Utilities", scope: "Swift Connecting Railway", amount: 200, freq: "monthly" },
  { id: "oh-seed-rai-r", name: "Business Rates (illustrative RV £25k × 43.2p small)", category: "Business Rates", scope: "Swift Connecting Railway", amount: 900, freq: "monthly" },
  { id: "oh-seed-rai-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Swift Connecting Railway", amount: 35, freq: "monthly" },
  // ---- Shifnal (3 veh, micro) ----
  { id: "oh-seed-shi-e", name: "Depot Electricity (≈3 MWh @ 25p/kWh)", category: "Utilities", scope: "Shifnal", amount: 800, freq: "monthly" },
  { id: "oh-seed-shi-g", name: "Depot Gas (≈2 MWh @ 8p/kWh)", category: "Utilities", scope: "Shifnal", amount: 150, freq: "monthly" },
  { id: "oh-seed-shi-w", name: "Water & Sewerage (bus wash, ≈60 m³ @ £3.50)", category: "Utilities", scope: "Shifnal", amount: 200, freq: "monthly" },
  { id: "oh-seed-shi-r", name: "Business Rates (illustrative RV £25k × 43.2p small)", category: "Business Rates", scope: "Shifnal", amount: 900, freq: "monthly" },
  { id: "oh-seed-shi-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Shifnal", amount: 35, freq: "monthly" },
  // ---- Las Chumberas (3 veh, micro) ----
  { id: "oh-seed-las-e", name: "Depot Electricity (≈3 MWh @ 25p/kWh)", category: "Utilities", scope: "Las Chumberas", amount: 800, freq: "monthly" },
  { id: "oh-seed-las-g", name: "Depot Gas (≈2 MWh @ 8p/kWh)", category: "Utilities", scope: "Las Chumberas", amount: 150, freq: "monthly" },
  { id: "oh-seed-las-w", name: "Water & Sewerage (bus wash, ≈60 m³ @ £3.50)", category: "Utilities", scope: "Las Chumberas", amount: 200, freq: "monthly" },
  { id: "oh-seed-las-r", name: "Business Rates (illustrative RV £25k × 43.2p small)", category: "Business Rates", scope: "Las Chumberas", amount: 900, freq: "monthly" },
  { id: "oh-seed-las-b", name: "Depot Broadband (business avg ≈£35/mo)", category: "Internet", scope: "Las Chumberas", amount: 35, freq: "monthly" }
];
