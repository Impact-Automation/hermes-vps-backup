"""Tool schemas for the URecruit recruiter tools Hermes plugin."""

JOB_BOARD = {
    "name": "job-board",
    "description": (
        "Query and manage job board listings. Actions: list, add, update, close, filled, pipeline. "
        "Pass your agent name when available. Use pipeline to add or move candidates within a role."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": ["list", "add", "update", "close", "filled", "pipeline"]},
            "agent": {"type": "string", "description": "Your agent name: colin, paul, or wannakan"},
            "title": {"type": "string", "description": "Job title e.g. Senior Electrical Engineer (alias for role_type)"},
            "role_type": {"type": "string", "description": "Canonical job title field used by the edge function"},
            "location": {"type": "string"},
            "client": {"type": "string", "description": "Client company name"},
            "company": {"type": "string", "description": "Client company name (edge function field)"},
            "urgency": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
            "rate": {"type": "string"},
            "search": {"type": "string"},
            "updates": {"type": "object"},
            "include_closed": {"type": "boolean"},
            "candidate": {"type": "string", "description": "Candidate name (for filled or pipeline)"},
            "stage": {
                "type": "string",
                "enum": ["submitted", "interview", "second-round", "offered", "accepted", "withdrew", "rejected", "on-hold"],
            },
            "detail": {"type": "string"},
            "notes": {"type": "string"},
        },
        "required": ["action"],
    },
}

CANDIDATE_QUERY = {
    "name": "candidate-query",
    "description": (
        "Query the candidate pipeline. Actions: summary, list (category A-G), lookup (name/email). "
        "Lookup auto-checks job-board pipelines too."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": ["summary", "list", "lookup"]},
            "category": {"type": "string"},
            "search": {"type": "string"},
            "name": {"type": "string"},
        },
        "required": ["action"],
    },
}

CANDIDATE_ASSIGNMENT = {
    "name": "candidate-assignment",
    "description": "Assign, check, or transfer candidates. Actions: assign, check, transfer.",
    "parameters": {
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": ["assign", "check", "transfer"]},
            "candidate_email": {"type": "string"},
            "assigned_to": {"type": "string"},
            "from": {"type": "string"},
            "to": {"type": "string"},
        },
        "required": ["action"],
    },
}

DIRECTOR_RELAY = {
    "name": "director-relay",
    "description": "Send or receive messages via director relay. Actions: send, poll, mark_read.",
    "parameters": {
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": ["send", "poll", "mark_read"]},
            "from_user": {"type": "string"},
            "to_user": {"type": "string"},
            "content": {"type": "string"},
            "message_type": {"type": "string", "enum": ["message", "feature_request"]},
            "user": {"type": "string"},
            "message_ids": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["action"],
    },
}

UPDATE_KNOWLEDGE = {
    "name": "update-knowledge",
    "description": (
        "Record recruitment data. For any candidate activity (submitted/interview/offered/accepted/withdrew/rejected) "
        "use type='role' action='pipeline' with the appropriate stage. For new client openings with no candidate yet use "
        "type='role' action='create'. For hiring manager contacts use type='contact'. For market rate data use type='rate'."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "agent": {"type": "string", "enum": ["colin", "paul", "wannakan"]},
            "type": {"type": "string", "enum": ["role", "contact", "rate"]},
            "action": {"type": "string", "enum": ["pipeline", "create"]},
            "role": {"type": "string", "description": "Job title e.g. Senior Director European"},
            "location": {"type": "string"},
            "client": {"type": "string", "description": "Client company name"},
            "rate": {"type": "string"},
            "urgency": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
            "candidate": {"type": "string", "description": "Candidate full name (required when action=pipeline)"},
            "stage": {
                "type": "string",
                "enum": ["submitted", "interview", "second-round", "offered", "accepted", "withdrew", "rejected", "on-hold"],
            },
            "detail": {"type": "string"},
            "notes": {"type": "string"},
            "name": {"type": "string", "description": "Contact name (for type=contact)"},
            "company": {"type": "string", "description": "Client company (for type=contact)"},
            "topic": {"type": "string", "description": "Contact topic (for type=contact)"},
            "next_action": {"type": "string"},
            "previous": {"type": "string"},
        },
        "required": ["type"],
    },
}

RECRUITER_TOOLS = {
    "name": "recruiter-tools",
    "description": (
        "Team pipeline dashboard. Returns today and week stats for Paul, Colin, and Wannakan in one call. "
        "Use for team check-ins, SOD/EOD digests, or when asked about team performance."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "period": {"type": "string", "enum": ["today", "week", "month"], "description": "Time period focus (default: today + week)"},
        },
    },
}

RECRUITER_STATS = {
    "name": "recruiter-stats",
    "description": (
        "Get gamified daily stats for a recruiter from derrick_draft_validations. Returns today/yesterday/week/month counts, "
        "streak, personal bests, queue depth, and achievements. Use this for daily digests."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "recruiter": {"type": "string", "description": "Recruiter name as stored in validator_notes (e.g. wannakan, paul)"},
        },
        "required": ["recruiter"],
    },
}
