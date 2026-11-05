// Cloudflare Pages entry: every request (pages, files, /api) goes through the shared app.
import { handle } from "../src/app.js";
export const onRequest = (context) => handle(context.request, context.env);
