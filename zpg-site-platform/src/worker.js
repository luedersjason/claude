// Plain Worker entry (wrangler deploy). Cloudflare Pages uses functions/_middleware.js instead.
import { handle } from "./app.js";
export default { fetch: (req, env) => handle(req, env) };
