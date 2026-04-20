"""Native Hermes plugin for URecruit recruiter tools."""

try:
    from . import schemas, tools
except ImportError:  # pragma: no cover - supports direct test imports
    import schemas  # type: ignore
    import tools  # type: ignore


TOOLSET = "plugin_urecruit_recruiter_tools"


def register(ctx):
    ctx.register_tool(
        name="job-board",
        toolset=TOOLSET,
        schema=schemas.JOB_BOARD,
        handler=tools.job_board,
        check_fn=tools.requirements_met,
    )
    ctx.register_tool(
        name="candidate-query",
        toolset=TOOLSET,
        schema=schemas.CANDIDATE_QUERY,
        handler=tools.candidate_query,
        check_fn=tools.requirements_met,
    )
    ctx.register_tool(
        name="candidate-assignment",
        toolset=TOOLSET,
        schema=schemas.CANDIDATE_ASSIGNMENT,
        handler=tools.candidate_assignment,
        check_fn=tools.requirements_met,
    )
    ctx.register_tool(
        name="director-relay",
        toolset=TOOLSET,
        schema=schemas.DIRECTOR_RELAY,
        handler=tools.director_relay,
        check_fn=tools.requirements_met,
    )
    ctx.register_tool(
        name="update-knowledge",
        toolset=TOOLSET,
        schema=schemas.UPDATE_KNOWLEDGE,
        handler=tools.update_knowledge,
        check_fn=tools.requirements_met,
    )
    ctx.register_tool(
        name="recruiter-tools",
        toolset=TOOLSET,
        schema=schemas.RECRUITER_TOOLS,
        handler=tools.recruiter_tools,
        check_fn=tools.requirements_met,
    )
    ctx.register_tool(
        name="recruiter-stats",
        toolset=TOOLSET,
        schema=schemas.RECRUITER_STATS,
        handler=tools.recruiter_stats,
        check_fn=tools.requirements_met,
    )
