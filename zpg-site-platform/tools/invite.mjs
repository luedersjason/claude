// Usage: node tools/invite.mjs "<id>" "<Full Name>" "<email>" "<Company>" <admin|editor|viewer> [site-url]
// Prints the SQL to add the person (run it with wrangler d1 execute ... --remote --command) and their personal invite link.
import { createHash, randomBytes } from "node:crypto";
const [id, name, email, company, role = "viewer", site = "https://nitto-watermain.<your-subdomain>.workers.dev"] = process.argv.slice(2);
if (!id || !name) { console.error("id and name are required"); process.exit(1); }
const token = randomBytes(24).toString("base64url");
const hash = createHash("sha256").update(token).digest("hex");
const q = (s) => (s == null ? "NULL" : "'" + String(s).replace(/'/g, "''") + "'");
console.log(`INSERT OR REPLACE INTO people (id,name,email,company,role,invite_hash,created_at) VALUES (${q(id)},${q(name)},${q(email)},${q(company)},${q(role)},${q(hash)},${Date.now()});`);
console.log(`Invite link (send privately): ${site}/join?t=${token}`);
