from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

REPO_ROOT = Path.home() / ".hermes" / "hermes-agent"
PLUGIN_ROOT = Path.home() / ".hermes" / "plugins" / "urecruit-recruiter-tools"
sys.path.insert(0, str(REPO_ROOT))

from hermes_cli.plugins import PluginManager  # noqa: E402
from tools.registry import registry  # noqa: E402

TEST_AGENT = "wannakan"
TEST_PREFIX = "__TEST__HERMES__"
TEST_EMAIL = "__TEST__HERMES__test@example.com"
ENABLE_LEGACY_RELAY_TESTS = os.getenv("HERMES_ENABLE_LEGACY_RELAY_TESTS", "").strip().lower() in {"1", "true", "yes", "on"}


class Harness:
    def __init__(self) -> None:
        self.results: list[tuple[bool, str, object]] = []
        self.enable_legacy_relay_tests = ENABLE_LEGACY_RELAY_TESTS
        self.manager = PluginManager()
        self.manager.discover_and_load()
        self.plugin = self.manager._plugins.get("urecruit-recruiter-tools")
        if self.plugin is None or not self.plugin.enabled:
            raise RuntimeError(f"Plugin failed to load: {self.plugin.error if self.plugin else 'missing'}")
        self.supabase_url, self.supabase_key = self._load_supabase_env()

    def _load_supabase_env(self) -> tuple[str, str]:
        config = Path.home() / ".openclaw" / "openclaw.json"
        script = (
            "const cfg = require(process.argv[1]);"
            "const env = cfg.env || {};"
            "process.stdout.write(JSON.stringify({url: env.SUPABASE_URL || '', key: env.SUPABASE_SERVICE_ROLE_KEY || ''}));"
        )
        raw = subprocess.check_output(["node", "-e", script, str(config)], text=True)
        parsed = json.loads(raw)
        return parsed["url"].rstrip("/"), parsed["key"]

    def call_tool(self, name: str, args: dict) -> dict:
        raw = registry.dispatch(name, args)
        try:
            return json.loads(raw)
        except Exception as exc:
            raise RuntimeError(f"{name} returned non-JSON: {raw!r}") from exc

    def rest_delete(self, path: str) -> object:
        request = Request(
            f"{self.supabase_url}/rest/v1/{path}",
            method="DELETE",
            headers={
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Prefer": "return=representation",
            },
        )
        try:
            with urlopen(request, timeout=30) as response:
                text = response.read().decode()
        except HTTPError as exc:
            text = exc.read().decode()
        return json.loads(text or "[]")

    def rest_get(self, path: str) -> object:
        request = Request(
            f"{self.supabase_url}/rest/v1/{path}",
            headers={
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
            },
        )
        with urlopen(request, timeout=30) as response:
            text = response.read().decode()
        return json.loads(text or "[]")

    def cleanup(self) -> None:
        role_rows = self.rest_get("recruitment_roles?slug=like.test-*&select=id")
        role_ids = [str(row["id"]) for row in role_rows if isinstance(row, dict) and row.get("id")]
        if role_ids:
            joined = ",".join(role_ids)
            candidate_rows = self.rest_get(f"recruitment_role_candidates?recruitment_role_id=in.({joined})&select=id")
            candidate_ids = [str(row["id"]) for row in candidate_rows if isinstance(row, dict) and row.get("id")]
            if candidate_ids:
                cand_joined = ",".join(candidate_ids)
                self.rest_delete(f"recruitment_role_candidate_events?role_candidate_id=in.({cand_joined})")
                self.rest_delete(f"recruitment_role_candidates?id=in.({cand_joined})")
            self.rest_delete("recruitment_roles?slug=like.test-*")
        self.rest_delete(f"recruitment_audit_log?agent=eq.{TEST_AGENT}")
        self.rest_delete(f"candidate_assignments?assigned_to=eq.{TEST_AGENT}")
        if self.enable_legacy_relay_tests:
            self.rest_delete(f"director_relay_messages?from_user=eq.{TEST_AGENT}")

    def assert_true(self, name: str, condition: bool, details: object = None) -> None:
        self.results.append((bool(condition), name, details))

    def run(self) -> int:
        self.cleanup()

        job_add = self.call_tool(
            "job-board",
            {
                "action": "add",
                "agent": TEST_AGENT,
                "title": f"{TEST_PREFIX}Engineer",
                "location": f"{TEST_PREFIX}London",
                "company": f"{TEST_PREFIX}Corp",
                "urgency": "high",
            },
        )
        self.assert_true("job-board add ok", job_add.get("ok") is True, job_add)
        self.assert_true("job-board add role id", bool(job_add.get("role", {}).get("id")), job_add)

        job_list = self.call_tool("job-board", {"action": "list", "include_closed": True})
        roles = job_list.get("roles", []) if isinstance(job_list, dict) else []
        self.assert_true("job-board list ok", job_list.get("ok") is True and len(roles) > 0, job_list)
        self.assert_true(
            "job-board list includes test role",
            any(TEST_PREFIX in (row.get("role_title") or "") for row in roles),
            job_list,
        )

        candidate_query_summary = self.call_tool("candidate-query", {"action": "summary"})
        self.assert_true(
            "candidate-query summary ok",
            bool(candidate_query_summary.get("ok") is True or candidate_query_summary.get("total") is not None),
            candidate_query_summary,
        )

        candidate_query_lookup = self.call_tool("candidate-query", {"action": "lookup", "search": "nonexistent_test_person_xyz"})
        self.assert_true("candidate-query lookup valid", isinstance(candidate_query_lookup, dict), candidate_query_lookup)

        candidate_assignment_assign = self.call_tool(
            "candidate-assignment",
            {"action": "assign", "candidate_email": TEST_EMAIL, "assigned_to": TEST_AGENT},
        )
        self.assert_true(
            "candidate-assignment assign ok",
            bool(candidate_assignment_assign.get("ok") is True or candidate_assignment_assign.get("success") is True),
            candidate_assignment_assign,
        )

        candidate_assignment_check = self.call_tool(
            "candidate-assignment",
            {"action": "check", "candidate_email": TEST_EMAIL},
        )
        self.assert_true("candidate-assignment check valid", isinstance(candidate_assignment_check, dict), candidate_assignment_check)

        if self.enable_legacy_relay_tests:
            director_send = self.call_tool(
                "director-relay",
                {
                    "action": "send",
                    "from_user": TEST_AGENT,
                    "to_user": TEST_AGENT,
                    "content": f"{TEST_PREFIX} functional test message",
                },
            )
            self.assert_true(
                "director-relay send ok",
                bool(director_send.get("ok") is True or director_send.get("success") is True),
                director_send,
            )

            director_poll = self.call_tool("director-relay", {"action": "poll", "user": TEST_AGENT})
            self.assert_true("director-relay poll valid", isinstance(director_poll, dict), director_poll)
        else:
            self.assert_true(
                "director-relay skipped by default",
                True,
                {"skipped": True, "reason": "Set HERMES_ENABLE_LEGACY_RELAY_TESTS=1 to run legacy relay path checks."},
            )

        update_knowledge = self.call_tool(
            "update-knowledge",
            {
                "agent": TEST_AGENT,
                "type": "role",
                "action": "pipeline",
                "role": f"{TEST_PREFIX}Manager",
                "location": f"{TEST_PREFIX}Berlin",
                "client": f"{TEST_PREFIX}GmbH",
                "candidate": f"{TEST_PREFIX}Jane Doe",
                "stage": "offered",
                "detail": "Hermes plugin live test",
            },
        )
        dashboard_sync = update_knowledge.get("dashboard_sync") if isinstance(update_knowledge, dict) else None
        self.assert_true(
            "update-knowledge dashboard sync ok",
            isinstance(update_knowledge, dict)
            and update_knowledge.get("success") is True
            and isinstance(dashboard_sync, dict)
            and dashboard_sync.get("ok") is True,
            update_knowledge,
        )

        recruiter_tools = self.call_tool("recruiter-tools", {})
        self.assert_true(
            "recruiter-tools ok",
            isinstance(recruiter_tools, dict) and "recruiters" in recruiter_tools and "team_week" in recruiter_tools,
            recruiter_tools,
        )

        recruiter_stats = self.call_tool("recruiter-stats", {"recruiter": TEST_AGENT})
        self.assert_true(
            "recruiter-stats ok",
            isinstance(recruiter_stats, dict) and recruiter_stats.get("recruiter") == TEST_AGENT,
            recruiter_stats,
        )

        audit_rows = self.rest_get(
            f"recruitment_audit_log?agent=eq.{TEST_AGENT}&select=action,success&order=created_at.desc&limit=5"
        )
        self.assert_true("audit log has rows", isinstance(audit_rows, list) and len(audit_rows) > 0, audit_rows)
        self.assert_true(
            "audit log has success",
            isinstance(audit_rows, list) and any(bool(row.get("success")) for row in audit_rows if isinstance(row, dict)),
            audit_rows,
        )

        self.cleanup()

        passed = sum(1 for ok, _, _ in self.results if ok)
        total = len(self.results)
        print(json.dumps(
            {
                "plugin": self.plugin.manifest.name,
                "passed": passed,
                "total": total,
                "results": [
                    {"ok": ok, "name": name, "details": details}
                    for ok, name, details in self.results
                ],
            },
            indent=2,
        ))
        return 0 if passed == total else 1


if __name__ == "__main__":
    harness = Harness()
    raise SystemExit(harness.run())
