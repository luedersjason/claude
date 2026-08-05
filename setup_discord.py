#!/usr/bin/env python3
"""One-command setup for Insurgency Protocol: The Fifth Column.

Run it, paste the bot token, click the invite link it prints. It builds the
whole server -- roles, categories, channels, webhooks -- then hardens it
against raids, scams, and spam.

    python3 setup_discord.py

Idempotent: existing things are reused, nothing is ever deleted. Re-run it
after editing discord_server.json and only the new entries get created.

Standard library only -- no pip install.
"""

from __future__ import annotations

import argparse
import base64
import getpass
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.request

API = "https://discord.com/api/v10"
USER_AGENT = "FifthColumnSetup (https://github.com/luedersjason/claude, 2.0)"

CHANNEL_TYPES = {"text": 0, "voice": 2, "category": 4, "announcement": 5, "stage": 13, "forum": 15}

PERMISSIONS = {
    "CREATE_INSTANT_INVITE": 0, "KICK_MEMBERS": 1, "BAN_MEMBERS": 2, "ADMINISTRATOR": 3,
    "MANAGE_CHANNELS": 4, "MANAGE_GUILD": 5, "ADD_REACTIONS": 6, "VIEW_AUDIT_LOG": 7,
    "PRIORITY_SPEAKER": 8, "STREAM": 9, "VIEW_CHANNEL": 10, "SEND_MESSAGES": 11,
    "MANAGE_MESSAGES": 13, "EMBED_LINKS": 14, "ATTACH_FILES": 15, "READ_MESSAGE_HISTORY": 16,
    "MENTION_EVERYONE": 17, "USE_EXTERNAL_EMOJIS": 18, "CONNECT": 20, "SPEAK": 21,
    "MUTE_MEMBERS": 22, "DEAFEN_MEMBERS": 23, "MOVE_MEMBERS": 24, "MANAGE_NICKNAMES": 27,
    "MANAGE_ROLES": 28, "MANAGE_WEBHOOKS": 29, "USE_APPLICATION_COMMANDS": 31,
    "MANAGE_THREADS": 34, "CREATE_PUBLIC_THREADS": 35, "CREATE_PRIVATE_THREADS": 36,
    "SEND_MESSAGES_IN_THREADS": 38, "MODERATE_MEMBERS": 40,
    "CHANGE_NICKNAME": 26, "MANAGE_EVENTS": 33,
}

# What the bot needs to do its job, and nothing more. Deliberately excludes
# ADMINISTRATOR -- a bot token that leaks should not be able to delete a server.
BOT_SCOPE = [
    "VIEW_CHANNEL", "MANAGE_CHANNELS", "MANAGE_GUILD", "MANAGE_ROLES",
    "MANAGE_WEBHOOKS", "MODERATE_MEMBERS", "SEND_MESSAGES", "READ_MESSAGE_HISTORY",
    "EMBED_LINKS",
]

# Permissions @everyone keeps. Unvetted accounts can talk, but cannot post
# links or files, mass-mention, or mint invites -- the three things a raiding
# or scam account actually needs. Operative grants those back after vetting.
EVERYONE_BASELINE = [
    "VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY", "ADD_REACTIONS",
    "USE_EXTERNAL_EMOJIS", "CONNECT", "SPEAK", "USE_APPLICATION_COMMANDS",
]

# Bait strings from the standard Discord scam playbook. Wildcards are Discord's
# own AutoMod syntax, not regex.
SCAM_BAIT = [
    "*free nitro*", "*nitro giveaway*", "*discord-gift*", "*discordgift*",
    "*discordnitro.*", "*steamcommunity.com/gift*", "*@everyone free*",
    "*claim your gift*", "*airdrop claim*", "*connect your wallet*",
]


class DiscordError(RuntimeError):
    """An API failure the operator needs to read."""


def permission_bits(names):
    total = 0
    for name in names or []:
        try:
            total |= 1 << PERMISSIONS[name]
        except KeyError:
            raise DiscordError(f"unknown permission {name!r}")
    return str(total)


def parse_color(value):
    if value is None:
        return None
    if isinstance(value, int):
        return value
    return int(str(value).lstrip("#"), 16)


def ssl_context():
    """Honor a custom CA bundle when one is set (proxied networks)."""
    for var in ("REQUESTS_CA_BUNDLE", "SSL_CERT_FILE", "CURL_CA_BUNDLE"):
        path = os.environ.get(var)
        if path and os.path.exists(path):
            return ssl.create_default_context(cafile=path)
    return ssl.create_default_context()


def application_id(token):
    """A bot token's first segment is the base64url application id.

    Deriving it here means the invite URL can be built without a trip through
    the OAuth2 URL Generator.
    """
    head = token.split(".")[0]
    padded = head + "=" * (-len(head) % 4)
    try:
        return base64.urlsafe_b64decode(padded).decode()
    except Exception:
        return None


def invite_url(token):
    app_id = application_id(token)
    if not app_id:
        return None
    return (
        f"https://discord.com/oauth2/authorize?client_id={app_id}"
        f"&scope=bot&permissions={permission_bits(BOT_SCOPE)}"
    )


class Discord:
    def __init__(self, token, dry_run=False):
        self.token = token
        self.dry_run = dry_run
        self.ssl = ssl_context()

    def request(self, method, path, body=None, _attempt=1):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(API + path, data=data, method=method)
        req.add_header("Authorization", f"Bot {self.token}")
        req.add_header("User-Agent", USER_AGENT)
        if data:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, context=self.ssl, timeout=30) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as exc:
            try:
                payload = json.loads(exc.read())
            except Exception:
                payload = {"message": "unreadable error body"}
            if exc.code == 429 and _attempt <= 5:
                wait = float(payload.get("retry_after", 1.0)) + 0.25
                time.sleep(wait)
                return self.request(method, path, body, _attempt + 1)
            if exc.code >= 500 and _attempt <= 4:
                time.sleep(2 ** _attempt)
                return self.request(method, path, body, _attempt + 1)
            raise DiscordError(self._explain(exc.code, payload, method, path))
        except urllib.error.URLError as exc:
            if _attempt <= 4:
                time.sleep(2 ** _attempt)
                return self.request(method, path, body, _attempt + 1)
            raise DiscordError(f"could not reach Discord: {exc.reason}")

    @staticmethod
    def _explain(code, payload, method, path):
        detail = f"{method} {path} -> {code}: {payload.get('message', 'unknown')}"
        if code == 401:
            return detail + "\n  Token is wrong or was reset."
        if code == 403:
            return detail + (
                "\n  Missing permission, or the bot's role sits below the role it"
                "\n  is editing. Server Settings -> Roles, drag the bot to the top."
            )
        if payload.get("errors"):
            detail += "\n  " + json.dumps(payload["errors"], indent=2).replace("\n", "\n  ")
        return detail

    def get(self, path):
        return self.request("GET", path)

    def post(self, path, body):
        return self.request("POST", path, body)

    def patch(self, path, body):
        return self.request("PATCH", path, body)


def wait_for_invite(api, token):
    """Print the invite URL and block until the bot lands in a server."""
    url = invite_url(token)
    guilds = api.get("/users/@me/guilds")
    if guilds:
        return guilds

    if not url:
        raise DiscordError("bot is in no server, and the token did not decode to an app id")

    print("\n" + "=" * 70)
    print("STEP 2 of 2 -- open this link and pick your server:\n")
    print(f"  {url}\n")
    print("Waiting for the invite to go through (Ctrl-C to stop)...")
    print("=" * 70)

    for _ in range(120):  # ~10 minutes
        time.sleep(5)
        guilds = api.get("/users/@me/guilds")
        if guilds:
            print(f"\nBot joined: {guilds[0]['name']}\n")
            return guilds
    raise DiscordError("timed out waiting for the bot to be invited")


def ensure_roles(api, guild_id, spec, report):
    existing = {r["name"]: r for r in api.get(f"/guilds/{guild_id}/roles")}
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
        if api.dry_run:
            resolved[name] = {"id": f"dry-{name}", **body}
        else:
            resolved[name] = api.post(f"/guilds/{guild_id}/roles", body)
        report["roles"].append(name)
        print(f"  role  {name:<24} created")
    return resolved


def overwrites_for(category, guild_id, roles):
    allowed = category.get("private_to")
    if not allowed:
        return None
    view = permission_bits(["VIEW_CHANNEL"])
    result = [{"id": str(guild_id), "type": 0, "deny": view}]
    for name in allowed:
        role = roles.get(name)
        if not role:
            raise DiscordError(f"category {category['name']!r} needs missing role {name!r}")
        result.append({"id": str(role["id"]), "type": 0, "allow": view})
    return result


def publish(api, channel, text):
    """Post the welcome/rules copy, but only into a channel with no history.

    Re-running the script must not spam a second copy into a live channel.
    """
    if api.dry_run:
        print(f"    post  would post {len(text)} chars to #{channel['name']}")
        return
    if api.get(f"/channels/{channel['id']}/messages?limit=1"):
        print(f"    post  #{channel['name']:<18} already has messages, left alone")
        return
    api.post(f"/channels/{channel['id']}/messages", {"content": text})
    print(f"    post  #{channel['name']:<18} content posted")


def lock_readonly(api, channel, guild_id):
    """@everyone may read and react, not post. Applied after publishing."""
    if api.dry_run:
        return
    api.patch(f"/channels/{channel['id']}", {"permission_overwrites": [{
        "id": str(guild_id), "type": 0,
        "deny": permission_bits(["SEND_MESSAGES", "CREATE_PUBLIC_THREADS"]),
        "allow": permission_bits(["VIEW_CHANNEL", "ADD_REACTIONS", "READ_MESSAGE_HISTORY"]),
    }]})


def ensure_channels(api, guild_id, spec, roles, report):
    existing = {(c["name"], c["type"]): c for c in api.get(f"/guilds/{guild_id}/channels")}
    webhook_targets = []
    for position, category in enumerate(spec.get("categories", [])):
        cat_name = category["name"]
        cat = existing.get((cat_name, 4))
        if cat:
            print(f"  cat   {cat_name:<24} exists")
        else:
            body = {"name": cat_name, "type": 4, "position": position}
            overwrites = overwrites_for(category, guild_id, roles)
            if overwrites:
                body["permission_overwrites"] = overwrites
            cat = {"id": f"dry-{cat_name}"} if api.dry_run else api.post(f"/guilds/{guild_id}/channels", body)
            report["categories"].append(cat_name)
            print(f"  cat   {cat_name:<24} created")

        for channel in category.get("channels", []):
            name = channel["name"]
            ctype = CHANNEL_TYPES[channel.get("type", "text")]
            found = existing.get((name, ctype))
            if found:
                print(f"    ch  {name:<22} exists")
            else:
                body = {"name": name, "type": ctype, "parent_id": str(cat["id"])}
                if channel.get("topic"):
                    body["topic"] = channel["topic"]
                if channel.get("slowmode"):
                    body["rate_limit_per_user"] = int(channel["slowmode"])
                found = {"id": f"dry-{name}", "name": name} if api.dry_run else api.post(f"/guilds/{guild_id}/channels", body)
                report["channels"].append(name)
                print(f"    ch  {name:<22} created")

            # Publish before locking: a read-only overwrite would otherwise
            # silence the bot too, since it inherits @everyone.
            if channel.get("post"):
                publish(api, found, channel["post"])
            if channel.get("readonly"):
                lock_readonly(api, found, guild_id)
            if channel.get("webhook"):
                webhook_targets.append((found, channel["webhook"]))
            spec.setdefault("_resolved", {})[name] = found
    return webhook_targets


def ensure_webhooks(api, targets, report):
    for channel, name in targets:
        if api.dry_run:
            print(f"  hook  {name:<24} would be created in #{channel['name']}")
            continue
        found = next((h for h in api.get(f"/channels/{channel['id']}/webhooks")
                      if h.get("name") == name), None)
        if found:
            print(f"  hook  {name:<24} exists in #{channel['name']}")
        else:
            found = api.post(f"/channels/{channel['id']}/webhooks", {"name": name})
            print(f"  hook  {name:<24} created in #{channel['name']}")
        url = found.get("url") or f"https://discord.com/api/webhooks/{found['id']}/{found.get('token')}"
        report["webhooks"].append({"channel": channel["name"], "name": name, "url": url})


def harden(api, guild_id, roles, spec, report):
    """Anti-raid, anti-scam, anti-spam. Each step is independent.

    One failure (usually a permission gap or a Community-only feature) reports
    itself and the rest still apply.
    """
    def step(label, fn):
        if api.dry_run:
            print(f"  would set  {label}")
            return
        try:
            fn()
            report["hardening"].append(label)
            print(f"  set   {label}")
        except DiscordError as exc:
            report["skipped"].append(f"{label}: {exc}".split("\n")[0])
            print(f"  SKIP  {label} -- {str(exc).splitlines()[0]}")

    resolved = spec.get("_resolved", {})

    # Raise the bar for joining: account must be on Discord 5+ minutes and in
    # this server 10+ minutes before it can talk. Kills drive-by raid accounts.
    settings = {
        "verification_level": 3,
        "explicit_content_filter": 2,
        "default_message_notifications": 1,
    }
    system = resolved.get(spec.get("system_channel"))
    if system:
        settings["system_channel_id"] = str(system["id"])
    step("verification HIGH + content filter + system channel",
         lambda: api.patch(f"/guilds/{guild_id}", settings))

    # Community unlocks rules screening, onboarding, and raid alerts. Discord
    # requires the rules and updates channels to be named up front.
    guild = api.get(f"/guilds/{guild_id}") if not api.dry_run else {"features": []}
    community = spec.get("community") or {}
    rules_ch = resolved.get(community.get("rules_channel"))
    updates_ch = resolved.get(community.get("updates_channel"))
    if "COMMUNITY" in guild.get("features", []):
        print("  set   Community mode already on")
    elif rules_ch and updates_ch:
        step("Community mode", lambda: api.patch(f"/guilds/{guild_id}", {
            "features": list(guild.get("features", [])) + ["COMMUNITY"],
            "rules_channel_id": str(rules_ch["id"]),
            "public_updates_channel_id": str(updates_ch["id"]),
            "verification_level": 3,
            "explicit_content_filter": 2,
        }))

    # @everyone keeps talking rights but loses the raid/scam toolkit.
    step("@everyone locked to safe baseline", lambda: api.patch(
        f"/guilds/{guild_id}/roles/{guild_id}",
        {"permissions": permission_bits(EVERYONE_BASELINE)},
    ))

    exempt = [str(roles[r]["id"]) for r in ("Command", "Handler") if r in roles]
    existing = {r["name"] for r in api.get(f"/guilds/{guild_id}/auto-moderation/rules")} \
        if not api.dry_run else set()

    def automod(name, trigger_type, metadata, actions):
        if name in existing:
            print(f"  automod  {name:<28} exists")
            return
        step(f"automod: {name}", lambda: api.post(
            f"/guilds/{guild_id}/auto-moderation/rules",
            {
                "name": name, "event_type": 1, "trigger_type": trigger_type,
                "trigger_metadata": metadata, "actions": actions,
                "enabled": True, "exempt_roles": exempt,
            },
        ))

    block = [{"type": 1, "metadata": {"custom_message": "Blocked by Fifth Column AutoMod."}}]
    block_and_mute = block + [{"type": 3, "metadata": {"duration_seconds": 600}}]

    automod("Scam and phishing bait", 1,
            {"keyword_filter": SCAM_BAIT, "regex_patterns": [], "allow_list": []},
            block_and_mute)
    automod("Mass mention guard", 5,
            {"mention_total_limit": 5, "mention_raid_protection_enabled": True}, block)
    automod("Spam guard", 3, {}, block)
    automod("Slur filter", 4, {"presets": [3], "allow_list": []}, block)


def resolve_token(args):
    if args.token_file:
        return open(args.token_file).read().strip()
    if os.environ.get("DISCORD_BOT_TOKEN"):
        return os.environ["DISCORD_BOT_TOKEN"].strip()
    if not sys.stdin.isatty():
        raise DiscordError("no token: set $DISCORD_BOT_TOKEN or use --token-file")
    print("=" * 70)
    print("STEP 1 of 2 -- paste the bot token from the Discord dev portal.")
    print("  https://discord.com/developers/applications")
    print("  New Application -> Bot -> Reset Token -> copy")
    print("=" * 70)
    return getpass.getpass("Token (hidden): ").strip()


def main():
    parser = argparse.ArgumentParser(description="Build and harden the Fifth Column server.")
    parser.add_argument("--spec", default="discord_server.json")
    parser.add_argument("--guild-id")
    parser.add_argument("--token-file")
    parser.add_argument("--out", help="write webhook URLs to this file (mode 600)")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-harden", action="store_true", help="skip the security pass")
    args = parser.parse_args()

    try:
        token = resolve_token(args)
        api = Discord(token, dry_run=args.dry_run)
        identity = api.get("/users/@me")
        print(f"\nAuthenticated as {identity['username']}")

        spec = json.load(open(args.spec))

        guild_id = args.guild_id or os.environ.get("DISCORD_GUILD_ID") or spec.get("guild_id")
        if not guild_id:
            guilds = wait_for_invite(api, token)
            if len(guilds) > 1:
                listing = "\n".join(f"  {g['id']}  {g['name']}" for g in guilds)
                raise DiscordError(f"bot is in several servers; pass --guild-id:\n{listing}")
            guild_id = guilds[0]["id"]

        if args.dry_run:
            print("\n-- DRY RUN: nothing will change --")
        print(f"\nBuilding from {args.spec}\n")

        report = {"roles": [], "categories": [], "channels": [], "webhooks": [],
                  "hardening": [], "skipped": []}

        roles = ensure_roles(api, guild_id, spec, report)
        targets = ensure_channels(api, guild_id, spec, roles, report)
        ensure_webhooks(api, targets, report)
        if not args.no_harden:
            print("\nHardening:")
            harden(api, guild_id, roles, spec, report)

        print(
            f"\nCreated {len(report['roles'])} roles, {len(report['categories'])} categories, "
            f"{len(report['channels'])} channels. {len(report['hardening'])} security settings applied."
        )
        if report["skipped"]:
            print("\nCould not apply:")
            for item in report["skipped"]:
                print(f"  - {item}")

        if report["webhooks"]:
            print("\nWebhook URLs (secrets):")
            for hook in report["webhooks"]:
                print(f"  #{hook['channel']}  {hook['url']}")
        if args.out and report["webhooks"]:
            json.dump(report, open(args.out, "w"), indent=2)
            os.chmod(args.out, 0o600)
            print(f"\nWrote {args.out} (mode 600)")

        print("""
Four things no bot is allowed to do -- 60 seconds in the Discord app:
  1. Give yourself and Inkslinger the Command role
  2. Server Settings -> Safety Setup -> require 2FA for moderators
  3. Server Settings -> Overview -> upload the server icon
  4. Kick the setup bot, then Reset Token in the dev portal (kills it dead)
""")
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
