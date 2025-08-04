"""Email generation prompts for the Meeting Analyzer."""

PERSONALIZED_EMAIL_PROMPT = """
Write a natural, conversational email to {name}, who serves as {role}. The email should be written in a {tone} style and focus primarily on {content_focus}.

Format the email exactly as follows:

Subject: Follow-Up on {title}

Dear {name},

[First paragraph - Personal greeting and context of the {date} meeting]

[Second paragraph - Share relevant points from the executive summary]
{executive_summary}

[Third paragraph - Discuss key decisions that affect their role]
{key_decisions}

[Fourth paragraph - Detail specific action items and responsibilities]
{action_items}

[Final paragraph - Next steps and future collaboration]
{next_steps}

Best regards,
[Your name and title]

Important Formatting Rules:
1. Use double line breaks between paragraphs
2. Keep the subject line separate from the body
3. Write in a {tone} style appropriate for {role}
4. Focus content on {content_focus}
5. Use proper business email structure

Write a complete email with:
- A clear, specific subject line
- A friendly yet professional greeting
- Well-structured paragraphs that flow naturally
- A proper closing with next steps or action items if needed

The email should read like a natural conversation while maintaining professionalism.
"""

STAKEHOLDER_EMAIL_PROMPT = """
Write a professional, well-structured email for {email_type} stakeholders ({recipients}). The email should flow naturally in a conversational yet professional style.

Format the email exactly as follows:

Subject: [Clear subject line about the meeting]

Dear [Appropriate greeting for {recipients}],

[First paragraph introducing the meeting purpose and executive summary]
{executive_summary}

[Second paragraph covering key decisions and their implications]
{key_decisions}

[Third paragraph detailing action items and responsibilities]
{action_items}

[Fourth paragraph about next steps and implementation]
{next_steps}

[If relevant, add a paragraph about risks and concerns]
{risks_concerns}

[Final paragraph mentioning follow-up meetings and closing thoughts]
{follow_up_meetings}

Best regards,
[Your name]

Additional Requirements:
{email_requirements}

Important Formatting Rules:
1. Use double line breaks between paragraphs
2. Keep the subject line separate from the body
3. Maintain proper spacing after greetings and before closings
4. Write in clear, complete sentences
5. Use proper business email structure

Structure the email with:
1. A clear, action-oriented subject line
2. A brief, contextual introduction
3. Body paragraphs that naturally incorporate all key information
4. A strong closing that emphasizes next steps or required actions
5. A professional signature

The final email should read like a natural business communication, not a structured report.
"""

EMAIL_TYPE_REQUIREMENTS = {
    "executive": """
- Focus on business impact and strategic decisions
- Keep it concise but comprehensive
- Highlight risks and their business implications
- Use executive-level language
- Include clear next steps and timeline impacts
""",
    "action": """
- Lead with clear action items and deadlines
- Include owner accountability
- Prioritize items by urgency
- Use bullet points and clear formatting
- Include project tracking information
""",
    "team": """
- Include comprehensive meeting details
- Technical details appropriate for the team
- Clear task assignments and expectations
- Include context for decision-making
- Encourage questions and clarifications
""",
    "external": """
- Professional but accessible tone
- Focus on outcomes and impacts relevant to external parties
- Avoid internal jargon or technical details
- Emphasize commitments and deliverables
- Maintain positive and solution-focused tone
"""
}
