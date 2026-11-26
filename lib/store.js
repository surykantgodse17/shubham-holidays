const fs = require("fs");
const os = require("os");
const path = require("path");

const file = process.env.DATA_FILE
  || (process.env.VERCEL
    ? path.join(os.tmpdir(), "shubham-holidays-store.json")
    : path.join(__dirname, "..", "data", "store.json"));

let memory = null;

const empty = () => ({ sessions: {}, bookings: [], points: {} });

function normalize(parsed) {
  if (!parsed || typeof parsed !== "object") return empty();
  parsed.sessions = parsed.sessions || {};
  parsed.bookings = Array.isArray(parsed.bookings) ? parsed.bookings : [];
  parsed.points = parsed.points && typeof parsed.points === "object" ? parsed.points : {};
  return parsed;
}

function read() {
  if (memory) return JSON.parse(JSON.stringify(memory));
  try {
    return normalize(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch (error) {
    if (error.code === "ENOENT") return empty();
    throw error;
  }
}

function write(data) {
  memory = JSON.parse(JSON.stringify(data));
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
  } catch (error) {
    if (error.code === "EROFS" || error.code === "EPERM" || error.code === "EACCES") return;
    throw error;
  }
}

let chain = Promise.resolve();

function update(mutator) {
  const run = chain.then(() => {
    const data = read();
    const result = mutator(data);
    write(data);
    return result;
  });
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function snapshot() {
  return read();
}

module.exports = { update, snapshot };
