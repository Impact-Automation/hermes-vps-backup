from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
import importlib.util


LIVE_TEST_PATH = Path(__file__).with_name("live_test.py")
_spec = importlib.util.spec_from_file_location("urecruit_live_test", LIVE_TEST_PATH)
if _spec is None or _spec.loader is None:
    raise RuntimeError(f"Could not load {LIVE_TEST_PATH}")
live_test = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(live_test)


class _PluginStub:
    manifest = SimpleNamespace(name="urecruit-recruiter-tools")


def _build_harness():
    harness = live_test.Harness.__new__(live_test.Harness)
    harness.results = []
    harness.plugin = _PluginStub()
    harness.enable_legacy_relay_tests = False
    harness.cleanup = lambda: None

    def rest_get(path: str):
        if "recruitment_audit_log" in path:
            return [{"action": "pipeline", "success": True}]
        return []

    harness.rest_get = rest_get
    harness.rest_delete = lambda path: []

    def call_tool(name: str, args: dict):
        if name == "director-relay":
            raise AssertionError("live_test should not touch director-relay unless explicitly enabled")
        if name == "job-board":
            if args.get("action") == "add":
                return {"ok": True, "role": {"id": "role-1", "role_title": f"{live_test.TEST_PREFIX}Engineer"}}
            if args.get("action") == "list":
                return {"ok": True, "roles": [{"role_title": f"{live_test.TEST_PREFIX}Engineer"}]}
        if name == "candidate-query":
            if args.get("action") == "summary":
                return {"ok": True, "total": 1}
            if args.get("action") == "lookup":
                return {"ok": True, "found": False, "message": "No candidate found"}
        if name == "candidate-assignment":
            if args.get("action") == "assign":
                return {"ok": True, "assignment": {"id": "assign-1"}}
            if args.get("action") == "check":
                return {"ok": True, "assigned": True}
        if name == "update-knowledge":
            return {"success": True, "dashboard_sync": {"ok": True}, "output": ""}
        if name == "recruiter-tools":
            return {"recruiters": {}, "team_week": {}}
        if name == "recruiter-stats":
            return {"recruiter": live_test.TEST_AGENT}
        raise AssertionError(f"Unexpected tool call: {name} {args}")

    harness.call_tool = call_tool
    return harness


def test_live_test_skips_director_relay_by_default():
    harness = _build_harness()
    exit_code = harness.run()
    assert exit_code == 0
    assert any(name == "director-relay skipped by default" and ok for ok, name, _ in harness.results)


if __name__ == "__main__":
    test_live_test_skips_director_relay_by_default()
    print("ok")
