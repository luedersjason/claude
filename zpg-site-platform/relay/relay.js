// Claude relay. One Hub holds two kinds of websocket:
//   "claude" - a Claude session listening for sent comments (gets {type:"comment", site, col, id})
//   "page"   - a project page waiting for a revision (gets {type:"working"|"done", col, id})
// Messages carry ids only, never comment text. Hibernating sockets cost nothing while idle.
export class Hub {
  constructor(state, env) { this.state = state; this.env = env; }
  async fetch(req) {
    const url = new URL(req.url);
    const role = url.pathname.split("/").pop();
    if (req.headers.get("upgrade") === "websocket" && (role === "listen" || role === "page")) {
      const [client, server] = Object.values(new WebSocketPair());
      this.state.acceptWebSocket(server, [role === "listen" ? "claude" : "page"]);
      server.send(JSON.stringify({ type: "hello", role, claude: this.state.getWebSockets("claude").length }));
      return new Response(null, { status: 101, webSocket: client });
    }
    if (req.method === "POST" && role === "event") {
      if (!this.env.RELAY_SECRET || req.headers.get("x-relay-secret") !== this.env.RELAY_SECRET) return new Response("forbidden", { status: 403 });
      const e = await req.json().catch(() => null);
      if (!e || !/^[a-z0-9_-]{1,40}$/i.test(e.col || "") || !/^[\w.-]{1,120}$/.test(e.id || "")) return new Response("bad", { status: 400 });
      const msg = JSON.stringify({ type: "comment", site: String(e.site || "").slice(0, 20), col: e.col, id: e.id, at: Date.now() });
      const ls = this.state.getWebSockets("claude");
      for (const ws of ls) { try { ws.send(msg); } catch (x) {} }
      return Response.json({ claude: ls.length });
    }
    if (req.method === "POST" && role === "status") {   // Claude says it is working on / finished a request; ids only
      const e = await req.json().catch(() => null);
      if (!e || !["working", "done"].includes(e.type) || !/^[a-z0-9_-]{1,40}$/i.test(e.col || "") || !/^[\w.-]{1,120}$/.test(e.id || "")) return new Response("bad", { status: 400 });
      const msg = JSON.stringify({ type: e.type, col: e.col, id: e.id, at: Date.now() });
      for (const ws of this.state.getWebSockets("page")) { try { ws.send(msg); } catch (x) {} }
      return Response.json({ ok: true });
    }
    if (role === "count") return Response.json({ claude: this.state.getWebSockets("claude").length });
    return new Response("not found", { status: 404 });
  }
  webSocketMessage(ws, m) { if (m === "ping") ws.send("pong"); }
  webSocketClose(ws, code) { try { ws.close(code, "bye"); } catch (x) {} }
}
export default {
  fetch(req, env) { return env.HUB.get(env.HUB.idFromName("zpg")).fetch(req); },
};
