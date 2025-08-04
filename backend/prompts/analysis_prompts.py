"""Analysis prompts for the Meeting Analyzer."""

ANALYSIS_PROMPT = """
Analyze the following meeting transcript and extract structured information.
Apply chain-of-thought reasoning to understand context and implications.

MEETING DETAILS:
Title: {title}
Date: {date}
Participants: {participants}
Duration: {duration}

TRANSCRIPT:
{transcript}

ANALYSIS REQUIREMENTS:
1. EXECUTIVE SUMMARY (2-3 paragraphs):
   - Key outcomes and business impact
   - Main challenges or concerns raised
   - Overall meeting sentiment and next steps

2. KEY DECISIONS (bullet points):
   - Specific decisions made during the meeting
   - Context and reasoning behind each decision

3. ACTION ITEMS (structured format):
   For each action item, extract:
   - Task description
   - Owner (person responsible)  
   - Due date (if mentioned, otherwise "TBD")
   - Priority level (Critical/High/Medium/Low based on context)

4. NEXT STEPS (ordered list):
   - Immediate actions to be taken
   - Follow-up activities mentioned

5. RISKS & CONCERNS (bullet points):
   - Potential obstacles or challenges identified
   - Business risks mentioned
   - Resource or timeline concerns

6. FOLLOW-UP MEETINGS (if mentioned):
   - Any scheduled follow-up meetings or reviews

Please provide your analysis in JSON format with the following structure:
{{
    "executive_summary": "string",
    "key_decisions": ["decision1", "decision2", ...],
    "action_items": [
        {{
            "task": "string",
            "owner": "string",
            "due_date": "string",
            "priority": "string"
        }}
    ],
    "next_steps": ["step1", "step2", ...],
    "risks_concerns": ["risk1", "risk2", ...],
    "follow_up_meetings": ["meeting1", "meeting2", ...]
}}
"""

# Example for consistent formatting
ANALYSIS_EXAMPLES = [
    {
        "role": "user",
        "content": "Analyze this meeting excerpt: 'John will update the budget spreadsheet by Friday. Sarah mentioned she'll handle the client presentation. We need to address the server issues before launch.'"
    },
    {
        "role": "assistant",
        "content": """
ACTION ITEMS:
1. Update budget spreadsheet | Owner: John | Due: Friday | Priority: High
2. Handle client presentation | Owner: Sarah | Due: TBD | Priority: Medium

KEY DECISIONS:
- Server issues must be resolved before launch

RISKS:
- Server issues could delay launch timeline
"""
    }
]
