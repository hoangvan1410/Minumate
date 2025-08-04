"""Prompt utility functions for the Meeting Analyzer."""

def format_bullet_points(items, prefix='• '):
    """Format a list of items as bullet points."""
    return '\n'.join(f'{prefix}{item}' for item in items)

def format_action_items(action_items):
    """Format action items into a readable string."""
    return '\n'.join(
        f'• {item.task} (Owner: {item.owner}, Priority: {item.priority}, Due: {item.due_date or "TBD"})'
        for item in action_items
    )

def get_content_focus_and_tone(email_preference, name):
    """Get content focus and tone based on email preference."""
    if email_preference == "executive":
        return {
            "content_focus": "executive summary, key decisions, business impact, and high-level next steps",
            "tone": "concise and strategic"
        }
    elif email_preference == "action":
        return {
            "content_focus": f"action items specifically assigned to or relevant to {name}, deadlines, and immediate next steps",
            "tone": "task-focused and actionable"
        }
    elif email_preference == "external":
        return {
            "content_focus": "meeting outcomes, decisions that affect external stakeholders, and relevant next steps",
            "tone": "formal and diplomatic"
        }
    else:  # team
        return {
            "content_focus": "detailed technical discussions, all decisions, action items, and comprehensive next steps",
            "tone": "collaborative and detailed"
        }
