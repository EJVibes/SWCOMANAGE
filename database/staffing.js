/* Swift Connect — database seed: staffing roster (auto-filled from depots on load).
 * Rows: { id, depot, role: Driver|Engineer|Admin, headcount, annualSalary }.
 * Model: 2.3 drivers/bus (CPT: ~82k drivers / ~36k buses), 1 engineer per 15
 * buses, 1 admin per 30. Driver £43k loaded (ONS median £36,340 FT + NI/pension);
 * engineer/admin are estimates. Yards need no drivers (noDrivers on depot). */
window.DB_SEED_STAFFING = [];
