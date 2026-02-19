"""ChatGPT API service for AI-powered insights and signal descriptions."""
import os
from typing import Any, Optional

try:
    from openai import AsyncOpenAI
    _OPENAI_AVAILABLE = True
except ModuleNotFoundError:
    AsyncOpenAI = None  # type: ignore
    _OPENAI_AVAILABLE = False

# Initialize OpenAI client (will use OPENAI_API_KEY from environment)
_client: Any = None


def get_client() -> Optional[Any]:
    """Get OpenAI client instance, or None if package missing or API key not configured."""
    global _client
    if not _OPENAI_AVAILABLE:
        print("DEBUG: OpenAI package not available")
        return None
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("DEBUG: OPENAI_API_KEY not found in environment")
            return None
        print(f"DEBUG: OpenAI client initialized (key starts with: {api_key[:7]}...)")
        _client = AsyncOpenAI(api_key=api_key)
    return _client


async def generate_insight(drivers: list[str], status: str, user_context: dict) -> dict[str, str]:
    """
    Generate AI-powered insight text using ChatGPT.
    
    Args:
        drivers: List of driver keys (e.g., ["sleep_hours", "mood_value"])
        status: Wellbeing status ("Stable", "Watch", "High")
        user_context: Dict with user data (sleep_hours, sleep_quality, mood_value, etc.)
    
    Returns:
        Dict with "short_insight" and optionally "drivers" (human-readable labels)
    """
    client = get_client()
    if not client:
        # Fallback to template-based if API key not configured
        from app.engine.insight import generate_insight as fallback_insight
        return fallback_insight(drivers, status)
    
    # Format driver labels
    driver_labels = {
        "sleep_hours": "sleep amount",
        "sleep_quality": "sleep quality",
        "activity_minutes": "activity level",
        "mood_value": "mood",
        "typing_avg_interval_ms": "typing rhythm",
        "typing_std_ms": "typing consistency",
        "typing_backspace_ratio": "typing friction",
        "typing_fragmentation": "focus fragmentation",
    }
    
    driver_names = [driver_labels.get(d, d) for d in drivers[:3]]
    driver_str = ", ".join(driver_names) if driver_names else "general patterns"
    
    # Build context string
    context_parts = []
    if user_context.get("sleep_hours") is not None:
        context_parts.append(f"Sleep: {user_context['sleep_hours']:.1f} hours")
    if user_context.get("sleep_quality") is not None:
        context_parts.append(f"Sleep quality: {user_context['sleep_quality']:.1f}/5")
    if user_context.get("mood_value") is not None:
        context_parts.append(f"Mood: {user_context['mood_value']:.1f}/10")
    if user_context.get("activity_minutes") is not None:
        context_parts.append(f"Activity: {user_context['activity_minutes']:.0f} minutes")
    
    context_str = "; ".join(context_parts) if context_parts else "Limited data available"
    
    prompt = f"""You are a compassionate AI assistant helping home caregivers monitor their wellbeing. 

The caregiver's current wellbeing status is: {status}
Recent changes detected in: {driver_str}
Today's check-in data: {context_str}

Generate:
1. A brief, empathetic insight (2-3 sentences max) that:
   - Acknowledges what we're noticing in their patterns
   - Is supportive and non-alarming
   - Focuses on pattern awareness, not diagnosis
   - Speaks directly to someone caring for a patient at home
   - Is warm and understanding

2. Two specific, actionable micro-actions (1 short sentence each) that:
   - Are personalized based on their current data and drivers
   - Are small, achievable steps (under 5 minutes when possible)
   - Directly address the drivers we detected
   - Are practical for someone caring for a patient at home
   - Vary based on their specific situation (don't repeat the same actions every time)

Format your response as JSON:
{{
  "insight": "your insight text here",
  "actions": ["first action", "second action"]
}}

IMPORTANT: 
- Use periods or commas instead of em dashes. Never use em dashes (—) or en dashes (–).
- Make actions specific and personalized to their data.
- Vary the actions based on their current situation."""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",  # Using mini for cost efficiency
            messages=[
                {"role": "system", "content": "You are a supportive wellbeing assistant for home caregivers. Always respond with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.8,  # Higher temperature for more variety
            response_format={"type": "json_object"},
        )
        
        import json
        try:
            result = json.loads(response.choices[0].message.content.strip())
        except json.JSONDecodeError:
            # If JSON parsing fails, try to extract from text
            content = response.choices[0].message.content.strip()
            # Fallback: try to find JSON-like structure or parse as text
            print(f"Failed to parse JSON, content: {content[:200]}")
            from app.engine.insight import suggest_actions
            fallback_result = {
                "short_insight": content.split('\n')[0] if content else "We're noticing some patterns in your wellbeing.",
                "drivers": driver_names,
                "suggested_actions": suggest_actions(drivers)[:2],
            }
            return fallback_result
        
        insight_text = result.get("insight", "").strip()
        actions = result.get("actions", [])
        
        # Remove em dashes and replace with periods or commas
        insight_text = insight_text.replace('—', '. ').replace('–', '. ')
        actions = [a.replace('—', '. ').replace('–', '. ').strip() for a in actions if a.strip()]
        
        # Ensure we have at least one action, fallback if needed
        if not actions:
            from app.engine.insight import suggest_actions
            actions = suggest_actions(drivers)[:2]
        
        return {
            "short_insight": insight_text,
            "drivers": driver_names,
            "suggested_actions": actions[:2],  # Ensure max 2 actions
        }
    except Exception as e:
        # Fallback to template-based on error
        print(f"ChatGPT API error: {e}")
        from app.engine.insight import generate_insight as fallback_insight
        fallback_result = fallback_insight(drivers, status)
        # Ensure suggested_actions is included in fallback
        if "suggested_actions" not in fallback_result:
            from app.engine.insight import suggest_actions
            fallback_result["suggested_actions"] = suggest_actions(drivers)[:2]
        return fallback_result


async def generate_signal_description(signal_type: str, user_data: dict) -> str:
    """
    Generate AI-powered description for a signal (Sleep, Activity, or Typing).
    
    Args:
        signal_type: One of "sleep", "activity", "typing"
        user_data: Dict with relevant data for the signal
    
    Returns:
        Brief, personalized description string
    """
    client = get_client()
    if not client:
        print(f"DEBUG: No OpenAI client for signal {signal_type}, using fallback")
        # Fallback to static descriptions
        fallbacks = {
            "sleep": "From your check-in. Rest matters when you're caring for someone at home.",
            "activity": "Movement from check-in. Even short breaks help when you're on care duty.",
            "typing": "Rhythm from typing. No content stored. Helps us sense stress and load.",
        }
        return fallbacks.get(signal_type, "Tracking your patterns.")
    
    # Build context based on signal type
    if signal_type == "sleep":
        context = []
        if user_data.get("sleep_hours") is not None:
            context.append(f"{user_data['sleep_hours']:.1f} hours")
        if user_data.get("sleep_quality") is not None:
            context.append(f"quality: {user_data['sleep_quality']:.1f}/5")
        data_str = ", ".join(context) if context else "no recent data"
        prompt = f"""Generate a brief, empathetic 1-sentence description about sleep tracking for a home caregiver.

Their recent sleep: {data_str}

Write a warm, supportive sentence (max 20 words) that:
- Mentions sleep/rest in the context of caregiving
- Is encouraging and understanding
- Use periods or commas, never em dashes (—) or en dashes (–)
- No labels or formatting, just the sentence."""
    
    elif signal_type == "activity":
        # Convert activity_minutes back to a category for more natural description
        activity_minutes = user_data.get("activity_minutes")
        if activity_minutes is not None:
            if activity_minutes < 30:
                activity_desc = "minimal movement"
            elif activity_minutes < 90:
                activity_desc = "some movement"
            elif activity_minutes < 150:
                activity_desc = "good activity level"
            else:
                activity_desc = "very active"
        else:
            activity_desc = "no recent data"
        
        prompt = f"""Generate a brief, empathetic 1-sentence description about activity tracking for a home caregiver.

Their recent activity level: {activity_desc}

Write a warm, supportive sentence (max 20 words) that:
- Mentions movement/activity in the context of caregiving
- Is encouraging and understanding
- Does NOT mention specific numbers or minutes
- Use periods or commas, never em dashes (—) or en dashes (–)
- No labels or formatting, just the sentence."""
    
    else:  # typing
        context = []
        if user_data.get("typing_avg_interval_ms") is not None:
            context.append("typing patterns detected")
        data_str = ", ".join(context) if context else "no recent data"
        prompt = f"""Generate a brief, empathetic 1-sentence description about typing pattern tracking for a home caregiver.

Their recent typing: {data_str}

Write a warm, supportive sentence (max 20 words) that:
- Mentions typing rhythm in the context of caregiving stress
- Reassures that no content is stored
- Is encouraging and understanding
- Use periods or commas, never em dashes (—) or en dashes (–)
- No labels or formatting, just the sentence."""
    
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a supportive wellbeing assistant for home caregivers."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=50,
            temperature=0.7,
        )
        
        description = response.choices[0].message.content.strip()
        # Remove em dashes and replace with periods or commas
        description = description.replace('—', '. ').replace('–', '. ')
        return description
    except Exception as e:
        print(f"ChatGPT API error for signal {signal_type}: {e}")
        # Fallback
        fallbacks = {
            "sleep": "From your check-in. Rest matters when you're caring for someone at home.",
            "activity": "Movement from check-in. Even short breaks help when you're on care duty.",
            "typing": "Rhythm from typing. No content stored. Helps us sense stress and load.",
        }
        return fallbacks.get(signal_type, "Tracking your patterns.")


async def select_interventions(
    drivers: list[str],
    status: str,
    user_context: dict,
    all_interventions: list[str],
) -> list[str]:
    """
    Use AI to select 2-3 most relevant interventions from the full list based on user context.
    
    Args:
        drivers: List of driver keys (e.g., ["sleep_hours", "mood_value"])
        status: Wellbeing status ("Stable", "Watch", "High")
        user_context: Dict with user data (sleep_hours, sleep_quality, mood_value, activity_minutes, etc.)
        all_interventions: Full list of available intervention strings
    
    Returns:
        List of 2-3 selected intervention strings
    """
    client = get_client()
    if not client:
        # Fallback to driver-based selection
        from app.engine.interventions import get_actions_for_drivers
        return get_actions_for_drivers(drivers)
    
    # Format driver labels
    driver_labels = {
        "sleep_hours": "sleep amount",
        "sleep_quality": "sleep quality",
        "activity_minutes": "activity level",
        "mood_value": "mood",
        "typing_avg_interval_ms": "typing rhythm",
        "typing_std_ms": "typing consistency",
        "typing_backspace_ratio": "typing friction",
        "typing_fragmentation": "focus fragmentation",
    }
    
    driver_names = [driver_labels.get(d, d) for d in drivers[:3]]
    driver_str = ", ".join(driver_names) if driver_names else "general patterns"
    
    # Build context string
    context_parts = []
    if user_context.get("sleep_hours") is not None:
        context_parts.append(f"Sleep: {user_context['sleep_hours']:.1f} hours")
    if user_context.get("sleep_quality") is not None:
        context_parts.append(f"Sleep quality: {user_context['sleep_quality']:.1f}/5")
    if user_context.get("mood_value") is not None:
        mood_val = user_context['mood_value']
        if mood_val < 4:
            mood_desc = "very low"
        elif mood_val < 6:
            mood_desc = "low"
        elif mood_val < 8:
            mood_desc = "moderate"
        else:
            mood_desc = "good"
        context_parts.append(f"Mood: {mood_desc} ({mood_val:.1f}/10)")
    if user_context.get("activity_minutes") is not None:
        activity = user_context['activity_minutes']
        if activity < 30:
            activity_desc = "minimal"
        elif activity < 90:
            activity_desc = "some"
        elif activity < 150:
            activity_desc = "good"
        else:
            activity_desc = "very active"
        context_parts.append(f"Activity: {activity_desc}")
    
    context_str = "; ".join(context_parts) if context_parts else "Limited data available"
    
    # Format interventions list for the prompt
    interventions_list = "\n".join([f"{i+1}. {intervention}" for i, intervention in enumerate(all_interventions)])
    
    prompt = f"""You are a compassionate AI assistant helping home caregivers choose personalized small steps to support their wellbeing.

The caregiver's current wellbeing status is: {status}
Recent changes detected in: {driver_str}
Today's check-in data: {context_str}

Below is a list of small, actionable steps (interventions) that caregivers can take. Select 2-3 interventions that would be MOST helpful and relevant for this caregiver right now, based on their current patterns and needs.

Available interventions:
{interventions_list}

Instructions:
- Select 2-3 interventions that directly address their current patterns (especially {driver_str if driver_names else "their overall wellbeing"})
- Choose interventions that are realistic and achievable for someone caring for a patient at home
- Prioritize interventions that match their specific needs (e.g., if sleep is an issue, choose sleep-related steps)
- Return ONLY the exact text of the selected interventions, one per line
- Do not number them or add any formatting
- Never use em dashes (—) or en dashes (–). Use periods or commas instead.
- If no interventions seem relevant, choose the most generally supportive ones"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a supportive wellbeing assistant for home caregivers. Select the most relevant interventions."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200,
            temperature=0.7,
        )
        
        selected_text = response.choices[0].message.content.strip()
        # Remove em dashes from AI-generated text
        selected_text = selected_text.replace('—', '. ').replace('–', '. ')
        # Parse the response - split by newlines and filter to valid interventions
        selected_lines = [line.strip() for line in selected_text.split('\n') if line.strip()]
        # Match selected lines to actual interventions (handle slight variations)
        selected = []
        for line in selected_lines:
            # Remove numbering if present (e.g., "1. " or "- ")
            cleaned = line.lstrip('0123456789.- ').strip()
            # Find matching intervention (fuzzy match)
            for intervention in all_interventions:
                if cleaned.lower() == intervention.lower() or cleaned in intervention or intervention in cleaned:
                    if intervention not in selected:
                        selected.append(intervention)
                        break
        
        # Ensure we have 2-3 interventions
        if len(selected) < 2:
            # Fallback: add from driver-based selection
            from app.engine.interventions import get_actions_for_drivers
            fallback = get_actions_for_drivers(drivers)
            for fb in fallback:
                if fb not in selected:
                    selected.append(fb)
                    if len(selected) >= 3:
                        break
        
        return selected[:3]  # Return max 3
        
    except Exception as e:
        print(f"ChatGPT API error for intervention selection: {e}")
        # Fallback to driver-based selection
        from app.engine.interventions import get_actions_for_drivers
        return get_actions_for_drivers(drivers)
