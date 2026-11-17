const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, '../data/db.json');
function defaultDB() {
  return { users: [], businesses: [], services: [], bookings: [], team: [], availability: [], emails: [], clients: [] };
}
function load() {
  try { if (!fs.existsSync(DB_PATH)) { fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB(), null, 2)); } return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return defaultDB(); }
}
function save(db) { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }
module.exports = { load, save, DB_PATH };
