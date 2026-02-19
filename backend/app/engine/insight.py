"""Template-based insight generator from drivers."""
from typing import Any

DRIVER_LABELS = {
    "sleep_hours": "sleep amount",
    "sleep_quality": "sleep quality",
    "activity_minutes": "activity level",
    "mood_value": "mood",
    "typing_avg_interval_ms": "typing rhythm",
    "typing_std_ms": "typing consistency",
    "typing_backspace_ratio": "typing friction",
    "typing_fragmentation": "focus fragmentation",
}

TEMPLATES = [
    "Your {drivers} {has_have} shifted from your usual pattern. These patterns can appear before mental fatigue.",
    "We're noticing changes in {drivers}. Small adjustments often help before things feel heavier.",
    "Your baseline shows recent shifts in {drivers}. This is pattern awareness, not a diagnosis. You're in control.",
]


def _format_drivers(drivers: list[str]) -> str:
    if not drivers:
        return "signals"
    labels = [DRIVER_LABELS.get(d, d) for d in drivers[:3]]
    if len(labels) == 1:
        return labels[0]
    if len(labels) == 2:
        return f"{labels[0]} and {labels[1]}"
    return f"{labels[0]}, {labels[1]}, and {labels[2]}"


def generate_insight(drivers: list[str], status: str) -> dict[str, Any]:
    """Generate short_insight, drivers (human labels), suggested_actions (1-2)."""
    driver_str = _format_drivers(drivers)
    has_have = "has" if len(drivers) <= 1 else "have"
    import random
    template = random.choice(TEMPLATES)
    short_insight = template.format(drivers=driver_str, has_have=has_have)
    driver_labels = [DRIVER_LABELS.get(d, d) for d in drivers]
    suggested_actions = suggest_actions(drivers)
    return {
        "short_insight": short_insight,
        "drivers": driver_labels,
        "suggested_actions": suggested_actions[:2],
    }


def suggest_actions(drivers: list[str]) -> list[str]:
    """Used by insight and by interventions module. Returns action strings."""
    from app.engine.interventions import get_actions_for_drivers
    return get_actions_for_drivers(drivers)
