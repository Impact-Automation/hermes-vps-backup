"""Tool handlers for the URecruit recruiter tools Hermes plugin."""

from __future__ import annotations

import json
import os
import subprocess
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

OPENCLAW_CONFIG = Path.home() / ".openclaw" / "openclaw.json"
DEBUG_LOG = Path("/tmp/urecruit-recruiter-tools.log")
WORKSPACE_MAP = {
    "main": "/home/moltbot/.openclaw/workspace",
    "colin": "/home/moltbot/.openclaw/workspace-colin",
    "paul": "/home/moltbot/.openclaw/workspace-paul",
    "wannakan": "/home/moltbot/.openclaw/workspace-wannakan",
}
TEAM_RECRUITERS = ("paul", "colin", "wannakan")


def _log(message: str) -> None:
    try:
        DEBUG_LOG.write_text(
            (DEBUG_LOG.read_text() if DEBUG_LOG.exists() else "")
            + f"[{datetime.now(timezone.utc).isoformat()}] {message}\n"
        )
    except Exception:
        pass


@lru_cache(maxsize=1)
def _load_supabase_env() -> Dict[str, str]:
    env = {
        "SUPABASE_URL": os.getenv("SUPABASE_URL", ""),
        "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
    }
    if env["SUPABASE_URL"] and env["SUPABASE_SERVICE_ROLE_KEY"]:
        return env

    if OPENCLAW_CONFIG.exists():
        script = (
            "const path = process.argv[1];"
            "const cfg = require(path);"
            "const env = cfg.env || {};"
            "process.stdout.write(JSON.stringify({"
            "SUPABASE_URL: env.SUPABASE_URL || '',"
            "SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY || ''"
            "}));"
        )
        output = subprocess.check_output(["node", "-e", script, str(OPENCLAW_CONFIG)], text=True).strip()
        parsed = json.loads(output or "{}")
        env["SUPABASE_URL"] = parsed.get("SUPABASE_URL", "")
        env["SUPABASE_SERVICE_ROLE_KEY"] = parsed.get("SUPABASE_SERVICE_ROLE_KEY", "")
    return env


@lru_cache(maxsize=1)
def requirements_met() -> bool:
    env = _load_supabase_env()
    return bool(env.get("SUPABASE_URL") and env.get("SUPABASE_SERVICE_ROLE_KEY"))


@lru_cache(maxsize=1)
def _supabase_base() -> tuple[str, str]:
    env = _load_supabase_env()
    url = env.get("SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return url, key


@lru_cache(maxsize=1)
def _update_script_paths() -> Dict[str, str]:
    return {
        agent: str(Path(ws) / "skills" / "update-knowledge.sh")
        for agent, ws in WORKSPACE_MAP.items()
        if agent != "main"
    }


def _json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False)



def _request_json(method: str, url: str, *, headers: Dict[str, str], payload: Dict[str, Any] | None = None) -> Any:
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = Request(url, data=body, headers=headers, method=method)
    try:
        with urlopen(request, timeout=30) as response:
            text = response.read().decode("utf-8")
    except HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(text)
        except Exception:
            parsed = {"raw": text}
        return {"error": f"HTTP {exc.code}", "details": parsed}
    except URLError as exc:
        return {"error": f"Network error: {exc.reason}"}
    except Exception as exc:
        return {"error": f"Request failed: {type(exc).__name__}: {exc}"}

    try:
        return json.loads(text)
    except Exception:
        return {"raw": text}



def _call_edge_function(function_name: str, payload: Dict[str, Any], query_params: str = "") -> Any:
    url, key = _supabase_base()
    full_url = f"{url}/functions/v1/{function_name}{query_params}"
    _log(f"edge {function_name}: {payload}")
    return _request_json(
        "POST",
        full_url,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        payload=payload,
    )



def _query_postgrest(table: str, params: Dict[str, Any]) -> Any:
    url, key = _supabase_base()
    query = "&".join(f"{k}={quote(str(v), safe='(),.*') }" for k, v in params.items())
    full_url = f"{url}/rest/v1/{table}?{query}"
    _log(f"postgrest {table}: {params}")
    return _request_json(
        "GET",
        full_url,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
        },
    )



def _count_status(rows: list[dict], status: str) -> int:
    return sum(1 for row in rows if row.get("validation_status") == status)



def _to_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None



def _resolve_agent(agent: str | None) -> str:
    candidate = (agent or "").strip().lower()
    return candidate if candidate in {"colin", "paul", "wannakan"} else "paul"



def job_board(args: dict, **kwargs) -> str:
    payload = dict(args)
    payload["agent"] = _resolve_agent(payload.get("agent"))
    if payload.get("title") and not payload.get("role_type"):
        payload["role_type"] = payload.pop("title")
    result = _call_edge_function("colin-job-board", payload)
    return _json(result)



def candidate_query(args: dict, **kwargs) -> str:
    payload = dict(args)
    if payload.get("action") == "lookup" and payload.get("search") and not payload.get("name"):
        payload["name"] = payload["search"]

    result = _call_edge_function("candidate-query", payload)
    search_term = (payload.get("name") or payload.get("search") or "").strip().lower()
    no_results = (
        isinstance(result, dict)
        and result.get("ok") is True
        and (
            result.get("found") is False
            or result.get("count") == 0
            or not result.get("results")
        )
    )

    if payload.get("action") == "lookup" and search_term and (no_results or (isinstance(result, dict) and result.get("error"))):
        board = _call_edge_function("colin-job-board", {"action": "list"})
        roles = board.get("roles", []) if isinstance(board, dict) else []
        matches = []
        for role in roles:
            for entry in role.get("pipeline") or []:
                name = (entry.get("name") or "").lower()
                if search_term and search_term in name:
                    matches.append(
                        {
                            "candidate": entry.get("name"),
                            "email": entry.get("email"),
                            "stage": entry.get("stage"),
                            "notes": entry.get("notes"),
                            "role": role.get("role_title"),
                            "location": role.get("location"),
                            "client": role.get("client"),
                            "role_status": role.get("status"),
                            "added": entry.get("addedAt"),
                            "updated": entry.get("updatedAt"),
                        }
                    )
        if matches:
            return _json({"ok": True, "source": "job-board-pipeline", "candidates": matches})

    if payload.get("action") == "lookup" and isinstance(result, dict) and result.get("ok") and result.get("found") and result.get("results"):
        board = _call_edge_function("colin-job-board", {"action": "list"})
        roles = board.get("roles", []) if isinstance(board, dict) else []
        pipeline_context = []
        for role in roles:
            for entry in role.get("pipeline") or []:
                name = (entry.get("name") or "").lower()
                if search_term and search_term in name:
                    pipeline_context.append(
                        {
                            "role": role.get("role_title"),
                            "location": role.get("location"),
                            "client": role.get("client"),
                            "stage": entry.get("stage"),
                            "role_status": role.get("status"),
                        }
                    )
        if pipeline_context:
            result["pipeline_roles"] = pipeline_context

    return _json(result)



def candidate_assignment(args: dict, **kwargs) -> str:
    result = _call_edge_function("candidate-assignment", dict(args))
    return _json(result)



def director_relay(args: dict, **kwargs) -> str:
    result = _call_edge_function("director-relay", dict(args))
    return _json(result)



def update_knowledge(args: dict, **kwargs) -> str:
    payload = dict(args)
    agent = _resolve_agent(payload.get("agent"))
    payload["agent"] = agent

    dashboard_sync = None
    if payload.get("type") == "role" and payload.get("action") == "pipeline" and payload.get("candidate"):
        pipeline_payload = {
            "action": "pipeline",
            "role_type": payload.get("role"),
            "location": payload.get("location"),
            "company": payload.get("client"),
            "candidate": payload.get("candidate"),
            "stage": payload.get("stage"),
            "detail": payload.get("detail"),
            "agent": agent,
        }
        dashboard_sync = _call_edge_function("colin-job-board", pipeline_payload)

    script = Path(_update_script_paths().get(agent, ""))
    if not script.exists():
        return _json(
            {
                "success": True,
                "agent": agent,
                "dashboard_sync": dashboard_sync,
                "note": "Dashboard updated. Local knowledge script not found.",
            }
        )

    try:
        completed = subprocess.run(
            ["bash", str(script), json.dumps(payload)],
            cwd=str(Path(WORKSPACE_MAP[agent])),
            timeout=10,
            capture_output=True,
            text=True,
            env={**os.environ, "HOME": "/home/moltbot"},
            check=False,
        )
    except Exception as exc:
        return _json(
            {
                "success": True,
                "agent": agent,
                "dashboard_sync": dashboard_sync,
                "note": f"Dashboard updated. Local knowledge file error (non-fatal): {exc}",
            }
        )

    if completed.returncode == 0:
        return _json(
            {
                "success": True,
                "agent": agent,
                "dashboard_sync": dashboard_sync,
                "output": completed.stdout.strip(),
            }
        )

    return _json(
        {
            "success": True,
            "agent": agent,
            "dashboard_sync": dashboard_sync,
            "note": "Dashboard updated. Local knowledge file error (non-fatal).",
            "stderr": completed.stderr.strip(),
        }
    )



def recruiter_tools(args: dict, **kwargs) -> str:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    ninety_days_ago = now - timedelta(days=90)

    results: Dict[str, Any] = {}
    for recruiter in TEAM_RECRUITERS:
        rows = _query_postgrest(
            "derrick_draft_validations",
            {
                "select": "validation_status,validated_at",
                "validation_status": "neq.pending",
                "validator_notes": f"eq.{recruiter}",
                "validated_at": f"gte.{ninety_days_ago.isoformat()}",
                "order": "validated_at.desc",
                "limit": "1000",
            },
        )
        if not isinstance(rows, list):
            results[recruiter] = {"error": "query failed", "details": rows}
            continue

        today_rows = [row for row in rows if (_to_datetime(row.get("validated_at")) or datetime.min.replace(tzinfo=timezone.utc)) >= today_start]
        week_rows = [row for row in rows if (_to_datetime(row.get("validated_at")) or datetime.min.replace(tzinfo=timezone.utc)) >= week_start]

        day_set = {
            dt.date().isoformat()
            for row in rows
            if (dt := _to_datetime(row.get("validated_at"))) is not None
        }
        streak = 0
        for i in range(90):
            day = (now - timedelta(days=i)).date().isoformat()
            if day in day_set:
                streak += 1
            elif i == 0:
                continue
            else:
                break

        daily_counts: Dict[str, int] = {}
        for row in rows:
            dt = _to_datetime(row.get("validated_at"))
            if dt is not None and row.get("validation_status") == "approved":
                day = dt.date().isoformat()
                daily_counts[day] = daily_counts.get(day, 0) + 1

        results[recruiter] = {
            "today": {
                "approved": _count_status(today_rows, "approved"),
                "rejected": _count_status(today_rows, "rejected"),
                "total": len(today_rows),
            },
            "week": {
                "approved": _count_status(week_rows, "approved"),
                "rejected": _count_status(week_rows, "rejected"),
                "total": len(week_rows),
            },
            "streak": streak,
            "personal_best": max([0, *daily_counts.values()]),
        }

    pending_rows = _query_postgrest(
        "derrick_draft_validations",
        {
            "select": "id",
            "validation_status": "eq.pending",
            "draft_status": "eq.pending_approval",
            "limit": "100",
        },
    )
    queue_depth = len(pending_rows) if isinstance(pending_rows, list) else 0

    team_today = {"approved": 0, "total": 0}
    team_week = {"approved": 0, "total": 0}
    for item in results.values():
        if isinstance(item, dict) and "today" in item:
            team_today["approved"] += item["today"]["approved"]
            team_today["total"] += item["today"]["total"]
        if isinstance(item, dict) and "week" in item:
            team_week["approved"] += item["week"]["approved"]
            team_week["total"] += item["week"]["total"]

    return _json(
        {
            "date": now.date().isoformat(),
            "day": now.strftime("%a"),
            "recruiters": results,
            "team_today": team_today,
            "team_week": team_week,
            "queue_depth": queue_depth,
        }
    )



def recruiter_stats(args: dict, **kwargs) -> str:
    recruiter = (args.get("recruiter") or "").strip().lower()
    if not recruiter:
        return _json({"error": "recruiter is required"})

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)
    ninety_days_ago = now - timedelta(days=90)

    rows = _query_postgrest(
        "derrick_draft_validations",
        {
            "select": "validation_status,validated_at,rejection_reason,triage_category",
            "validation_status": "neq.pending",
            "validator_notes": f"eq.{recruiter}",
            "validated_at": f"gte.{ninety_days_ago.isoformat()}",
            "order": "validated_at.desc",
            "limit": "1000",
        },
    )
    if not isinstance(rows, list):
        return _json({"error": "Query failed", "details": rows})

    def in_window(row: dict, start: datetime, end: datetime | None = None) -> bool:
        dt = _to_datetime(row.get("validated_at"))
        if dt is None:
            return False
        if dt < start:
            return False
        if end is not None and dt >= end:
            return False
        return True

    today_rows = [row for row in rows if in_window(row, today_start)]
    yesterday_rows = [row for row in rows if in_window(row, yesterday_start, today_start)]
    week_rows = [row for row in rows if in_window(row, week_start)]
    month_rows = [row for row in rows if in_window(row, month_start)]

    today = {
        "approved": _count_status(today_rows, "approved"),
        "rejected": _count_status(today_rows, "rejected"),
        "dismissed": _count_status(today_rows, "dismissed"),
        "total": len(today_rows),
    }
    yesterday = {
        "approved": _count_status(yesterday_rows, "approved"),
        "total": len(yesterday_rows),
    }
    week = {
        "approved": _count_status(week_rows, "approved"),
        "rejected": _count_status(week_rows, "rejected"),
        "dismissed": _count_status(week_rows, "dismissed"),
        "total": len(week_rows),
    }
    month = {
        "approved": _count_status(month_rows, "approved"),
        "rejected": _count_status(month_rows, "rejected"),
        "dismissed": _count_status(month_rows, "dismissed"),
        "total": len(month_rows),
    }

    day_set = {
        dt.date().isoformat()
        for row in rows
        if (dt := _to_datetime(row.get("validated_at"))) is not None
    }
    streak = 0
    for i in range(90):
        day = (now - timedelta(days=i)).date().isoformat()
        if day in day_set:
            streak += 1
        elif i == 0:
            continue
        else:
            break

    daily_counts: Dict[str, int] = {}
    for row in rows:
        dt = _to_datetime(row.get("validated_at"))
        if dt is not None and row.get("validation_status") == "approved":
            day = dt.date().isoformat()
            daily_counts[day] = daily_counts.get(day, 0) + 1
    pb_approvals = max([0, *daily_counts.values()])
    total_approvals = _count_status(rows, "approved")

    pending_rows = _query_postgrest(
        "derrick_draft_validations",
        {
            "select": "id",
            "validation_status": "eq.pending",
            "draft_status": "eq.pending_approval",
            "limit": "100",
        },
    )
    queue_depth = len(pending_rows) if isinstance(pending_rows, list) else 0

    achievements = []
    if today["total"] >= 5 and today["rejected"] == 0:
        achievements.append("Clean Sheet")
    if yesterday["total"] > 0 and today["approved"] > yesterday["approved"]:
        achievements.append("Derby Winner")
    if streak >= 7:
        achievements.append("Captain's Armband")
    if streak >= 30:
        achievements.append("Invincibles")
    if total_approvals >= 100:
        achievements.append("Century Club")
    if pb_approvals > 0 and today["approved"] >= pb_approvals and today["approved"] > 0:
        achievements.append("New Personal Best")

    return _json(
        {
            "recruiter": recruiter,
            "today": today,
            "yesterday": yesterday,
            "week": week,
            "month": month,
            "streak": streak,
            "personal_best_approvals": pb_approvals,
            "total_approvals": total_approvals,
            "queue_depth": queue_depth,
            "weekly_avg_per_day": round(week["total"] / 7, 1) if week["total"] > 0 else 0,
            "achievements": achievements,
        }
    )
