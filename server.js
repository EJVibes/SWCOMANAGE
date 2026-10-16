/* =========================================================================
 * Swift Connect — local persistence server (dev / self-hosted)
 *
 * The static site cannot write database/*.js on its own, so this tiny
 * dependency-free Node server does it:
 *   - serves the app (index.html, database/, icons/) over HTTP
 *   - POST /api/save-all  writes every collection back to its seed file
 *   - GET  /api/status    tells the app the disk backend is live
 *
 * Every overwrite is backed up to database/backups/ first (newest 20 kept
 * per table). Run with:  node server.js   (env: PORT, HOST, SWCO_ROOT)
 * ========================================================================= */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = process.env.SWCO_ROOT || __dirname;
const HOST = process.env.HOST || "127.0.0.1";
const PORT = parseInt(process.env.PORT, 10) || 8080;
const MAX_BODY = 25 * 1024 * 1024;

// Collection -> seed file + global the app reads on boot.
const TABLES = {
  meta:              { file: "database/meta.js",                 seed: "DB_SEED_META" },
  transactions:      { file: "database/transactions.js",        seed: "DB_SEED_TRANSACTIONS" },
  depots:            { file: "database/depots.js",               seed: "DB_SEED_DEPOTS" },
  busCatalogue:      { file: "database/bus-catalogue.js",       seed: "DB_SEED_BUS_CATALOGUE" },
  fleetRegistry:     { file: "database/fleet-registry.js",      seed: "DB_SEED_FLEET_REGISTRY" },
  fares: { file: "database/fares.js",               seed: "DB_SEED_FARES" },
  overheads: { file: "database/overheads.js",           seed: "DB_SEED_OVERHEADS" },
  staffing: { file: "database/staffing.js",            seed: "DB_SEED_STAFFING" },
  workshopQueue:     { file: "database/workshop-queue.js",      seed: "DB_SEED_WORKSHOP_QUEUE" },
  workshopCompleted: { file: "database/workshop-completed.js",  seed: "DB_SEED_WORKSHOP_COMPLETED" },
  mbtOperators:      { file: "database/mybustimes-operators.js", seed: "DB_SEED_MBT_OPERATORS" }
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const chunks = [];
    req.on("data", c => {
      bytes += c.length;
      if (bytes > MAX_BODY) { reject(new Error("body too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function backupFile(absPath, table) {
  if (!fs.existsSync(absPath)) return null;
  const dir = path.join(ROOT, "database", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const name = `${table}-${stamp()}.js`;
  fs.copyFileSync(absPath, path.join(dir, name));
  // Keep newest 20 per table.
  const others = fs.readdirSync(dir)
    .filter(f => f.startsWith(table + "-") && f.endsWith(".js"))
    .sort();
  while (others.length > 20) {
    try { fs.unlinkSync(path.join(dir, others.shift())); } catch (e) { break; }
  }
  return name;
}

function writeTable(table, value) {
  const def = TABLES[table];
  if (!def) throw new Error("unknown table: " + table);
  const absPath = path.join(ROOT, def.file);
  const backup = backupFile(absPath, table);
  const content =
    `/* Swift Connect — database: ${table} (written by local server ${new Date().toISOString()}) */\n` +
    `window.${def.seed} = ${JSON.stringify(value, null, 2)};\n`;
  const tmp = absPath + ".tmp";
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, absPath);
  return { table, file: def.file, backup };
}

function tableStatus() {
  const out = {};
  for (const [table, def] of Object.entries(TABLES)) {
    try {
      const st = fs.statSync(path.join(ROOT, def.file));
      out[table] = { file: def.file, mtime: st.mtimeMs, bytes: st.size };
    } catch (e) {
      out[table] = { file: def.file, mtime: null, bytes: 0 };
    }
  }
  return out;
}

function serveStatic(req, res) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split("?")[0]);
  } catch (e) {
    res.writeHead(400); res.end("bad url"); return;
  }
  if (urlPath === "/") urlPath = "/index.html";
  const absPath = path.normalize(path.join(ROOT, urlPath));
  if (absPath !== ROOT && !absPath.startsWith(ROOT + path.sep)) {
    res.writeHead(403); res.end("forbidden"); return;
  }
  fs.stat(absPath, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(absPath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(absPath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url.split("?")[0] === "/api/status") {
      sendJson(res, 200, { ok: true, server: true, now: Date.now(), tables: tableStatus() });
      return;
    }
    if (req.method === "POST" && req.url.split("?")[0] === "/api/save-all") {
      let data;
      try {
        data = JSON.parse(await readBody(req));
      } catch (e) {
        sendJson(res, 400, { ok: false, error: "invalid JSON body" });
        return;
      }
      if (!data || typeof data !== "object") {
        sendJson(res, 400, { ok: false, error: "object body required" });
        return;
      }
      const saved = [];
      for (const table of Object.keys(TABLES)) {
        if (data[table] !== undefined) saved.push(writeTable(table, data[table]));
      }
      console.log(`[save-all] ${saved.map(s => s.table).join(", ")}`);
      sendJson(res, 200, { ok: true, saved: saved.map(s => s.table), at: Date.now() });
      return;
    }
    if (req.method === "GET" || req.method === "HEAD") {
      serveStatic(req, res);
      return;
    }
    res.writeHead(405); res.end("method not allowed");
  } catch (e) {
    console.error("[error]", e.message);
    try { sendJson(res, 500, { ok: false, error: e.message }); } catch (e2) {}
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Swift Connect server live at http://${HOST}:${PORT}/  (root: ${ROOT})`);
});
