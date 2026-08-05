#!/usr/bin/env python3
"""Build out a Discord server from a JSON spec.

Creates roles, categories, channels, and incoming webhooks in a guild the bot
has already been invited to. Idempotent: anything that already exists by name
is reused, never duplicated and never deleted.

Standard library only -- no pip install required.

Usage
-----
    python3 setup_discord.py                     # prompts for the bot token
    python3 setup_discord.py --dry-run           # show the plan, change nothing
    python3 setup_discord.py --list-guilds       # find your guild id
    python3 setup_discord.py --spec other.json --out webhooks.json

Token resolution order: --token, --token-file, $DISCORD_BOT_TOKEN, interactive
prompt. Prefer the prompt or a file; a token passed as --token lands in your
shell history.

Required bot permissions: Manage Roles, Manage Channels, Manage Webhooks.
The bot's own role must sit ABOVE any role it creates, or Discord returns 403.
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.request

API = "https://discord.com/api/v10"
USER_AGENT = "DiscordBootstrap (https://github.com/luedersjason/claude, 1.0)"

# Channel type ids, per the Discord API. Only the ones worth exposing.
CHANNEL_TYPES = {
    "text": 0,
    "voice": 2,
    "category": 4,
    "announcement": 5,
    "stage": 13,
    "forum": 15,
}

# Permission flags, by bit position. The spec files use these names so nobody
# has to hand-assemble a 64-bit integer.
PERMISSIONS = {
    "CREATE_INSTANT_INVITE": 0,
    "KICK_MEMBERS": 1,
    "BAN_MEMBERS": 2,
    "ADMINISTRATOR": 3,
    "MANAGE_CHANNELS": 4,
    "MANAGE_GUILD": 5,
    "ADD_REACTIONS": 6,
    "VIEW_AUDIT_LOG": 7,
    "PRIORITY_SPEAKER": 8,
    "STREAM": 9,
    "VIEW_CHANNEL": 10,
    "SEND_MESSAGES": 11,
    "MANAGE_MESSAGES": 13,
    "EMBED_LINKS": 14,
    "ATTACH_FILES": 15,
    "READ_MESSAGE_HISTORY": 16,
    "MENTION_EVERYONE": 17,
    "USE_EXTERNAL_EMOJIS": 18,
    "CONNECT": 20,
    "SPEAK": 21,
    "MUTE_MEMBERS": 22,
    "DEAFEN_MEMBERS": 23,
    "MOVE_MEMBERS": 24,
    "MANAGE_NICKNAMES": 27,
    "MANAGE_ROLES": 28,
    "MANAGE_WEBHOOKS": 29,
    "USE_APPLICATION_COMMANDS": 31,
    "MANAGE_THREADS": 34,
    "CREATE_PUBLIC_THREADS": 35,
    "CREATE_PRIVATE_THREADS": 36,
    "SEND_MESSAGES_IN_THREADS": 38,
}


class DiscordError(RuntimeError):
    """An API call failed in a way the operator needs to read."""


def permission_bits(names):
    """Turn ["VIEW_CHANNEL", ...] into the string Discord expects."""
    total = 0
    for name in names or []:
        try:
            total |= 1 << PERMISSIONS[name]
        except KeyError:
            raise DiscordError(
                f"unknown permission {name!r}; known names: "
                + ", ".join(sorted(PERMISSIONS))
            )
    return str(total)


def parse_color(value):
    """Accept "#5865F2", "5865F2", or an int. Discord wants an int."""
    if value is None:
        return None
    if isinstance(value, int):
        return value
    return int(str(value).lstrip("#"), 16)


def ssl_context():
    """Honor a custom CA bundle when one is configured.

    Matters in proxied environments -- see DIAGNOSIS.md, where an intercepting
    proxy's CA is exactly what broke the routine's outbound HTTPS.
    """
    for var in ("REQUESTS_CA_BUNDLE", "SSL_CERT_FILE", "CURL_CA_BUNDLE"):
        path = os.environ.get(var)
        if path and os.path.exists(path):
            return ssl.create_default_context(cafile=path)
    return ssl.create_default_context()


class Discord:
    """A thin Discord REST client: auth, retries, and rate limits."""

    def __init__(self, token, dry_run=False):
        self.token = token
        self.dry_run = dry_run
        self.ssl = ssl_context()

    def request(self, method, path, body=None, _attempt=1):
        url = API + path
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", f"Bot {self.token}")
        req.add_header("User-Agent", USER_AGENT)
        if data:
            req.add_header("Content-Type", "application/json")

        try:
            with urllib.request.urlopen(req, context=self.ssl, timeout=30) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as exc:
            raw = exc.read()
            try:
                payload = json.loads(raw)
            except ValueError:
                payload = {"message": raw.decode(errors="replace")}

            # 429s carry the exact wait. Anything 5xx is worth a few tries.
            if exc.code == 429 and _attempt <= 5:
                wait = float(payload.get("retry_after", 1.0)) + 0.25
                print(f"  rate limited, waiting {wait:.1f}s", file=sys.stderr)
                time.sleep(wait)
                return self.request(method, path, body, _attempt + 1)
            if exc.code >= 500 and _attempt <= 4:
                wait = 2 ** _attempt
                print(f"  {exc.code} from Discord, retrying in {wait}s", file=sys.stderr)
                time.sleep(wait)
                return self.request(method, path, body, _attempt + 1)

            raise DiscordError(self._explain(exc.code, payload, method, path))
        except urllib.error.URLError as exc:
            if _attempt <= 4:
                wait = 2 ** _attempt
                print(f"  network error ({exc.reason}), retrying in {wait}s", file=sys.stderr)
                time.sleep(wait)
                return self.request(method, path, body, _attempt + 1)
            raise DiscordError(f"could not reach Discord: {exc.reason}")

    @staticmethod
    def _explain(code, payload, method, path):
        message = payload.get("message", "unknown error")
        detail = f"{method} {path} -> {code}: {message}"
        if code == 401:
            return detail + "\n  The bot token is wrong or was regenerated."
        if code == 403:
            return detail + (
                "\n  The bot lacks a permission, or its role sits below the role"
                "\n  it is trying to create/edit. Drag the bot's role higher in"
                "\n  Server Settings -> Roles and run again."
            )
        errors = payload.get("errors")
        if errors:
            detail += "\n  " + json.dumps(errors, indent=2).replace("\n", "\n  ")
        return detail

    # -- reads ------------------------------------------------------------
    def me(self):
        return self.request("GET", "/users/@me")

    def guilds(self):
        return self.request("GET", "/users/@me/guilds")

    def roles(self, guild_id):
        return self.request("GET", f"/guilds/{guild_id}/roles")

    def channels(self, guild_id):
        return self.request("GET", f"/guilds/{guild_id}/channels")

    def webhooks(self, channel_id):
        return self.request("GET", f"/channels/{channel_id}/webhooks")

    # -- writes -----------------------------------------------------------
    def create_role(self, guild_id, body):
        if self.dry_run:
            return {"id": f"dry-run-role-{body['name']}", **body}
        return self.request("POST", f"/guilds/{guild_id}/roles", body)

    def create_channel(self, guild_id, body):
        if self.dry_run:
            return {"id": f"dry-run-channel-{body['name']}", **body}
        return self.request("POST", f"/guilds/{guild_id}/channels", body)

    def create_webhook(self, channel_id, name):
        if self.dry_run:
            return {"id": "dry-run", "name": name, "url": "https://discord.com/api/webhooks/DRY-RUN"}
        return self.request("POST", f"/channels/{channel_id}/webhooks", {"name": name})


def ensure_roles(api, guild_id, spec, report):
    """Create any role in the spec that isn't already in the guild."""
    existing = {r["name"]: r for r in api.roles(guild_id)}
    resolved = dict(existing)

    for role in spec.get("roles", []):
        name = role["name"]
        if name in existing:
            print(f"  role  {name:<24} exists")
            continue
        body = {
            "name": name,
            "permissions": permission_bits(role.get("permissions")),
            "hoist": bool(role.get("hoist", False)),
            "mentionable": bool(role.get("mentionable", False)),
        }
        color = parse_color(role.get("color"))
        if color is not None:
            body["color"] = color
        created = api.create_role(guild_id, body)
        resolved[name] = created
        report["roles_created"].append(name)
        print(f"  role  {name:<24} created")

    return resolved


def overwrites_for(category, guild_id, roles):
    """Build permission overwrites for a category marked private.

    `private_to` hides the category from @everyone and grants view to the
    named roles. Absent that key, the category inherits guild defaults.
    """
    allowed = category.get("private_to")
    if not allowed:
        return None

    view = permission_bits(["VIEW_CHANNEL"])
    # @everyone's role id is always the guild id.
    result = [{"id": str(guild_id), "type": 0, "deny": view}]
    for role_name in allowed:
        role = roles.get(role_name)
        if not role:
            raise DiscordError(
                f"category {category['name']!r} is private_to {role_name!r}, "
                "but no such role exists or is defined in the spec"
            )
        result.append({"id": str(role["id"]), "type": 0, "allow": view})
    return result


def ensure_channels(api, guild_id, spec, roles, report):
    """Create categories and their channels, in spec order."""
    existing = {(c["name"], c["type"]): c for c in api.channels(guild_id)}
    webhook_targets = []

    for position, category in enumerate(spec.get("categories", [])):
        cat_name = category["name"]
        cat = existing.get((cat_name, CHANNEL_TYPES["category"]))
        if cat:
            print(f"  cat   {cat_name:<24} exists")
        else:
            body = {"name": cat_name, "type": CHANNEL_TYPES["category"], "position": position}
            overwrites = overwrites_for(category, guild_id, roles)
            if overwrites:
                body["permission_overwrites"] = overwrites
            cat = api.create_channel(guild_id, body)
            report["categories_created"].append(cat_name)
            print(f"  cat   {cat_name:<24} created")

        for channel in category.get("channels", []):
            ch_name = channel["name"]
            ch_type = CHANNEL_TYPES[channel.get("type", "text")]
            found = existing.get((ch_name, ch_type))
            if found:
                print(f"    ch  {ch_name:<22} exists")
            else:
                body = {"name": ch_name, "type": ch_type, "parent_id": str(cat["id"])}
                if channel.get("topic"):
                    body["topic"] = channel["topic"]
                if channel.get("slowmode"):
                    body["rate_limit_per_user"] = int(channel["slowmode"])
                found = api.create_channel(guild_id, body)
                report["channels_created"].append(ch_name)
                print(f"    ch  {ch_name:<22} created")

            if channel.get("webhook"):
                webhook_targets.append((found, channel["webhook"]))

    return webhook_targets


def ensure_webhooks(api, targets, report):
    """Create the incoming webhooks the spec asks for, reusing by name."""
    for channel, hook_name in targets:
        if api.dry_run:
            print(f"  hook  {hook_name:<24} would be created in #{channel['name']}")
            report["webhooks"].append(
                {"channel": channel["name"], "name": hook_name, "url": "(dry run)"}
            )
            continue

        found = next(
            (h for h in api.webhooks(channel["id"]) if h.get("name") == hook_name),
            None,
        )
        if found:
            print(f"  hook  {hook_name:<24} exists in #{channel['name']}")
        else:
            found = api.create_webhook(channel["id"], hook_name)
            report["webhooks_created"].append(hook_name)
            print(f"  hook  {hook_name:<24} created in #{channel['name']}")

        url = found.get("url")
        if not url and found.get("token"):
            url = f"https://discord.com/api/webhooks/{found['id']}/{found['token']}"
        report["webhooks"].append(
            {"channel": channel["name"], "name": hook_name, "url": url}
        )


def resolve_token(args):
    if args.token:
        return args.token.strip()
    if args.token_file:
        with open(args.token_file) as handle:
            return handle.read().strip()
    env = os.environ.get("DISCORD_BOT_TOKEN")
    if env:
        return env.strip()
    if not sys.stdin.isatty():
        raise DiscordError(
            "no bot token: set $DISCORD_BOT_TOKEN, pass --token-file, or run "
            "interactively so the script can prompt"
        )
    return getpass.getpass("Bot token (input hidden): ").strip()


def resolve_guild(api, args):
    if args.guild_id:
        return args.guild_id
    env = os.environ.get("DISCORD_GUILD_ID")
    if env:
        return env

    guilds = api.guilds()
    if not guilds:
        raise DiscordError(
            "the bot is not in any server yet -- invite it first with the OAuth2 "
            "URL generator (scopes: bot; permissions: Manage Roles, Manage "
            "Channels, Manage Webhooks)"
        )
    if len(guilds) == 1:
        print(f"Using the bot's only server: {guilds[0]['name']} ({guilds[0]['id']})")
        return guilds[0]["id"]

    listing = "\n".join(f"  {g['id']}  {g['name']}" for g in guilds)
    raise DiscordError(
        f"the bot is in {len(guilds)} servers; pass --guild-id:\n{listing}"
    )


def main():
    parser = argparse.ArgumentParser(
        description="Build a Discord server from a JSON spec (idempotent).",
    )
    parser.add_argument("--spec", default="discord_server.json", help="server layout JSON")
    parser.add_argument("--guild-id", help="target server id; inferred if the bot is in exactly one")
    parser.add_argument("--token", help="bot token (avoid: lands in shell history)")
    parser.add_argument("--token-file", help="file containing the bot token")
    parser.add_argument("--out", help="write the webhook URLs to this JSON file")
    parser.add_argument("--dry-run", action="store_true", help="print the plan, change nothing")
    parser.add_argument("--list-guilds", action="store_true", help="list the bot's servers and exit")
    args = parser.parse_args()

    try:
        api = Discord(resolve_token(args), dry_run=args.dry_run)

        identity = api.me()
        print(f"Authenticated as {identity['username']} (id {identity['id']})")

        if args.list_guilds:
            for guild in api.guilds():
                print(f"  {guild['id']}  {guild['name']}")
            return 0

        with open(args.spec) as handle:
            spec = json.load(handle)

        guild_id = resolve_guild(api, args)
        if args.dry_run:
            print("\n-- DRY RUN: nothing will be created --")
        print(f"\nApplying {args.spec} to guild {guild_id}\n")

        report = {
            "roles_created": [],
            "categories_created": [],
            "channels_created": [],
            "webhooks_created": [],
            "webhooks": [],
        }

        roles = ensure_roles(api, guild_id, spec, report)
        targets = ensure_channels(api, guild_id, spec, roles, report)
        ensure_webhooks(api, targets, report)

        print(
            "\nDone: "
            f"{len(report['roles_created'])} roles, "
            f"{len(report['categories_created'])} categories, "
            f"{len(report['channels_created'])} channels, "
            f"{len(report['webhooks_created'])} webhooks created."
        )

        if report["webhooks"]:
            print("\nWebhook URLs (secrets -- treat like passwords):")
            for hook in report["webhooks"]:
                print(f"  #{hook['channel']}  {hook['url']}")

        if args.out:
            with open(args.out, "w") as handle:
                json.dump(report, handle, indent=2)
            os.chmod(args.out, 0o600)
            print(f"\nWrote {args.out} (mode 600). It contains webhook secrets.")

        return 0
    except DiscordError as exc:
        print(f"\nError: {exc}", file=sys.stderr)
        return 1
    except FileNotFoundError as exc:
        print(f"\nError: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nCancelled.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    sys.exit(main())
