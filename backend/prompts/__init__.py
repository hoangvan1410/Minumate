"""Initialize the prompts package."""

from .system_prompts import SYSTEM_PROMPT, METADATA_EXTRACTION_PROMPT
from .analysis_prompts import ANALYSIS_PROMPT, ANALYSIS_EXAMPLES
from .email_prompts import (
    PERSONALIZED_EMAIL_PROMPT,
    STAKEHOLDER_EMAIL_PROMPT,
    EMAIL_TYPE_REQUIREMENTS
)
from .utils import (
    format_bullet_points,
    format_action_items,
    get_content_focus_and_tone
)

__all__ = [
    'SYSTEM_PROMPT',
    'METADATA_EXTRACTION_PROMPT',
    'ANALYSIS_PROMPT',
    'ANALYSIS_EXAMPLES',
    'PERSONALIZED_EMAIL_PROMPT',
    'STAKEHOLDER_EMAIL_PROMPT',
    'EMAIL_TYPE_REQUIREMENTS',
    'format_bullet_points',
    'format_action_items',
    'get_content_focus_and_tone'
]
