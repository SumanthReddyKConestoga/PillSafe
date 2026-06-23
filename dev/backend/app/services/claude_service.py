"""Claude API guidance layer (Priority 7).

Only structured, de-identified attributes are ever sent — never the raw
pill/prescription image — per the Data Privacy rule (no PHI to third-party
APIs). Inert (returns None) until LLM_API_KEY is configured in .env.
"""
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

_PROMPT_TEMPLATE = """A patient is verifying their medication.
Detected pill attributes: color={color}, shape={shape}, imprint={imprint}.
DIN database returned: {candidates}.
Provide a brief, plain-language description suitable for an elderly patient or caregiver.
If no match found, describe what the pill might be and strongly advise consulting a pharmacist.
Keep response under 100 words. Simple language only."""


def is_enabled() -> bool:
    return bool(settings.LLM_API_KEY)


async def generate_pill_guidance(
    color: str, shape: str, imprint: str | None, candidates: list[dict]
) -> str | None:
    """Call Claude with structured attributes only. Returns None if no API key is set."""
    if not is_enabled():
        return None

    try:
        from anthropic import AsyncAnthropic  # noqa: PLC0415
    except ImportError:
        logger.warning("anthropic package not installed — run `pip install anthropic`.")
        return None

    prompt = _PROMPT_TEMPLATE.format(
        color=color,
        shape=shape,
        imprint=imprint or "none detected",
        candidates=candidates or "no matches",
    )

    try:
        client = AsyncAnthropic(api_key=settings.LLM_API_KEY)
        response = await client.messages.create(
            model=settings.LLM_MODEL,
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text if response.content else None
    except Exception as exc:  # noqa: BLE001 — guidance is best-effort, never fatal
        logger.error("Claude API call failed: %s", exc)
        return None
