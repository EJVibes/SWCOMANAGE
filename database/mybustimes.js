/* =========================================================================
 * Swift Connect — MyBusTimes live sync engine (window.MBT)
 * Sources:
 *   Operators: https://mybustimes.cc/api/operator/?operator_code=<CODE>
 *   Fleet:     https://mybustimes.cc/api/operator/fleet/?operator=<ID>
 *
 * What it does:
 *   1. Fetches every vehicle for the configured Swift Connect operators
 *      (paginated, filtered per-operator by numeric operator ID).
 *   2. Groups vehicles by their `depot` field -> feeds the Depot Network
 *      table (Depot Network & Daily Financial Performance) automatically.
  *   3. Maps every vehicle (fleet_number / reg / type, plus the API's
  *      engine / gearbox fields with local-spec fallback, and a Euro
  *      standard cross-checked from the reg-plate year) -> Master Fleet
  *      Registry entries.
 * Writes go through the app's state + saveState() so they persist via DB.
 * ========================================================================= */
(function () {
  "use strict";

  var API_BASE = "https://mybustimes.cc/api";
  var PAGE_LIMIT = 100;
  var LS_SYNC_KEY = "sc_db_v2_mbt_sync";
  var LS_ALIAS_KEY = "sc_db_v2_mbt_aliases";
  var UNALLOCATED = "Unallocated";

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function normalize(s) {
    return String(s === undefined || s === null ? "" : s)
      .toLowerCase().trim().replace(/\s+/g, " ");
  }

  function normalizeReg(s) {
    return String(s || "").toUpperCase().replace(/[\s\-_.]/g, "");
  }

  function parseFleetId(fleetNumber) {
    var raw = String(fleetNumber === undefined || fleetNumber === null ? "" : fleetNumber).trim();
    if (/^\d+$/.test(raw)) {
      var n = parseInt(raw, 10);
      return { id: n, idNum: n, raw: raw };
    }
    return { id: raw, idNum: null, raw: raw };
  }

  /* ---------------- Euro standard from reg plate + fuel ----------------
   * Decodes the UK registration year, then bands it against the engine's
   * emission regime (heavy-duty for buses/coaches, light-duty dates for
   * minibuses/vans, zero-emission for electrics/hydrogen). */

  var PREFIX_YEAR = { A: 1983, B: 1984, C: 1985, D: 1986, E: 1987, F: 1988, G: 1989, H: 1990, J: 1991, K: 1992, L: 1993, M: 1994, N: 1995, P: 1996, R: 1997, S: 1998, T: 1999, V: 2000, W: 2000, X: 2001, Y: 2001 };
  var SUFFIX_YEAR = { A: 1963, B: 1964, C: 1965, D: 1966, E: 1967, F: 1968, G: 1969, H: 1970, J: 1971, K: 1972, L: 1973, M: 1974, N: 1975, P: 1976, R: 1977, S: 1978, T: 1979, V: 1980, W: 1981, X: 1982, Y: 1983 };

  function regYearFromPlate(reg) {
    var r = String(reg || "").toUpperCase().replace(/[\s\-.]/g, "");
    var m;
    // Current style AB12CDE (Sept 2001 on; 50+ = Sept–Feb release).
    if ((m = /^([A-Z]{2})(\d{2})([A-Z]{3})$/.exec(r))) {
      var dd = parseInt(m[2], 10);
      if (dd < 1 || dd > 99) return null;
      return dd >= 50 ? 2000 + (dd - 50) : 2000 + dd;
    }
    // Prefix style A123BCD (Aug 1983 – Aug 2001). Q = age unknown.
    if ((m = /^([A-Z])(\d{1,3})([A-Z]{3})$/.exec(r))) {
      if (m[1] === "Q") return null;
      return PREFIX_YEAR[m[1]] || null;
    }
    // Suffix style ABC123D (1963 – 1983).
    if ((m = /^([A-Z]{1,3})(\d{1,3})([A-Z])$/.exec(r))) {
      return SUFFIX_YEAR[m[3]] || null;
    }
    return null; // NI, dateless, cherished, UNREG…
  }

  function euroFromYearFuel(year, fuel, engineText, isMinibus) {
    var f = String(fuel || "").toLowerCase();
    var e = String(engineText || "").toLowerCase();
    if (f === "electric" || f.indexOf("electric") !== -1 || f.indexOf("hydrogen") !== -1 || f.indexOf("fuel cell") !== -1 ||
        /\belectric\b|\bbattery\b|\bbev\b|zero emission|veds|electroliner|ecitaro|equipmake|kleandrive/.test(e)) return "Zero emission";
    if (year === null || year === undefined || isNaN(year)) return "";
    var cuts = isMinibus ? [1992, 1996, 2000, 2005, 2011, 2015] : [1992, 1996, 2000, 2005, 2008, 2013];
    if (year < cuts[0]) return "Pre-Euro";
    for (var i = cuts.length - 1; i >= 0; i--) {
      if (year >= cuts[i]) return "Euro " + (i + 1);
    }
    return "";
  }

  /* ---------------- operators ---------------- */

  function seedOperators() {
    return clone(window.DB_SEED_MBT_OPERATORS || []);
  }

  function getOperators() {
    var seeds = seedOperators();
    var stored = null;
    try {
      if (window.DB && window.DB.load) {
        var v = window.DB.load("mbtOperators");
        if (Array.isArray(v)) stored = v;
      }
    } catch (e) { console.error("[MBT] operator load failed", e); }
    if (!stored) {
      try {
        var raw = localStorage.getItem("sc_db_v2_mbt_operators");
        if (raw) stored = JSON.parse(raw);
      } catch (e2) {}
    }
    if (!stored) return seeds;
    // Merge: pick up newly-seeded operators and backfill new fields (e.g. fallbackDepot).
    var byCode = {};
    stored.forEach(function (o) { byCode[o.code] = o; });
    var changed = false;
    seeds.forEach(function (s) {
      var cur = byCode[s.code];
      if (!cur) { stored.push(clone(s)); changed = true; return; }
      ["id", "name", "slug", "depotHint", "fallbackDepot"].forEach(function (k) {
        if (cur[k] === undefined && s[k] !== undefined) { cur[k] = clone(s[k]); changed = true; }
      });
      // Migrate the old shared Yard fallback: Retrofit Yard is now its own location.
      if (cur.code === "SWRY" && cur.fallbackDepot === "Yard") { cur.fallbackDepot = "Retrofit Yard"; changed = true; }
    });
    if (changed) saveOperators(stored);
    return stored;
  }

  function saveOperators(list) {
    try {
      if (window.DB && window.DB.save) window.DB.save("mbtOperators", list);
      else localStorage.setItem("sc_db_v2_mbt_operators", JSON.stringify(list));
    } catch (e) { console.error("[MBT] operator save failed", e); }
  }

  function resetOperators() {
    var s = seedOperators();
    saveOperators(s);
    return s;
  }

  function fetchJson(url) {
    return fetch(url, { headers: { "Accept": "application/json" } }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
      return res.json();
    });
  }

  function refreshOperatorNames(onProgress) {
    var ops = getOperators();
    var chain = Promise.resolve();
    var updated = [];
    ops.forEach(function (op) {
      chain = chain.then(function () {
        if (onProgress) onProgress("Resolving " + op.code + "…");
        return fetchJson(API_BASE + "/operator/?format=json&limit=10&operator_code=" + encodeURIComponent(op.code))
          .then(function (d) {
            var r = (d.results || [])[0];
            if (r) {
              op.id = r.id;
              op.name = r.operator_name || op.name;
              op.slug = r.operator_slug || op.slug;
              updated.push(op.code);
            }
          })
          .catch(function (e) { console.warn("[MBT] resolve failed for " + op.code, e); });
      });
    });
    return chain.then(function () {
      saveOperators(ops);
      return { operators: ops, updated: updated };
    });
  }

  function addOperatorByCode(code) {
    code = String(code || "").trim().toUpperCase();
    if (!code) return Promise.reject(new Error("Enter an operator code (e.g. SWSH)."));
    return fetchJson(API_BASE + "/operator/?format=json&limit=10&operator_code=" + encodeURIComponent(code))
      .then(function (d) {
        var r = (d.results || [])[0];
        if (!r) throw new Error("No mybustimes operator found for code " + code);
        var ops = getOperators();
        var existing = ops.filter(function (o) { return o.code === code || o.id === r.id; })[0];
        var entry = {
          code: r.operator_code || code,
          id: r.id,
          name: r.operator_name,
          slug: r.operator_slug,
          depotHint: (existing && existing.depotHint) || []
        };
        if (existing) {
          ops[ops.indexOf(existing)] = entry;
        } else {
          ops.push(entry);
        }
        saveOperators(ops);
        return entry;
      });
  }

  /* ---------------- depot aliases (API depot name -> local depot) ----------------
   * Stored as { "<normalized api name>": "<local depot name>" | null }.
   * null means "explicitly create a new depot row". Used by matchDepots. */

  function getAliases() {
    try {
      var raw = localStorage.getItem(LS_ALIAS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function setAlias(apiDepot, localNameOrNull) {
    var a = getAliases();
    var key = normalize(apiDepot);
    if (localNameOrNull === "" || localNameOrNull === undefined) delete a[key];
    else a[key] = localNameOrNull;
    try { localStorage.setItem(LS_ALIAS_KEY, JSON.stringify(a)); } catch (e) {}
    return a;
  }

  /* ---------------- fleet fetching ---------------- */

  function fetchOperatorFleet(operatorId, onPage) {
    var out = [];
    var url = API_BASE + "/operator/fleet/?format=json&limit=" + PAGE_LIMIT + "&operator=" + encodeURIComponent(operatorId);
    function step() {
      return fetchJson(url).then(function (d) {
        var rows = d.results || [];
        out = out.concat(rows);
        if (onPage) onPage(rows.length, d.count, url);
        if (d.next) {
          url = d.next.replace(/^http:/, "https:");
          if (url.indexOf("format=json") === -1) url += (url.indexOf("?") === -1 ? "?" : "&") + "format=json";
          return step();
        }
        return { vehicles: out, total: d.count };
      });
    }
    return step();
  }

  /* ---------------- demand data: routes + timetables per operator ----------------
   * Route inventory comes from /operator/route/ (operator_code filter).
   * Trips/day comes from /get_timetables/ (route_id) + /get_trip_times/
   * (timetable_id), counting departures × days-covered/7. Cached in
   * localStorage; timetables change rarely so cache is king. */

  var LS_DEMAND_KEY = "sc_db_v2_mbt_demand";
  var WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  function getDemandCache() {
    try {
      var raw = localStorage.getItem(LS_DEMAND_KEY);
      var c = raw ? JSON.parse(raw) : null;
      return (c && c.routes && c.timetables) ? c : { routes: {}, timetables: {} };
    } catch (e) { return { routes: {}, timetables: {} }; }
  }

  function setDemandCache(c) {
    try { localStorage.setItem(LS_DEMAND_KEY, JSON.stringify(c)); } catch (e) {}
  }

  function parseTimetableDays(label) {
    var m = String(label || "").match(/\(([^)]+)\)/);
    if (!m) return 7;
    var days = [];
    m[1].split(",").forEach(function (tok) {
      var t = tok.trim();
      var rg = t.match(/(\w+)\s*(?:to|-)\s*(\w+)/);
      if (rg) {
        var a = WEEKDAYS.indexOf(rg[1]), b = WEEKDAYS.indexOf(rg[2]);
        if (a >= 0 && b >= 0) {
          for (var i = a; i <= b; i++) { if (days.indexOf(WEEKDAYS[i]) === -1) days.push(WEEKDAYS[i]); }
        }
      } else {
        var d = null;
        for (var j = 0; j < WEEKDAYS.length; j++) {
          if (WEEKDAYS[j].toLowerCase() === t.toLowerCase()) { d = WEEKDAYS[j]; break; }
        }
        if (d && days.indexOf(d) === -1) days.push(d);
      }
    });
    return days.length || 7;
  }

  function fetchDemandRoutes(opCode) {
    var out = [];
    var url = API_BASE + "/operator/route/?format=json&limit=100&operator_code=" + encodeURIComponent(opCode);
    function step() {
      return fetchJson(url).then(function (d) {
        (d.results || []).forEach(function (r) {
          var det = (r.route_details && r.route_details.details) || {};
          out.push({
            id: r.id,
            num: String(r.route_num === undefined || r.route_num === null ? "" : r.route_num),
            name: String(r.route_name || ""),
            inbound: String(r.inbound_destination || ""),
            outbound: String(r.outbound_destination || ""),
            school: det.school_service === "true" || det.school_service === true
          });
        });
        if (d.next) {
          url = String(d.next).replace(/^http:/, "https:");
          return step();
        }
        var c = getDemandCache();
        c.routes[opCode] = { at: new Date().toISOString(), list: out };
        setDemandCache(c);
        return out;
      });
    }
    return step();
  }

  function fetchRouteTrips(routeId) {
    return fetchJson(API_BASE + "/get_timetables/?format=json&route_id=" + encodeURIComponent(routeId)).then(function (d) {
      var tables = (d && d.timetables) || {};
      var ids = Object.keys(tables);
      var chain = Promise.resolve();
      var out = [];
      ids.forEach(function (id) {
        chain = chain.then(function () {
          return fetchJson(API_BASE + "/get_trip_times/?format=json&timetable_id=" + encodeURIComponent(id)).then(function (t) {
            var deps = (t && t.times) ? Object.keys(t.times) : [];
            out.push({ id: id, label: tables[id], days: parseTimetableDays(tables[id]), trips: deps.length, deps: deps });
          }).catch(function () {
            out.push({ id: id, label: tables[id], days: parseTimetableDays(tables[id]), trips: 0, deps: [] });
          });
        });
      });
      return chain.then(function () {
        var c = getDemandCache();
        c.timetables[routeId] = { at: new Date().toISOString(), tables: out };
        setDemandCache(c);
        return out;
      });
    });
  }

  /* Distinct operators (other than you) serving routes that match a
   * place name — i.e. the real-life competition in that area. */
  function fetchCompetitorOperators(term) {
    var url = API_BASE + "/operator/route/?format=json&limit=20&search=" + encodeURIComponent(term);
      return fetchJson(url).then(function (d) {
        var ops = {};
        (d.results || []).forEach(function (r) {
          (r.route_operators_data || []).forEach(function (o) {
            var code = o && (o.operator_code || o.code);
            if (code) ops[code] = { code: code, name: o.operator_name || o.name || "", slug: o.operator_slug || o.slug || "" };
          });
        });
        return Object.keys(ops).map(function (k) { return ops[k]; });
      });
  }

  function fetchAllOperators(ids, onProgress) {
    var ops = getOperators().filter(function (o) { return ids.indexOf(o.id) !== -1; });
    var all = [];
    var perOperator = [];
    var chain = Promise.resolve();
    ops.forEach(function (op) {
      chain = chain.then(function () {
        if (onProgress) onProgress("Fetching " + op.code + " — " + op.name + "…");
        return fetchOperatorFleet(op.id).then(function (r) {
          r.vehicles.forEach(function (v) { v._mbtOperator = { id: op.id, code: op.code, name: op.name, slug: op.slug }; });
          all = all.concat(r.vehicles);
          perOperator.push({ code: op.code, name: op.name, id: op.id, fetched: r.vehicles.length, expected: r.total });
          if (onProgress) onProgress("Fetched " + op.code + ": " + r.vehicles.length + " vehicles.");
        }).catch(function (e) {
          console.error("[MBT] fetch failed for " + op.code, e);
          perOperator.push({ code: op.code, name: op.name, id: op.id, fetched: 0, expected: null, error: String(e && e.message || e) });
          if (onProgress) onProgress("FAILED " + op.code + ": " + (e && e.message || e));
        });
      });
    });
    return chain.then(function () { return { vehicles: all, perOperator: perOperator }; });
  }

  function parsePastedJson(text) {
    var d = JSON.parse(text);
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.results)) return d.results;
    throw new Error("Paste either a JSON array of vehicles or a full API response object with a results array.");
  }

  /* ---------------- mapping ---------------- */

  function categoryFor(apiVehicle, idNum) {
    if (isEquipmentType(apiVehicle)) return "ETM";
    var vtd = apiVehicle.vehicle_type_data || null;
    if (vtd && vtd.type === "Train") return "Coach";
    if (vtd && vtd.double_decker) return "Decker";
    if (typeof idNum === "number") {
      if (idNum < 200) return "Training";
      if (idNum < 2000) return "Mini/Midi";
      if (idNum >= 3000 && idNum < 4000) return "Decker";
      if (idNum >= 4000) return "Coach";
      return "Single";
    }
    return "Single";
  }

  function liveryFor(apiVehicle) {
    var bits = [];
    if (apiVehicle.branding) bits.push(apiVehicle.branding);
    if (apiVehicle.livery && apiVehicle.livery.name) bits.push(apiVehicle.livery.name);
    return bits.join(" — ");
  }

  function groupByDepot(vehicles, includeOutOfService) {
    var groups = {};
    var fallbacks = {};
    try {
      getOperators().forEach(function (o) {
        if (o.fallbackDepot) fallbacks[o.id] = o.fallbackDepot;
      });
    } catch (e) {}
    vehicles.forEach(function (v) {
      if (isEquipmentType(v)) return;
      if (!includeOutOfService && v.in_service === false) return;
      var raw = String(v.depot || "").trim();
      if (!raw && v._mbtOperator && fallbacks[v._mbtOperator.id]) {
        raw = fallbacks[v._mbtOperator.id]; // e.g. blank-depot Yard vehicles -> "Yard"
      }
      var key = normalize(raw) || "__unallocated__";
      if (!groups[key]) groups[key] = { apiDepot: raw || UNALLOCATED, count: 0, vehicles: [] };
      groups[key].count++;
      groups[key].vehicles.push(v);
    });
    return Object.keys(groups).map(function (k) { return groups[k]; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  function findDepot(depots, apiDepot) {
    var n = normalize(apiDepot);
    if (!n || n === "__unallocated__") return null;
    for (var i = 0; i < depots.length; i++) {
      if (normalize(depots[i].name) === n) return { index: i, depot: depots[i] };
    }
    // tolerate trailing " depot/garage/yard"
    var stripped = n.replace(/\s+(depot|garage|bus depot|bus garage)$/, "");
    for (var j = 0; j < depots.length; j++) {
      if (normalize(depots[j].name) === stripped) return { index: j, depot: depots[j] };
    }
    return null;
  }

  function matchDepots(groups, depots, aliases) {
    aliases = aliases || getAliases();
    return groups.map(function (g) {
      var isUnallocated = normalize(g.apiDepot) === normalize(UNALLOCATED) || !String(g.apiDepot || "").trim();
      // User alias override first ("Baschurch" -> "Shifnal", etc.)
      var aliasHit = null;
      if (!isUnallocated && Object.prototype.hasOwnProperty.call(aliases, normalize(g.apiDepot))) {
        var target = aliases[normalize(g.apiDepot)];
        if (target) {
          for (var a = 0; a < depots.length; a++) {
            if (normalize(depots[a].name) === normalize(target)) { aliasHit = { index: a, depot: depots[a] }; break; }
          }
          if (!aliasHit) aliasHit = { index: -1, depot: { name: target } }; // target depot may itself be created on apply
        }
      }
      if (aliasHit && aliasHit.index >= 0) {
        return { apiDepot: g.apiDepot, count: g.count, matchedIndex: aliasHit.index, matchedName: aliasHit.depot.name, isNew: false, isUnallocated: false, viaAlias: true };
      }
      if (aliasHit && aliasHit.index < 0) {
        // Alias points at a depot row that does not exist yet — it will be created on apply.
        return { apiDepot: g.apiDepot, count: g.count, matchedIndex: -1, matchedName: aliasHit.depot.name, createAs: aliasHit.depot.name, isNew: true, isUnallocated: false, viaAlias: true };
      }
      var hit = isUnallocated ? null : findDepot(depots, g.apiDepot);
      return {
        apiDepot: isUnallocated ? UNALLOCATED : g.apiDepot,
        count: g.count,
        matchedIndex: hit ? hit.index : -1,
        matchedName: hit ? hit.depot.name : (aliasHit ? aliasHit.depot.name : null),
        isNew: !hit && !aliasHit,
        isUnallocated: isUnallocated
      };
    });
  }

  function avgPerBus() {
    var seed = (window.INITIAL_STATE && window.INITIAL_STATE.depots) || [];
    var rev = 0, exp = 0, n = 0;
    seed.forEach(function (d) { rev += d.baseIncome; exp += d.baseExpenses; n += d.vehicles; });
    if (!n) return { rev: 1000, exp: 700 };
    return { rev: rev / n, exp: exp / n };
  }

  // Ticket machines are equipment, not vehicles: they get an "ETM" registry
  // entry (no engine/gearbox/depot/livery) and never count toward depots.
  var EQUIPMENT_TYPES = ["spare ticket machine", "handheld ticket machine"];

  function isEquipmentType(apiVehicle) {
    var t = String((apiVehicle.vehicle_type_data && apiVehicle.vehicle_type_data.type_name) || apiVehicle.type || "").toLowerCase().trim();
    return EQUIPMENT_TYPES.indexOf(t) !== -1;
  }

  function isSkippedType(apiVehicle) { return isEquipmentType(apiVehicle); }

  function drivetrainFor(typeName) {
    var db = window.DB_SEED_DRIVETRAIN_SPECS || {};
    return db[typeName] || null;
  }

  function mapVehicle(apiVehicle, specs) {
    var fleetStr = String(apiVehicle.fleet_number === undefined || apiVehicle.fleet_number === null ? "" : apiVehicle.fleet_number).trim();
    var parsed = parseFleetId(fleetStr);
    var type = (apiVehicle.vehicle_type_data && apiVehicle.vehicle_type_data.type_name) || apiVehicle.type_details || "Unknown Type";
    var spec = (specs || {})[type] || null;
    var dt = drivetrainFor(type);
    // Engine/gearbox come from the Fleet API when present: per-vehicle
    // `engine`/`gearbox` first, then `vehicle_type_data`, falling back to
    // the local drivetrain/vehicle specs (and their defaults).
    var apiEngine = String(apiVehicle.engine || "").trim() ||
      String((apiVehicle.vehicle_type_data && apiVehicle.vehicle_type_data.engine) || "").trim();
    var apiGearbox = String(apiVehicle.gearbox || "").trim() ||
      String((apiVehicle.vehicle_type_data && apiVehicle.vehicle_type_data.gearbox) || "").trim();
    var liv = apiVehicle.livery || null;
    var etm = isEquipmentType(apiVehicle);
    var cat = categoryFor(apiVehicle, parsed.idNum);
    // Cross-check the Euro standard: registration year decoded from the
    // plate, banded for the fuel/engine (minibuses use light-duty dates).
    // Falls back to the drivetrain DB when the plate gives no year.
    var regYear = regYearFromPlate(apiVehicle.reg);
    var apiFuel = (apiVehicle.vehicle_type_data && apiVehicle.vehicle_type_data.fuel) || "";
    var mini = (cat === "Mini/Midi") || /sprinter|transit|mellor|treo|strata|\bevm\b|minibus/i.test(type);
    var computedEuro = euroFromYearFuel(regYear, apiFuel, (apiEngine || "") + " " + type, mini);
    return {
      id: parsed.id,
      idNum: parsed.idNum,
      fleetNumberRaw: fleetStr,
      reg: String(apiVehicle.reg || "").trim().toUpperCase(),
      type: type,
      cat: cat,
      livery: etm ? "" : liveryFor(apiVehicle),
      liveryCssL: etm ? null : (liv && liv.left_css ? liv.left_css : null),
      liveryCssR: etm ? null : (liv && liv.right_css ? liv.right_css : null),
      liveryColour: etm ? "" : (liv && liv.colour ? liv.colour : ""),
      liveryText: etm ? "" : (liv && liv.text_colour ? liv.text_colour : ""),
      liveryStroke: etm ? "" : (liv && liv.stroke_colour ? liv.stroke_colour : ""),
      engine: etm ? "" : (apiEngine || ((dt && dt.engine && dt.engine !== "—") ? dt.engine : (spec ? spec.engine : "Euro VI Standard"))),
      gearbox: etm ? "" : (apiGearbox || ((dt && dt.gearbox && dt.gearbox !== "—") ? dt.gearbox : (spec ? spec.gearbox : "ZF EcoLife / Voith"))),
      euro: etm ? "" : (computedEuro || ((dt && dt.euro) || "")),
      euroYear: etm ? null : regYear,
      fuel: (apiVehicle.vehicle_type_data && apiVehicle.vehicle_type_data.fuel) || "",
      depot: etm ? "" : (String(apiVehicle.depot || "").trim() || UNALLOCATED),
      inService: apiVehicle.in_service !== false,
      operatorCode: (apiVehicle._mbtOperator && apiVehicle._mbtOperator.code) || "",
      operatorName: (apiVehicle._mbtOperator && apiVehicle._mbtOperator.name) || ((apiVehicle.operator && apiVehicle.operator.operator_name) || ""),
      mbtId: apiVehicle.id
    };
  }

  /* ---------------- apply ---------------- */

  function getLastSync() {
    try {
      var raw = localStorage.getItem(LS_SYNC_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function setLastSync(info) {
    try { localStorage.setItem(LS_SYNC_KEY, JSON.stringify(info)); } catch (e) {}
  }

  function applySync(vehicles, opts) {
    opts = opts || {};
    var includeOutOfService = opts.includeOutOfService !== false;
    var autoCreate = opts.autoCreateDepots !== false;
    var zeroMissing = !!opts.zeroMissingDepots;

    if (typeof state === "undefined" || !state) throw new Error("App state is not loaded yet.");

    var specs = window.DB_SEED_VEHICLE_SPECS || window.VEHICLE_SPECS || window.DB_SEED_OMSI_SPECS || window.OMSI_SPECS || {};
    var groups = groupByDepot(vehicles, includeOutOfService);
    var depotRows = matchDepots(groups, state.depots);
    var averages = avgPerBus();
    var now = new Date().toISOString();

    var depotsTouched = 0, depotsCreated = [], depotsZeroed = 0;
    var seen = {};

    function setDepotCount(depotObj, idx, count) {
      // Two API groups can map onto one local depot (via alias mapping) — add, don't overwrite.
      if (seen[idx]) depotObj.vehicles += count;
      else { depotObj.vehicles = count; seen[idx] = true; }
      depotObj.source = "mybustimes";
      depotObj.mbtUpdatedAt = now;
      depotsTouched++;
    }

    depotRows.forEach(function (row) {
      if (row.isUnallocated) {
        var una = null;
        for (var i = 0; i < state.depots.length; i++) {
          if (normalize(state.depots[i].name) === normalize(UNALLOCATED)) { una = state.depots[i]; break; }
        }
        if (!una && autoCreate) {
          una = { name: UNALLOCATED, vehicles: 0, baseIncome: 0, baseExpenses: 0, rent: 0, source: "mybustimes", zeroFinance: true };
          state.depots.push(una);
          depotsCreated.push(UNALLOCATED);
        }
        if (una) setDepotCount(una, state.depots.indexOf(una), row.count);
        return;
      }
      if (row.matchedIndex >= 0) {
        setDepotCount(state.depots[row.matchedIndex], row.matchedIndex, row.count);
      } else if (autoCreate) {
        // Alias targets may name a depot that was created earlier in this same loop — re-resolve first.
        var wantName = row.createAs || row.apiDepot;
        var hit2 = findDepot(state.depots, wantName);
        if (hit2) {
          setDepotCount(state.depots[hit2.index], hit2.index, row.count);
        } else {
          state.depots.push({
            name: wantName,
            vehicles: row.count,
            baseIncome: Math.round(averages.rev * row.count * 100) / 100,
            baseExpenses: Math.round(averages.exp * row.count * 100) / 100,
            staffSplit: true,
            rent: 0,
            source: "mybustimes",
            mbtUpdatedAt: now
          });
          depotsCreated.push(wantName);
          depotsTouched++;
        }
      }
    });

    if (zeroMissing) {
      state.depots.forEach(function (d) {
        var idx = state.depots.indexOf(d);
        if (!seen[idx] && normalize(d.name) !== normalize(UNALLOCATED) && d.source === "mybustimes") {
          if (d.vehicles !== 0) { d.vehicles = 0; depotsZeroed++; }
        }
      });
    }

    var added = 0, updated = 0, skipped = 0;
    vehicles.forEach(function (apiV) {
      if (!includeOutOfService && apiV.in_service === false) { skipped++; return; }
      var m = mapVehicle(apiV, specs);
      if (!m.fleetNumberRaw && !m.reg) { skipped++; return; }

      var existing = null;
      if (m.idNum !== null) {
        for (var i = 0; i < state.fleetRegistry.length; i++) {
          var e = state.fleetRegistry[i];
          if (String(e.id) === String(m.idNum)) { existing = e; break; }
        }
      }
      if (!existing && m.reg) {
        var nr = normalizeReg(m.reg);
        for (var j = 0; j < state.fleetRegistry.length; j++) {
          if (normalizeReg(state.fleetRegistry[j].reg) === nr) { existing = state.fleetRegistry[j]; break; }
        }
      }

      if (existing) {
        if (m.reg) existing.reg = m.reg;
        existing.type = m.type;
        existing.cat = m.cat;
        if (m.livery) existing.livery = m.livery;
        if (m.liveryCssL) {
          existing.liveryCssL = m.liveryCssL;
          existing.liveryCssR = m.liveryCssR;
          existing.liveryColour = m.liveryColour;
          existing.liveryText = m.liveryText;
          existing.liveryStroke = m.liveryStroke;
        }
        if (m.euro) { existing.euro = m.euro; existing.euroYear = m.euroYear; }
        if (m.engine) existing.engine = m.engine;
        if (m.gearbox) existing.gearbox = m.gearbox;
        existing.depot = m.depot;
        existing.operatorCode = m.operatorCode;
        existing.operatorName = m.operatorName;
        if (m.fuel) existing.fuel = m.fuel;
        existing.inService = m.inService;
        existing.mbtId = m.mbtId;
        existing.mbtUpdatedAt = now;
        updated++;
      } else {
        state.fleetRegistry.push({
          id: m.id,
          reg: m.reg || "UNREG",
          type: m.type,
          cat: m.cat,
          livery: m.livery || (m.cat === "ETM" ? "" : "Swift Connect Standard"),
          liveryCssL: m.liveryCssL,
          liveryCssR: m.liveryCssR,
          liveryColour: m.liveryColour,
          liveryText: m.liveryText,
          liveryStroke: m.liveryStroke,
          engine: m.engine,
          gearbox: m.gearbox,
          euro: m.euro,
          euroYear: m.euroYear,
          fuel: m.fuel,
          depot: m.depot,
          operatorCode: m.operatorCode,
          operatorName: m.operatorName,
          inService: m.inService,
          mbtId: m.mbtId,
          mbtUpdatedAt: now
        });
        added++;
      }
    });

    // keep registry in a stable order: numeric ids ascending, then string ids
    state.fleetRegistry.sort(function (a, b) {
      var an = typeof a.id === "number", bn = typeof b.id === "number";
      if (an && bn) return a.id - b.id;
      if (an) return -1;
      if (bn) return 1;
      return String(a.id).localeCompare(String(b.id));
    });

    if (typeof saveState === "function") saveState();

    var summary = {
      at: now,
      vehiclesFetched: vehicles.length,
      depotsTouched: depotsTouched,
      depotsCreated: depotsCreated,
      depotsZeroed: depotsZeroed,
      fleetAdded: added,
      fleetUpdated: updated,
      fleetSkipped: skipped,
      registryTotal: state.fleetRegistry.length
    };
    setLastSync(summary);

    if (typeof renderAll === "function") renderAll();
    if (typeof renderMbtPanel === "function") renderMbtPanel();
    if (opts.switchToDepots !== false && typeof switchTab === "function") { try { switchTab("depots"); } catch (e) {} }
    return summary;
  }

  /* ---------------- UI panel ---------------- */

  function esc(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMbtPanel() {
    if (typeof document === "undefined") return;
    var ops = getOperators();
    var tbody = document.getElementById("mbt-operator-tbody");
    if (tbody) {
      tbody.innerHTML = ops.map(function (o) {
        return '<tr class="hover:bg-slate-800/40">' +
          '<td class="py-2 px-3 mono font-bold text-sky-400">' + esc(o.code) + '</td>' +
          '<td class="py-2 px-3 text-white">' + esc(o.name || "—") + '</td>' +
          '<td class="py-2 px-3 mono text-slate-400">' + esc(o.id) + '</td>' +
          '<td class="py-2 px-3 mono text-slate-500">' + esc(o.slug || "") + '</td>' +
          '<td class="py-2 px-3 text-slate-400 text-[11px]">' + esc((o.depotHint || []).join(", ")) + '</td>' +
          '<td class="py-2 px-3 text-right">' +
          '<button onclick="mbtRemoveOperator(\'' + esc(o.code) + '\')" class="text-xs text-rose-400 hover:text-rose-300 px-2 py-1">Remove</button>' +
          '</td></tr>';
      }).join("");
    }
    var count = document.getElementById("mbt-operator-count");
    if (count) count.textContent = ops.length + " operators";
    var last = getLastSync();
    var lastEl = document.getElementById("mbt-last-sync");
    if (lastEl) {
      lastEl.textContent = last
        ? ("Last sync: " + last.vehiclesFetched + " fetched · +" + last.fleetAdded + " / ~" + last.fleetUpdated + " fleet · " + last.depotsTouched + " depots (" + last.at.slice(0, 16).replace("T", " ") + ")")
        : "Not synced yet.";
    }
  }

  /* ---------------- UI glue (onclick handlers for the sync panel) ---------------- */

  function toast(msg, icon) {
    if (typeof showToast === "function") showToast(msg, icon || "✅");
  }

  function mbtLog(msg) {
    var el = typeof document !== "undefined" ? document.getElementById("mbt-log") : null;
    if (!el) return;
    var d = new Date();
    var t = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    var div = document.createElement("div");
    div.textContent = "[" + t + "] " + msg;
    el.appendChild(div);
    while (el.children.length > 80) el.removeChild(el.firstChild);
    el.scrollTop = el.scrollHeight;
  }

  function readOpts() {
    function checked(id, def) {
      var el = typeof document !== "undefined" ? document.getElementById(id) : null;
      return el ? !!el.checked : def;
    }
    return {
      includeOutOfService: checked("mbt-opt-outofservice", true),
      autoCreateDepots: checked("mbt-opt-autocreate", true),
      zeroMissingDepots: checked("mbt-opt-zeromissing", false)
    };
  }

  function setBusy(busy) {
    ["mbt-fetch-btn", "mbt-fetch-apply-btn", "mbt-apply-btn", "mbt-refresh-btn"].forEach(function (id) {
      var el = typeof document !== "undefined" ? document.getElementById(id) : null;
      if (el) el.disabled = busy;
    });
    var s = typeof document !== "undefined" ? document.getElementById("mbt-status") : null;
    if (s) s.textContent = busy ? "Working…" : "Idle";
  }

  function localDepotOptions(selected) {
    var depots = [];
    try { depots = (typeof state !== "undefined" && state) ? state.depots : []; } catch (e) {}
    return depots.map(function (d) {
      return '<option value="' + esc(d.name) + '"' + (d.name === selected ? " selected" : "") + '>' + esc(d.name) + '</option>';
    }).join("");
  }

  function stageResults(res) {
    window._mbtStaged = res;
    var opts = readOpts();
    var depots = (typeof state !== "undefined" && state) ? state.depots : [];
    var rows = matchDepots(groupByDepot(res.vehicles, opts.includeOutOfService), depots);

    var dt = typeof document !== "undefined" ? document.getElementById("mbt-depot-preview-tbody") : null;
    if (dt) {
      dt.innerHTML = rows.map(function (r) {
        var badge = r.isNew
          ? '<span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[11px] font-semibold">NEW depot</span>'
          : '<span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold">match</span>';
        var mapCell;
        if (!r.isNew || r.isUnallocated) {
          mapCell = r.matchedName ? esc(r.matchedName) : '<span class="text-slate-500">—</span>';
        } else {
          // Unknown API depot name: let the user merge it into an existing depot instead of creating a new row.
          mapCell = '<select onchange="mbtSetAlias(this)" data-api-depot="' + esc(r.apiDepot) + '" ' +
            'class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-amber-300 max-w-[220px]">' +
            '<option value="">— create "' + esc(r.createAs || r.apiDepot) + '" —</option>' +
            localDepotOptions(r.viaAlias ? r.matchedName : null) +
            '</select>';
        }
        return '<tr class="hover:bg-slate-800/40">' +
          '<td class="py-2 px-3 text-white">' + esc(r.apiDepot) + (r.viaAlias ? ' <span class="text-[10px] text-sky-400">via mapping</span>' : '') + '</td>' +
          '<td class="py-2 px-3 text-slate-300">' + mapCell + '</td>' +
          '<td class="py-2 px-3 mono text-right text-sky-400 font-bold">' + r.count + '</td>' +
          '<td class="py-2 px-3 text-right">' + badge + '</td></tr>';
      }).join("") || '<tr><td colspan="4" class="py-3 px-3 text-slate-500">No vehicles.</td></tr>';
    }

    var ft = typeof document !== "undefined" ? document.getElementById("mbt-fleet-preview-tbody") : null;
    if (ft) {
      var specs = window.DB_SEED_VEHICLE_SPECS || window.VEHICLE_SPECS || window.DB_SEED_OMSI_SPECS || window.OMSI_SPECS || {};
      ft.innerHTML = res.vehicles.slice(0, 12).map(function (v) {
        var m = mapVehicle(v, specs);
        return '<tr class="hover:bg-slate-800/40">' +
          '<td class="py-2 px-3 mono text-sky-400 font-bold">' + esc(m.fleetNumberRaw || "—") + '</td>' +
          '<td class="py-2 px-3 mono text-slate-300">' + esc(m.reg || "—") + '</td>' +
          '<td class="py-2 px-3 text-white">' + esc(m.type) + '</td>' +
          '<td class="py-2 px-3 text-slate-300">' + esc(m.engine || "—") + '</td>' +
          '<td class="py-2 px-3 text-slate-300">' + esc(m.gearbox || "—") + '</td>' +
          '<td class="py-2 px-3 text-slate-300">' + esc(m.depot) + '</td>' +
          '<td class="py-2 px-3 mono text-slate-500">' + esc(m.operatorCode) + '</td></tr>';
      }).join("");
      var more = typeof document !== "undefined" ? document.getElementById("mbt-fleet-more") : null;
      if (more) more.textContent = res.vehicles.length > 12 ? ("Showing 12 of " + res.vehicles.length + " fetched vehicles.") : "";
    }

    var pt = typeof document !== "undefined" ? document.getElementById("mbt-perop-tbody") : null;
    if (pt) {
      pt.innerHTML = (res.perOperator || []).map(function (p) {
        return '<tr class="hover:bg-slate-800/40">' +
          '<td class="py-2 px-3 mono font-bold text-sky-400">' + esc(p.code) + '</td>' +
          '<td class="py-2 px-3 text-white">' + esc(p.name) + '</td>' +
          '<td class="py-2 px-3 mono text-right text-slate-300">' + (p.expected === null || p.expected === undefined ? "?" : p.expected) + '</td>' +
          '<td class="py-2 px-3 mono text-right font-bold ' + (p.error ? "text-rose-400" : "text-emerald-400") + '">' +
          (p.error ? esc(p.error) : p.fetched) + '</td></tr>';
      }).join("");
    }

    var apply = typeof document !== "undefined" ? document.getElementById("mbt-apply-btn") : null;
    if (apply) apply.disabled = !res.vehicles.length;
  }

  function mbtFetchFleet() {
    var ops = getOperators();
    var ids = ops.map(function (o) { return o.id; }).filter(function (x) { return !!x; });
    if (!ids.length) { mbtLog("No operators configured. Add operator codes first."); toast("Add at least one operator code first.", "⚠️"); return; }
    setBusy(true);
    window._mbtStaged = null;
    var apply = document.getElementById("mbt-apply-btn");
    if (apply) apply.disabled = true;
    mbtLog("Fetching fleet for " + ids.length + " operators via mybustimes.cc/api/operator/fleet/ …");
    fetchAllOperators(ids, mbtLog).then(function (res) {
      mbtLog("Done: " + res.vehicles.length + " vehicles across " + res.perOperator.length + " operators. Review the preview, then Apply.");
      stageResults(res);
      toast("Fetched " + res.vehicles.length + " vehicles. Review + Apply.", "📥");
    }).catch(function (e) {
      console.error(e);
      mbtLog("Fetch failed: " + (e && e.message || e) + " — the API may block this network; use the paste-JSON fallback below.");
      toast("Fetch failed — see log / paste-JSON fallback.", "⚠️");
    }).then(function () { setBusy(false); });
  }

  function mbtSetAlias(sel) {
    var apiDepot = sel.getAttribute("data-api-depot");
    var target = sel.value || null; // null = create a new depot row
    setAlias(apiDepot, target);
    mbtLog(target
      ? ("Mapping: API depot \u201c" + apiDepot + "\u201d \u2192 local depot \u201c" + target + "\u201d.")
      : ("Mapping cleared for \u201c" + apiDepot + "\u201d — a new depot row will be created on Apply."));
    if (window._mbtStaged) stageResults(window._mbtStaged); // re-preview with the mapping
  }

  function mbtApplyStaged() {
    var staged = window._mbtStaged;
    if (!staged || !staged.vehicles || !staged.vehicles.length) { toast("Nothing to apply — fetch first.", "⚠️"); return; }
    try {
      var summary = applySync(staged.vehicles, readOpts());
      mbtLog("Applied: +" + summary.fleetAdded + " new / ~" + summary.fleetUpdated + " updated fleet entries; " +
        summary.depotsTouched + " depots set" +
        (summary.depotsCreated.length ? " (" + summary.depotsCreated.length + " created: " + summary.depotsCreated.join(", ") + ")" : "") +
        (summary.depotsZeroed ? "; " + summary.depotsZeroed + " zeroed" : "") + ".");
      toast("Depots + Fleet Registry updated from mybustimes!", "🔗");
      if (typeof switchTab === "function") { try { switchTab("depots"); } catch (e) {} }
    } catch (e) {
      console.error(e);
      toast("Apply failed: " + (e && e.message || e), "⚠️");
    }
  }

  function mbtFetchAndApply() {
    var ops = getOperators();
    var ids = ops.map(function (o) { return o.id; }).filter(function (x) { return !!x; });
    if (!ids.length) { mbtLog("No operators configured. Add operator codes first."); toast("Add at least one operator code first.", "⚠️"); return; }
    setBusy(true);
    window._mbtStaged = null;
    mbtLog("Fetching fleet for " + ids.length + " operators, will auto-apply to Depot Network + Fleet Registry…");
    fetchAllOperators(ids, mbtLog).then(function (res) {
      stageResults(res);
      mbtLog("Auto-applying " + res.vehicles.length + " vehicles…");
      mbtApplyStaged();
    }).catch(function (e) {
      console.error(e);
      mbtLog("Fetch failed: " + (e && e.message || e) + " — the API may block this network; use the paste-JSON fallback below.");
      toast("Fetch failed — see log / paste-JSON fallback.", "⚠️");
    }).then(function () { setBusy(false); });
  }

  function mbtUsePastedJson() {
    var ta = document.getElementById("mbt-paste");
    if (!ta || !ta.value.trim()) { toast("Paste fleet JSON first.", "⚠️"); return; }
    try {
      var vehicles = parsePastedJson(ta.value);
      mbtLog("Pasted JSON parsed: " + vehicles.length + " vehicles.");
      stageResults({ vehicles: vehicles, perOperator: [{ code: "PASTE", name: "Pasted JSON", id: "-", fetched: vehicles.length, expected: vehicles.length }] });
      toast("Staged " + vehicles.length + " pasted vehicles. Review + Apply.", "📥");
    } catch (e) {
      toast("Invalid JSON: " + (e && e.message || e), "⚠️");
    }
  }

  function mbtClearStaged() {
    window._mbtStaged = null;
    var apply = document.getElementById("mbt-apply-btn");
    if (apply) apply.disabled = true;
    ["mbt-depot-preview-tbody", "mbt-fleet-preview-tbody", "mbt-perop-tbody"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });
    mbtLog("Staged results cleared.");
  }

  function mbtAddOperator() {
    var input = document.getElementById("mbt-add-code");
    var code = input ? input.value : "";
    setBusy(true);
    addOperatorByCode(code).then(function (entry) {
      if (input) input.value = "";
      renderMbtPanel();
      mbtLog("Added operator " + entry.code + " — " + entry.name + " (ID " + entry.id + ").");
      toast("Operator " + entry.code + " added!", "✅");
    }).catch(function (e) {
      mbtLog("Add failed: " + (e && e.message || e));
      toast(String((e && e.message) || e), "⚠️");
    }).then(function () { setBusy(false); });
  }

  function mbtRemoveOperator(code) {
    var ops = getOperators().filter(function (o) { return o.code !== code; });
    saveOperators(ops);
    renderMbtPanel();
    mbtLog("Removed operator " + code + ".");
  }

  function mbtRefreshNames() {
    setBusy(true);
    refreshOperatorNames(mbtLog).then(function (r) {
      renderMbtPanel();
      mbtLog(r.updated.length ? ("Names refreshed: " + r.updated.join(", ") + ".") : "Refresh done (no changes).");
      toast("Operator names refreshed from API.", "✅");
    }).catch(function (e) {
      mbtLog("Refresh failed: " + (e && e.message || e));
    }).then(function () { setBusy(false); });
  }

  function mbtResetOperators() {
    if (!confirm("Reset the operator list to the 11 Swift Connect defaults?")) return;
    resetOperators();
    renderMbtPanel();
    mbtLog("Operator list reset to defaults.");
  }

  window.MBT = {
    API_BASE: API_BASE,
    UNALLOCATED: UNALLOCATED,
    getOperators: getOperators,
    saveOperators: saveOperators,
    resetOperators: resetOperators,
    refreshOperatorNames: refreshOperatorNames,
    addOperatorByCode: addOperatorByCode,
    fetchOperatorFleet: fetchOperatorFleet,
    fetchDemandRoutes: fetchDemandRoutes,
    fetchRouteTrips: fetchRouteTrips,
    fetchCompetitorOperators: fetchCompetitorOperators,
    getDemandCache: getDemandCache,
    parseTimetableDays: parseTimetableDays,
    fetchAllOperators: fetchAllOperators,
    parsePastedJson: parsePastedJson,
    groupByDepot: groupByDepot,
    matchDepots: matchDepots,
    mapVehicle: mapVehicle,
    getAliases: getAliases,
    setAlias: setAlias,
    applySync: applySync,
    getLastSync: getLastSync,
    renderMbtPanel: renderMbtPanel,
    esc: esc,
    drivetrainFor: drivetrainFor,
    isEquipmentType: isEquipmentType,
    isSkippedType: isSkippedType
  };
  window.renderMbtPanel = renderMbtPanel;
  window.mbtFetchFleet = mbtFetchFleet;
  window.mbtFetchAndApply = mbtFetchAndApply;
  window.mbtApplyStaged = mbtApplyStaged;
  window.mbtSetAlias = mbtSetAlias;
  window.mbtUsePastedJson = mbtUsePastedJson;
  window.mbtClearStaged = mbtClearStaged;
  window.mbtAddOperator = mbtAddOperator;
  window.mbtRemoveOperator = mbtRemoveOperator;
  window.mbtRefreshNames = mbtRefreshNames;
  window.mbtResetOperators = mbtResetOperators;
})();
