#!/usr/bin/env python3
"""Process a claude.ai account data export into a rebuild-ready archive.

Usage:
    python process_claude_export.py <export.zip | extracted-dir> [-o OUTDIR]
                                    [--bundle-chars N]

Input:  the zip you get from claude.ai Settings > Privacy > Export data
        (contains conversations.json, projects.json, users.json).

Output (OUTDIR, default ./claude_export_processed):
    SUMMARY_REPORT.md            account-wide stats + coverage report
    inventory.csv                one row per conversation (uuid, name, dates,
                                 message count, word count)
    conversations/YYYY-MM/*.md   one readable markdown transcript per chat
    projects/<name>/PROJECT.md   project name, description, and CUSTOM
                                 INSTRUCTIONS (prompt_template) — the item the
                                 migration runbook flagged as hardest to save
    projects/<name>/docs/*       text of every project knowledge file
    bundles/bundle_NNN.md        transcripts concatenated into upload-sized
                                 chunks for the new account's project knowledge

Design rules (mirrors the migration runbook):
    - NEVER fabricate: missing fields are written as "NOT PRESENT IN EXPORT".
    - Preserve, don't summarize: transcripts are verbatim.
    - Standard library only; Python 3.8+.
"""

import argparse
import csv
import json
import re
import sys
import zipfile
from pathlib import Path

MARK_MISSING = "NOT PRESENT IN EXPORT"


def slugify(text, maxlen=60):
    text = (text or "untitled").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:maxlen] or "untitled"


def load_json_named(root, name):
    """Find <name> anywhere under root (dir) case-insensitively and parse it."""
    matches = [p for p in root.rglob("*") if p.name.lower() == name.lower()]
    if not matches:
        return None, None
    path = sorted(matches, key=lambda p: len(p.parts))[0]
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f), path
    except (json.JSONDecodeError, OSError) as e:
        print(f"WARNING: could not parse {path}: {e}", file=sys.stderr)
        return None, path


def message_text(msg):
    """Extract text from a message robustly across export schema variants."""
    parts = []
    content = msg.get("content")
    if isinstance(content, list):
        for block in content:
            if isinstance(block, dict):
                if block.get("text"):
                    parts.append(block["text"])
                elif block.get("type") not in (None, "text"):
                    parts.append(f"[non-text content: {block.get('type')}]")
    if not parts and msg.get("text"):
        parts.append(msg["text"])
    for att in msg.get("attachments") or []:
        name = att.get("file_name") or att.get("id") or "attachment"
        parts.append(f"\n[attachment: {name}]")
        if att.get("extracted_content"):
            parts.append(att["extracted_content"])
    for f in msg.get("files") or []:
        parts.append(f"[file: {f.get('file_name', 'unnamed')}]")
    return "\n".join(parts).strip()


def render_conversation(convo):
    name = convo.get("name") or "(untitled)"
    lines = [f"# {name}", ""]
    lines.append(f"- uuid: {convo.get('uuid', MARK_MISSING)}")
    lines.append(f"- created: {convo.get('created_at', MARK_MISSING)}")
    lines.append(f"- updated: {convo.get('updated_at', MARK_MISSING)}")
    if convo.get("summary"):
        lines.append(f"- export summary: {convo['summary']}")
    lines.append("")
    msgs = convo.get("chat_messages") or []
    if not msgs:
        lines.append(f"(no messages in export — {MARK_MISSING})")
    for m in msgs:
        sender = m.get("sender", "?")
        label = {"human": "Jason", "assistant": "Claude"}.get(sender, sender)
        stamp = m.get("created_at", "")
        lines.append(f"## {label}  {stamp}")
        lines.append("")
        lines.append(message_text(m) or "(empty message)")
        lines.append("")
    return "\n".join(lines)


def process(export_path, outdir, bundle_chars):
    export_path, outdir = Path(export_path), Path(outdir)
    if export_path.suffix.lower() == ".zip":
        extract_dir = outdir / "_raw"
        extract_dir.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(export_path) as z:
            z.extractall(extract_dir)
        root = extract_dir
    elif export_path.is_dir():
        root = export_path
    else:
        sys.exit(f"ERROR: {export_path} is not a zip or directory")

    conversations, conv_src = load_json_named(root, "conversations.json")
    projects, proj_src = load_json_named(root, "projects.json")
    users, _ = load_json_named(root, "users.json")

    report = ["# Claude Export — Processing Report", ""]
    report.append(f"- conversations.json: {'FOUND ' + str(conv_src) if conversations is not None else MARK_MISSING}")
    report.append(f"- projects.json: {'FOUND ' + str(proj_src) if projects is not None else MARK_MISSING}")
    if users:
        emails = [u.get("email_address", "?") for u in users if isinstance(u, dict)]
        report.append(f"- account: {', '.join(emails)}")
    report.append("")

    # ---- conversations -------------------------------------------------
    inv_rows, bundle_docs = [], []
    if conversations:
        conv_dir = outdir / "conversations"
        for convo in conversations:
            created = convo.get("created_at") or ""
            month = created[:7] if len(created) >= 7 else "unknown-date"
            sub = conv_dir / month
            sub.mkdir(parents=True, exist_ok=True)
            uuid8 = (convo.get("uuid") or "nouuid")[:8]
            fname = f"{created[:10] or 'undated'}_{slugify(convo.get('name'))}_{uuid8}.md"
            text = render_conversation(convo)
            (sub / fname).write_text(text, encoding="utf-8")
            words = len(text.split())
            inv_rows.append([
                convo.get("uuid", ""), convo.get("name", ""), created,
                convo.get("updated_at", ""), len(convo.get("chat_messages") or []),
                words, f"conversations/{month}/{fname}",
            ])
            bundle_docs.append((convo.get("updated_at") or created, text))

        with open(outdir / "inventory.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["uuid", "name", "created_at", "updated_at",
                        "messages", "words", "path"])
            w.writerows(sorted(inv_rows, key=lambda r: r[2], reverse=True))

        total_words = sum(r[5] for r in inv_rows)
        report.append(f"## Conversations: {len(inv_rows)} exported, "
                      f"{sum(r[4] for r in inv_rows)} messages, {total_words} words")
        report.append("")

    # ---- projects (custom instructions live here!) ---------------------
    if projects:
        report.append(f"## Projects: {len(projects)}")
        for p in projects:
            pname = slugify(p.get("name"))
            pdir = outdir / "projects" / pname
            pdir.mkdir(parents=True, exist_ok=True)
            lines = [f"# PROJECT: {p.get('name', '(unnamed)')}", ""]
            lines.append(f"- uuid: {p.get('uuid', MARK_MISSING)}")
            lines.append(f"- created: {p.get('created_at', MARK_MISSING)}")
            lines.append(f"- description: {p.get('description') or MARK_MISSING}")
            lines.append("")
            lines.append("## CUSTOM INSTRUCTIONS (verbatim prompt_template)")
            lines.append("")
            lines.append(p.get("prompt_template") or MARK_MISSING)
            docs = p.get("docs") or []
            lines.append("")
            lines.append(f"## KNOWLEDGE FILES IN EXPORT: {len(docs)}")
            docdir = pdir / "docs"
            for d in docs:
                dname = d.get("filename") or f"doc_{(d.get('uuid') or 'x')[:8]}"
                lines.append(f"- {dname}")
                docdir.mkdir(parents=True, exist_ok=True)
                (docdir / (slugify(dname, 80) + ".md")).write_text(
                    d.get("content") or MARK_MISSING, encoding="utf-8")
            (pdir / "PROJECT.md").write_text("\n".join(lines), encoding="utf-8")
            report.append(f"- {p.get('name')}: instructions "
                          f"{'CAPTURED' if p.get('prompt_template') else MARK_MISSING}, "
                          f"{len(docs)} knowledge files")
        report.append("")
        report.append("NOTE: export knowledge files are TEXT EXTRACTS. Original "
                      "binaries (PDF/XLSX) still need manual download per the "
                      "migration runbook.")
        report.append("")

    # ---- bundles for new-account upload --------------------------------
    if bundle_docs:
        bdir = outdir / "bundles"
        bdir.mkdir(parents=True, exist_ok=True)
        bundle_docs.sort(key=lambda t: t[0] or "", reverse=True)
        buf, n, size = [], 1, 0
        for _, text in bundle_docs:
            if size + len(text) > bundle_chars and buf:
                (bdir / f"bundle_{n:03d}.md").write_text(
                    "\n\n---\n\n".join(buf), encoding="utf-8")
                buf, size, n = [], 0, n + 1
            buf.append(text)
            size += len(text)
        if buf:
            (bdir / f"bundle_{n:03d}.md").write_text(
                "\n\n---\n\n".join(buf), encoding="utf-8")
        report.append(f"## Bundles: {n} file(s) in bundles/ "
                      f"(newest conversations first, ~{bundle_chars} chars each)")

    (outdir / "SUMMARY_REPORT.md").write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report))
    print(f"\nDone. Output in: {outdir.resolve()}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("export", help="export zip or extracted directory")
    ap.add_argument("-o", "--outdir", default="claude_export_processed")
    ap.add_argument("--bundle-chars", type=int, default=300_000,
                    help="max characters per upload bundle (default 300k)")
    args = ap.parse_args()
    process(args.export, args.outdir, args.bundle_chars)
