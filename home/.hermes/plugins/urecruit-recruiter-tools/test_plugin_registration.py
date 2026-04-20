from __future__ import annotations

import json
import os
import sys
from pathlib import Path

REPO_ROOT = Path.home() / ".hermes" / "hermes-agent"
sys.path.insert(0, str(REPO_ROOT))

from hermes_cli.plugins import PluginManager  # noqa: E402
from tools.registry import registry  # noqa: E402

EXPECTED_TOOLS = {
    "job-board",
    "candidate-query",
    "candidate-assignment",
    "director-relay",
    "update-knowledge",
    "recruiter-tools",
    "recruiter-stats",
}


def main() -> int:
    os.environ.setdefault("HERMES_HOME", str(Path.home() / ".hermes"))
    manager = PluginManager()
    manager.discover_and_load()

    plugin = manager._plugins.get("urecruit-recruiter-tools")
    if plugin is None:
        print(json.dumps({"ok": False, "error": "plugin not loaded"}))
        return 1

    actual = set(plugin.tools_registered)
    missing = sorted(EXPECTED_TOOLS - actual)
    extra = sorted(actual - EXPECTED_TOOLS)
    print(json.dumps({
        "ok": not missing,
        "loaded": plugin.enabled,
        "plugin_error": plugin.error,
        "registered_tools": sorted(actual),
        "missing": missing,
        "extra": extra,
        "registry_contains_all": all(name in registry._tools for name in EXPECTED_TOOLS),
    }, indent=2))
    return 0 if (plugin.enabled and not missing) else 1


if __name__ == "__main__":
    raise SystemExit(main())
