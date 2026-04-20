---
name: migrating-fragile-shell-python-bridges
description: Fix and validate legacy shell scripts that embed Python when migrating features into Hermes. Use when a shell script relies on inline Python with complex quoting, or when validation must avoid side effects in legacy bot chats.
version: 1.0.1
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [migration, shell, python, quoting, debugging, hermes]
---

# Migrating Fragile Shell/Python Bridges

Use this when a legacy script mixes Bash and inline Python and starts failing during Hermes migration.

## When this applies
- Script uses inline Python with nested quotes, f-strings, or JSON parsing
- Errors look like `SyntaxError`, `unmatched '('`, or malformed inline Python
- A Hermes plugin calls a legacy script and reports a "non-fatal" local error
- You must validate behavior without sending messages into legacy OpenClaw bot chats

## Core lesson
If inline Python contains nested quoting or f-strings, **stop trying to patch the quoting in place**. Replace the inline-Python block with a **single-quoted heredoc Python block** and pass inputs as argv.

Preferred pattern:
```bash
python3 - "$JSON" "$PARSE_TMP" <<'PY'
import sys, json
raw_json = sys.argv[1]
outpath = sys.argv[2]
# parse, validate, write output
PY
```

## Recommended debugging flow
1. **Reproduce directly with the script**, not just through the plugin.
   - Run the shell script with a minimal JSON payload.
2. **Run with `bash -x`** to see the exact Python text Bash is constructing.
   - This exposes quote stripping/corruption immediately.
3. **Fix the parser boundary first**.
   - Replace fragile inline Python usage with heredoc Python.
4. **Re-run the script directly**.
5. **Only then validate through the Hermes tool/plugin**.
6. If the parser fix reveals a second bug, treat that as the next root cause rather than assuming the first fix failed.

## Migration-specific validation rule
During Hermes migration, avoid legacy OpenClaw bot/chat side effects.

Prefer this order:
1. direct script execution
2. safe Hermes tool invocation
3. plugin registration checks

Avoid legacy live harnesses that send relay/test messages unless explicitly requested.

## Common follow-on issue
After fixing the Python parser, pipeline updates may still fail locally because no role file exists yet.

If the dashboard or remote system auto-creates roles for pipeline updates, mirror that locally by creating the missing role file before writing the pipeline entry.

## Verification checklist
- Direct script call succeeds
- `bash -x` no longer shows corrupted inline Python
- Hermes tool call returns success without non-fatal stderr
- Registration test still passes
- Any debug artifacts are cleaned up afterward

## Notes from URecruit case
A legacy `update-knowledge.sh` failed because Bash mangled a quoted inline Python validation block. Replacing it with a heredoc-based Python parser fixed the syntax error. That exposed a second bug: local pipeline updates assumed the role markdown file already existed. The reusable fix was to auto-create the local role file on pipeline updates before writing candidate stage changes.
