/* =========================================================================
 * Swift Connect — Database layer
 * Each collection lives in its own seed file under database/ and is
 * referenced by index.html via <script src>. Writes save immediately to
 * localStorage (per-collection keys) so every edit persists.
 *
 * Browser JS cannot overwrite the .js seed files on disk/server, so:
 *  - seeds = factory defaults (individual database files)
 *  - localStorage overlay = live writable database
 *  - Export buttons download the live DB back to files when needed
 * ========================================================================= */
(function () {
  "use strict";

  var LS_PREFIX = "sc_db_v2_";
  var LEGACY_KEY = "swift_connect_sim_v1";
  var COLLECTIONS = [
    "meta",
    "transactions",
    "depots",
    "busCatalogue",
    "fleetRegistry",
    "fares",
    "workshopQueue",
    "workshopCompleted",
    "mbtOperators"
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function seedFor(name) {
    switch (name) {
      case "meta": return clone(window.DB_SEED_META || { simDate: "2026-10-14", bankBalance: 0 });
      case "transactions": return clone(window.DB_SEED_TRANSACTIONS || []);
      case "depots": return clone(window.DB_SEED_DEPOTS || []);
      case "busCatalogue": return clone(window.DB_SEED_BUS_CATALOGUE || []);
      case "workshopQueue": return clone(window.DB_SEED_WORKSHOP_QUEUE || []);
      case "workshopCompleted": return clone(window.DB_SEED_WORKSHOP_COMPLETED || []);
      case "fares": return clone(window.DB_SEED_FARES || {});
      case "mbtOperators": return clone(window.DB_SEED_MBT_OPERATORS || []);
      case "fleetRegistry": return buildFleetFromSeeds();
      default: return null;
    }
  }

  function buildFleetFromSeeds() {
    var csv = window.DB_SEED_FLEET_CSV || "";
    var specs = window.DB_SEED_VEHICLE_SPECS || window.DB_SEED_OMSI_SPECS || {};
    if (!csv) return [];
    return csv.split("\n").map(function (line) {
      var parts = line.split(",");
      var id = parts[0], reg = parts[1], type = parts.slice(2).join(",");
      var num = parseInt(id, 10);
      var cat = "Single";
      if (num < 200) cat = "Training";
      else if (num < 2000) cat = "Mini/Midi";
      else if (num >= 3000 && num < 4000) cat = "Decker";
      else if (num >= 4000) cat = "Coach";
      var spec = specs[type] || {
        livery: num >= 4000 ? "Swift Connect Coach" : ((num >= 2700 && num < 2800) || num >= 3700 ? "Swift Connect Electric" : "Swift Connect Standard"),
        engine: "Euro VI Standard",
        gearbox: "ZF EcoLife / Voith"
      };
      return { id: num, reg: reg, type: type, cat: cat, livery: spec.livery, engine: spec.engine, gearbox: spec.gearbox };
    });
  }

  function lsKey(name) { return LS_PREFIX + name; }

  function readLS(name) {
    try {
      var raw = localStorage.getItem(lsKey(name));
      if (raw === null || raw === undefined) return undefined;
      return JSON.parse(raw);
    } catch (e) { console.error("[DB] read failed:", name, e); return undefined; }
  }

  function writeLS(name, val) {
    try {
      localStorage.setItem(lsKey(name), JSON.stringify(val));
      updateSaveBadge();
      return true;
    } catch (e) { console.error("[DB] write failed:", name, e); return false; }
  }

  // One-time migration from the old single-key save format.
  function migrateLegacy() {
    try {
      var raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return false;
      var old = JSON.parse(raw);
      if (!old || typeof old !== "object") return false;
      if (readLS("meta") !== undefined) return false; // already migrated
      if (old.simDate !== undefined || old.bankBalance !== undefined)
        writeLS("meta", { simDate: old.simDate, bankBalance: old.bankBalance });
      if (old.transactions) writeLS("transactions", old.transactions);
      if (old.depots) writeLS("depots", old.depots);
      if (old.busCatalogue) writeLS("busCatalogue", old.busCatalogue);
      if (old.fleetRegistry) writeLS("fleetRegistry", old.fleetRegistry);
      if (old.fares) writeLS("fares", old.fares);
      if (old.workshopQueue) writeLS("workshopQueue", old.workshopQueue);
      return true;
    } catch (e) { console.error("[DB] migration failed", e); return false; }
  }

  var SEED_VERSION = 2;

  // Seeds evolve (catalogue allocations rewritten, new operators, ...), but
  // browsers keep the old copies in localStorage. On a version bump, migrate
  // the stored catalogue forward: seed regions win (the sheet/API is the
  // authority for allocations), everything else the user changed is kept.
  // New seed models are appended; buy/sell history in the fleet registry and
  // ledger is untouched.
  function ensureSeedVersion() {
    var v = 0;
    try {
      v = parseInt(localStorage.getItem(LS_PREFIX + "seed_version"), 10) || 0;
    } catch (e) {}
    if (v >= SEED_VERSION) return;
    try {
      var seeds = seedFor("busCatalogue") || [];
      var stored = readLS("busCatalogue");
      if (Array.isArray(stored)) {
        var byModel = {};
        seeds.forEach(function (s) { byModel[s.model] = s; });
        stored.forEach(function (row) {
          var s = byModel[row.model];
          if (s) row.regions = s.regions;
        });
        seeds.forEach(function (s) {
          var found = false;
          for (var i = 0; i < stored.length; i++) {
            if (stored[i].model === s.model) { found = true; break; }
          }
          if (!found) stored.push(clone(s));
        });
        writeLS("busCatalogue", stored);
      }
    } catch (e) { console.error("[DB] catalogue migration failed", e); }
    try { localStorage.setItem(LS_PREFIX + "seed_version", String(SEED_VERSION)); } catch (e) {}
  }

  var saveBadgeTimer = null;
  function updateSaveBadge() {
    var el = document.getElementById("db-save-status");
    if (!el) return;
    var d = new Date();
    var t = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    el.textContent = "● Saved " + t;
    el.classList.remove("text-slate-500");
    el.classList.add("text-emerald-400");
    clearTimeout(saveBadgeTimer);
    saveBadgeTimer = setTimeout(function () {
      el.textContent = "● Database connected (" + COLLECTIONS.length + " tables)";
      el.classList.remove("text-emerald-400");
      el.classList.add("text-slate-500");
    }, 2500);
  }

  window.DB = {
    COLLECTIONS: COLLECTIONS,
    load: function (name) {
      var v = readLS(name);
      if (v !== undefined) return v;
      var s = seedFor(name);
      writeLS(name, s);
      return clone(s);
    },
    save: function (name, val) { return writeLS(name, val); },
    loadAllState: function () {
      migrateLegacy();
      ensureSeedVersion();
      var meta = this.load("meta");
      return {
        simDate: meta.simDate,
        bankBalance: meta.bankBalance,
        transactions: this.load("transactions"),
        depots: this.load("depots"),
        busCatalogue: this.load("busCatalogue"),
        fleetRegistry: this.load("fleetRegistry"),
        fares: this.load("fares"),
        workshopQueue: this.load("workshopQueue"),
        workshopCompleted: this.load("workshopCompleted")
      };
    },
    // Write-through: every app mutation calls this, so writes always save.
    saveAllState: function (state) {
      if (!state) return;
      writeLS("meta", { simDate: state.simDate, bankBalance: state.bankBalance });
      writeLS("transactions", state.transactions);
      writeLS("depots", state.depots);
      writeLS("busCatalogue", state.busCatalogue);
      writeLS("fleetRegistry", state.fleetRegistry);
      writeLS("fares", state.fares);
      writeLS("workshopQueue", state.workshopQueue);
      writeLS("workshopCompleted", state.workshopCompleted || []);
    },
    resetToSeeds: function () {
      var self = this;
      COLLECTIONS.forEach(function (c) { writeLS(c, seedFor(c)); });
      return self.loadAllState();
    },
    exportAll: function () {
      return {
        meta: this.load("meta"),
        transactions: this.load("transactions"),
        depots: this.load("depots"),
        busCatalogue: this.load("busCatalogue"),
        fleetRegistry: this.load("fleetRegistry"),
        fares: this.load("fares"),
        workshopQueue: this.load("workshopQueue"),
        workshopCompleted: this.load("workshopCompleted"),
        vehicleSpecs: clone(window.DB_SEED_VEHICLE_SPECS || window.DB_SEED_OMSI_SPECS || {}),
        drivetrainSpecs: clone(window.DB_SEED_DRIVETRAIN_SPECS || {}),
        workshopCatalogue: clone(window.DB_SEED_WORKSHOP_CATALOGUE || {}),
        mbtOperators: this.load("mbtOperators"),
        fleetCsv: window.DB_SEED_FLEET_CSV || ""
      };
    }
  };

  // ---- Backwards-compatible globals (rest of app keeps working unchanged) ----
  window.RAW_FLEET_CSV = window.DB_SEED_FLEET_CSV || "";
  window.VEHICLE_SPECS = window.DB_SEED_VEHICLE_SPECS || window.DB_SEED_OMSI_SPECS || {};
  window.WORKSHOP_CATALOGUE = window.DB_SEED_WORKSHOP_CATALOGUE || {};
  window.FARE_TABLES = window.DB_SEED_FARES || {};
  window.INITIAL_STATE = {
    simDate: (window.DB_SEED_META || {}).simDate,
    bankBalance: (window.DB_SEED_META || {}).bankBalance,
    workshopQueue: clone(window.DB_SEED_WORKSHOP_QUEUE || []),
    workshopCompleted: clone(window.DB_SEED_WORKSHOP_COMPLETED || []),
    transactions: clone(window.DB_SEED_TRANSACTIONS || []),
    depots: clone(window.DB_SEED_DEPOTS || []),
    busCatalogue: clone(window.DB_SEED_BUS_CATALOGUE || [])
  };
})();
