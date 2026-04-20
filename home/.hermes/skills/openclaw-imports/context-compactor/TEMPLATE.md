# Rolling Summary Template

## Format for Context Compaction

This template defines the structure for maintaining compact state summaries
to maximize Moonshot cache efficiency.

### Tier 1: System Context (Static - High Cache Hit)
```
[SYSTEM]
- SOUL.md: {{soul_version}}
- AGENTS.md: {{agents_version}}  
- HEARTBEAT.md: {{heartbeat_checksum}}
- TOOLS: read, write, edit, exec, web_fetch
```

### Tier 2: Rolling State (Dynamic - Moderate Cache Hit)
```
[STATE SUMMARY - Last {{summary_age}}]
Historical Activity:
- Heartbeats processed: {{total_heartbeats}}
- Time span: {{first_timestamp}} to {{last_timestamp}}
- Actions: {{action_summary}}
- Files touched: {{unique_files_count}}
- Candidates processed: {{candidates_count}}
- Emails drafted: {{emails_count}}

Recent Activity (Last {{keep_last_n}} heartbeats):
{{recent_heartbeat_details}}

Current Queue:
{{pending_tasks}}
```

### Tier 3: Immediate Context (Dynamic - Cache Miss)
```
[CURRENT TASK]
Operation: {{current_operation}}
Target: {{target_files_or_candidates}}
Expected Output: {{expected_result}}
```

### Example Output

```
[SYSTEM]
- SOUL.md: v1.2 (helpful recruitment assistant)
- AGENTS.md: v2.0 (URecruit automation)
- HEARTBEAT.md: 8f3a9d
- TOOLS: read, write, edit, exec, web_fetch

[STATE SUMMARY - Last 2 hours]
Historical Activity:
- Heartbeats processed: 47
- Time span: 2026-02-01T04:00:00Z to 2026-02-01T06:00:00Z
- Actions: { read: 94, write: 23, edit: 8, exec: 12 }
- Files touched: 31
- Candidates processed: 12
- Emails drafted: 8

Recent Activity (Last 3 heartbeats):
1. 06:55 - Processed 3 CVs from /inbox/, scored candidates, drafted follow-ups
2. 06:50 - Updated progress-tracker.md, archived completed tasks
3. 06:45 - Checked email queue, no urgent items

Current Queue:
- 2 CVs pending review
- 1 email awaiting send approval

[CURRENT TASK]
Operation: Process CV batch
Target: /inbox/candidate_045.pdf, /inbox/candidate_046.pdf
Expected Output: Scoring rubric + draft email per candidate
```

### Token Estimates

| Component | Raw Tokens | Compact Tokens | Savings |
|-----------|-----------|---------------|---------|
| Full history (50 heartbeats) | ~15,000 | - | - |
| Rolling summary | - | ~1,200 | 92% |
| System context (cached) | ~2,000 | ~2,000 | 0% |
| Current task | ~500 | ~500 | 0% |
| **Total** | **~17,500** | **~3,700** | **79%** |

### Cache Hit Optimization

**High Cache Components (Static):**
- System prompts: 100% cache hit after first request
- Tool schemas: 100% cache hit
- Task templates: 100% cache hit

**Medium Cache Components (Semi-static):**
- Rolling summary: ~60-80% cache hit (only last few lines change)
- File structure: ~80% cache hit

**Low Cache Components (Dynamic):**
- Current task details: 0% cache hit (always new)
- Candidate CV content: 0% cache hit (always new)

**Expected Overall Cache Rate: 70-80%**

### Implementation Notes

1. **Compaction Frequency:** Run every 5-10 heartbeats or when context exceeds 80K tokens
2. **Archive Strategy:** Full details saved to dated files in `memory/`
3. **Recovery:** Can reconstruct full state from archive if needed
4. **Safety:** Always keep last N heartbeats in full detail for debugging
