/* Swift Connect — database: depots seed.
 * baseExpenses covers NON-staff operating costs only (fuel, maint, parts);
 * drivers/engineers/admin live in the Staffing tab. baseIncome is kept as a
 * historical reference (live income is ticket-driven). */
window.DB_SEED_DEPOTS = [
  { name: "Hadley", vehicles: 49, baseIncome: 50199.4, baseExpenses: 18984.35, rent: 742, staffSplit: true },
  { name: "Shifnal", vehicles: 3, baseIncome: 2315.64, baseExpenses: 1242.45, rent: 0, staffSplit: true },
  { name: "Bridgnorth", vehicles: 10, baseIncome: 12387.5, baseExpenses: 4141.5, rent: 207, staffSplit: true },
  { name: "Cossall", vehicles: 61, baseIncome: 81929.1, baseExpenses: 23294.15, rent: 0, staffSplit: true },
  { name: "Phoenix Park", vehicles: 5, baseIncome: 5405.25, baseExpenses: 1960.75, rent: 0, staffSplit: true },
  { name: "Elmers End", vehicles: 30, baseIncome: 49759.4, baseExpenses: 11819.5, rent: 500, staffSplit: true },
  { name: "Stoke", vehicles: 38, baseIncome: 33256.8, baseExpenses: 14527.7, rent: 400, staffSplit: true },
  { name: "Talbot Green", vehicles: 37, baseIncome: 94248.5, baseExpenses: 14674.55, rent: 0, staffSplit: true },
  { name: "Colwyn Bay", vehicles: 6, baseIncome: 8034.54, baseExpenses: 2704.9, rent: 207, staffSplit: true },
  { name: "Islas of Lincolnshire", vehicles: 17, baseIncome: 13193.7, baseExpenses: 6985.55, rent: 400, staffSplit: true },
  { name: "Willenhall", vehicles: 21, baseIncome: 25579.5, baseExpenses: 9082.15, rent: 871, staffSplit: true },
  { name: "Dudley", vehicles: 34, baseIncome: 65758.4, baseExpenses: 13751.1, rent: 871, staffSplit: true },
  { name: "Las Chumberas", vehicles: 3, baseIncome: 2486.1, baseExpenses: 459.36, rent: 0, staffSplit: true },
  { name: "Swift Connecting Railway", vehicles: 4, baseIncome: 33711.6, baseExpenses: 9680, rent: 1600, staffSplit: true },
  { name: "Wellington", vehicles: 13, baseIncome: 10555.4, baseExpenses: 5218.95, rent: 207, staffSplit: true },
  { name: "Cromer", vehicles: 30, baseIncome: 27963, baseExpenses: 11654.5, rent: 207, staffSplit: true },
  { name: "Fakenham", vehicles: 10, baseIncome: 9321, baseExpenses: 3884.83, rent: 207, staffSplit: true },
  { name: "Wrexham", vehicles: 19, baseIncome: 25442.7, baseExpenses: 8565.54, rent: 207, staffSplit: true },
  { name: "Cotes Park", vehicles: 44, baseIncome: 58919.9, baseExpenses: 19835.92, rent: 0, staffSplit: true }
];
