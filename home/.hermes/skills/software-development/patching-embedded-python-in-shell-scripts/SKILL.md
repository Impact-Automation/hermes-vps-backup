---
name: patching-embedded-python-in-shell-scripts
description: Safely fix legacy bash scripts that embed multi-line Python, especially when quote nesting causes SyntaxError and shell interpolation corruption.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [bash, python, debugging, legacy-scripts, quoting]
    related_skills: [systematic-debugging, test-driven-development, migrating-fragile-shell-python-bridges]
---

# Patching Embedded Python in Shell Scripts

Use this when a bash script contains `python3 -c "..."` or similar inline Python and starts failing with syntax errors that don't make sense from the source file.

## When this applies

Common symptoms:
- `SyntaxError: invalid syntax`
- `SyntaxError: f-string: unmatched '('
- tracing with `bash -x` shows the Python code is not what the file appears to contain
- nested quoting like `d.get("type")`, `%r`, or f-strings inside a shell double-quoted string

## Root cause pattern

The real bug is often **shell quoting corruption**, not the apparent Python line itself.
A line that looks valid in the file can be transformed by bash before Python sees it.

## Recommended approach

### 1. Reproduce with shell trace

Run the failing script with `bash -x` and a minimal payload.
Look at the exact `python3` invocation that bash emits.
That shows what Python actually receives.

### 2. Do not keep patching individual quotes inside `python3 -c "..."`

If the Python block is more than a few tokens long, stop trying to escape it in place.
This is brittle and usually wastes time.

### 3. Replace inline Python with a quoted heredoc form

Preferred pattern:

```bash
python3 - "$JSON" "$PARSE_TMP" <<'PY' || { echo "ERROR: JSON validation failed"; exit 1; }
import sys, json

raw_json = sys.argv[1]
outpath = sys.argv[2]

d = json.loads(raw_json)
# ... normal Python here ...
PY
```

Why this works:
- `<<'PY'` prevents shell interpolation inside the Python body
- arguments are passed explicitly via `sys.argv`
- Python can use normal quotes/f-strings safely
- debugging becomes much easier

### 4. Preserve shell output contract

If the old inline Python wrote shell-compatible assignments like:

```bash
key='value'
```

keep that exact contract so the rest of the script can still:

```bash
source "$PARSE_TMP"
```

Example safe writer:

```python
with open(outpath, "w") as f:
    for k, v in d.items():
        val = json.dumps(v) if isinstance(v, dict) else str(v)
        val = val.replace("'", "'\\''")
        f.write(f"{k}='{val}'\n")
```

### 5. Re-run the script directly before higher-level tests

Validate the shell script itself first with a debug payload.
Only then re-run plugin/integration tests.
This isolates parser bugs from downstream application behavior.

### 6. Expect secondary bugs after parser repair

Once the quote/parsing issue is fixed, the script may expose the next real logic bug.
In this case, after the parser was fixed, pipeline updates still failed because the local role file did not exist.

Fix pattern used:
- for pipeline actions, if the local role file is missing
- auto-create a minimal role markdown file locally
- then proceed with the pipeline update

This keeps local knowledge-file behavior aligned with dashboard auto-create behavior.

## Safe migration/testing note

If integration tests touch legacy messaging/relay systems, make them opt-in.
Default test behavior should avoid sending live relay messages.
Use an env flag like:

```bash
HERMES_ENABLE_LEGACY_RELAY_TESTS=1
```

and skip those checks by default.

## Verification checklist

- script passes direct invocation with a representative payload
- `bash -x` no longer shows corrupted Python source
- no `SyntaxError` from the parser block
- higher-level tool/plugin test passes without non-fatal parser errors
- any legacy relay/inbox tests are disabled by default

## Pitfalls

- fixing only one quote and leaving the inline `python3 -c` structure intact
- trusting the file contents instead of the `bash -x` emitted command
- jumping straight to full integration tests before direct script validation
- leaving legacy relay tests enabled by default during migration work
