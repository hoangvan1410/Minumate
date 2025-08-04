"""
AI-Powered Meeting Transcript Analyzer
Analyzes meeting transcripts and generates personalized summaries and emails.
Author: Assignment04
"""
 
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
from openai import OpenAI
from prompts import (
    SYSTEM_PROMPT,
    METADATA_EXTRACTION_PROMPT,
    ANALYSIS_PROMPT,
    ANALYSIS_EXAMPLES,
    PERSONALIZED_EMAIL_PROMPT,
    STAKEHOLDER_EMAIL_PROMPT,
    EMAIL_TYPE_REQUIREMENTS,
    format_bullet_points,
    format_action_items,
    get_content_focus_and_tone
)
 
 
class EmailType(Enum):
    """Types of emails to generate for different stakeholders."""
    EXECUTIVE_SUMMARY = "executive"
    TEAM_DETAILED = "team"  
    ACTION_ITEMS = "action"
    EXTERNAL_STAKEHOLDER = "external"
 
 
@dataclass
class ActionItem:
    """Structure for action items extracted from meetings."""
    task: str
    owner: str
    due_date: Optional[str]
    priority: str
    status: str = "pending"
 
 
@dataclass
class MeetingData:
    """Structure for meeting information."""
    transcript: str
    title: Optional[str] = None
    date: Optional[str] = None
    participants: Optional[List[str]] = None
    duration: Optional[str] = None
 
 
@dataclass
class MeetingSummary:
    """Structure for processed meeting summary."""
    executive_summary: str
    key_decisions: List[str]
    action_items: List[ActionItem]
    next_steps: List[str]
    risks_concerns: List[str]
    follow_up_meetings: List[str]
 
 
class MeetingTranscriptAnalyzer:
    """Production AI-powered meeting transcript analyzer using OpenAI API."""
   
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        """Initialize the analyzer with OpenAI API."""
        api_key = api_key or os.getenv("OPENAI_API_KEY")
        base_url = base_url or os.getenv("OPENAI_BASE_URL")
        self.model = os.getenv("OPENAI_MODEL", "GPT-4o-mini")
        
        self.client = OpenAI(api_key=api_key, base_url=base_url) if base_url else OpenAI(api_key=api_key)
        
        try:
            self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "Test connection"}],
                max_tokens=5
            )
            print("API connection established")
        except Exception as e:
            print(f"API connection failed: {e}")
            raise ValueError("Invalid API key or connection issue")
       
        # Initialize prompts
        self.system_prompt = SYSTEM_PROMPT
        self.analysis_examples = ANALYSIS_EXAMPLES
   
    def extract_meeting_metadata(self, transcript: str) -> Dict[str, Any]:
        """Extract meeting metadata from transcript."""
        metadata_prompt = METADATA_EXTRACTION_PROMPT.format(transcript=transcript)
 
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a precise metadata extraction assistant. Return only valid JSON."},
                    {"role": "user", "content": metadata_prompt}
                ],
                max_tokens=800,
                temperature=0.1
            )
           
            metadata = json.loads(response.choices[0].message.content.strip())
            print(f"Extracted metadata for: {metadata.get('title', 'Unknown')}")
            return metadata
           
        except (json.JSONDecodeError, Exception) as e:
            print(f"Error during metadata extraction: {e}")
            return {
                "title": "Meeting Analysis",
                "date": "Not specified",
                "participants": [{"name": "Unknown", "role": "Participant", "email_preference": "team"}],
                "duration": "Not specified",
                "suggested_email_type": "team",
                "meeting_type": "other"
            }
   
    def analyze_transcript(self, meeting_data: MeetingData) -> MeetingSummary:
        """Analyze meeting transcript and extract key information."""
        
        if not meeting_data.title or not meeting_data.participants:
            extracted_metadata = self.extract_meeting_metadata(meeting_data.transcript)
            
            meeting_data.title = meeting_data.title or extracted_metadata.get("title", "Meeting Analysis")
            meeting_data.date = meeting_data.date or extracted_metadata.get("date", "Not specified")
            
            if not meeting_data.participants:
                participants_data = extracted_metadata.get("participants", [])
                if isinstance(participants_data, list) and len(participants_data) > 0:
                    if isinstance(participants_data[0], dict):
                        meeting_data.participants = [p.get("name", "Unknown") for p in participants_data]
                        meeting_data.participants_data = participants_data
                    else:
                        meeting_data.participants = participants_data
                        meeting_data.participants_data = [{"name": name, "role": "Participant", "email_preference": "team"} for name in participants_data]
                else:
                    meeting_data.participants = ["Unknown"]
                    meeting_data.participants_data = [{"name": "Unknown", "role": "Participant", "email_preference": "team"}]
            
            meeting_data.duration = meeting_data.duration or extracted_metadata.get("duration", "Not specified")
            meeting_data.suggested_email_type = extracted_metadata.get("suggested_email_type", "team")
            meeting_data.meeting_type = extracted_metadata.get("meeting_type", "other")
        
        print(f"Analyzing meeting: {meeting_data.title}")
       
        # Create analysis prompt with few-shot examples and chain-of-thought
        participants_str = ', '.join(meeting_data.participants) if meeting_data.participants else 'Not specified'
        analysis_prompt = ANALYSIS_PROMPT.format(
            title=meeting_data.title,
            date=meeting_data.date,
            participants=participants_str,
            duration=meeting_data.duration,
            transcript=meeting_data.transcript
        )
       
        try:
            # Make API call with structured prompt
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    *self.analysis_examples,  # Few-shot examples
                    {"role": "user", "content": analysis_prompt}
                ],
                temperature=0.3,  # Lower temperature for more consistent outputs
                max_tokens=2000
            )
           
            # Parse the JSON response
            content = response.choices[0].message.content
            print("✅ Analysis completed successfully")
           
            # Extract JSON from response (handle potential markdown formatting)
            if "```json" in content:
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                json_content = content[json_start:json_end].strip()
            else:
                json_content = content.strip()
           
            analysis_data = json.loads(json_content)
           
            # Convert to structured objects
            action_items = [
                ActionItem(
                    task=item["task"],
                    owner=item["owner"],
                    due_date=item["due_date"],
                    priority=item["priority"]
                )
                for item in analysis_data["action_items"]
            ]
           
            return MeetingSummary(
                executive_summary=analysis_data["executive_summary"],
                key_decisions=analysis_data["key_decisions"],
                action_items=action_items,
                next_steps=analysis_data["next_steps"],
                risks_concerns=analysis_data["risks_concerns"],
                follow_up_meetings=analysis_data["follow_up_meetings"]
            )
           
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing AI response: {e}")
            print(f"Raw response: {content[:500]}...")
            raise ValueError("Failed to parse AI analysis response")
        except Exception as e:
            print(f"❌ Error during analysis: {e}")
            raise
   
    def generate_personalized_emails(self, meeting_summary: MeetingSummary, meeting_data: MeetingData) -> Dict[str, Dict[str, Any]]:
        """Generate personalized emails for each participant based on their role."""
        emails = {}
        participants_data = getattr(meeting_data, 'participants_data', [])
       
        for participant in participants_data:
            name = participant.get("name", "Unknown")
            role = participant.get("role", "Participant")
            email_preference = participant.get("email_preference", "team")
           
            content_style = get_content_focus_and_tone(email_preference, name)
            
            # Convert lists to comma-separated text for natural language flow
            key_decisions_text = ". ".join(meeting_summary.key_decisions)
            action_items_text = ". ".join(f"{item.task} (assigned to {item.owner}, due {item.due_date})" 
                                        for item in meeting_summary.action_items)
            next_steps_text = ". ".join(meeting_summary.next_steps)
            
            email_prompt = PERSONALIZED_EMAIL_PROMPT.format(
                name=name,
                role=role,
                email_preference=email_preference,
                content_focus=content_style["content_focus"],
                tone=content_style["tone"],
                title=meeting_data.title,
                date=meeting_data.date,
                executive_summary=meeting_summary.executive_summary,
                key_decisions=key_decisions_text,
                action_items=action_items_text,
                next_steps=next_steps_text
            )
 
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a professional communication specialist creating personalized business emails."},
                        {"role": "user", "content": email_prompt}
                    ],
                    max_tokens=800,
                    temperature=0.3
                )
               
                email_content = response.choices[0].message.content.strip()
               
                emails[name] = {
                    "content": email_content,
                    "role": role,
                    "email_type": email_preference,
                    "participant_data": participant
                }
               
            except Exception as e:
                print(f"❌ Error generating email for {name}: {e}")
                emails[name] = {
                    "content": f"Error generating personalized email for {name}. Please try again.",
                    "role": role,
                    "email_type": email_preference,
                    "participant_data": participant
                }
       
        print(f"✅ Generated {len(emails)} personalized emails")
        return emails
   
    def generate_stakeholder_email(self, meeting_summary: MeetingSummary,
                                 email_type: EmailType, recipients: List[str]) -> str:
        """Generate professional email for stakeholders."""
        # Convert lists to natural language paragraphs
        key_decisions_text = ". ".join(meeting_summary.key_decisions)
        
        # Format action items as a flowing paragraph
        action_items_text = ". ".join(
            f"{item.task} (assigned to {item.owner}, due {item.due_date}, {item.priority} priority)"
            for item in meeting_summary.action_items
        )
        
        next_steps_text = ". ".join(meeting_summary.next_steps)
        risks_text = ". ".join(meeting_summary.risks_concerns)
        follow_ups_text = ". ".join(meeting_summary.follow_up_meetings)
        
        email_prompt = STAKEHOLDER_EMAIL_PROMPT.format(
            email_type=email_type.value,
            recipients=', '.join(recipients),
            executive_summary=meeting_summary.executive_summary,
            key_decisions=key_decisions_text,
            action_items=action_items_text,
            next_steps=next_steps_text,
            risks_concerns=risks_text,
            follow_up_meetings=follow_ups_text,
            email_requirements=self._get_email_requirements(email_type)
        )
       
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional business communication expert. Generate clear, actionable, and appropriately toned emails for different stakeholder groups. Use double line breaks between paragraphs."},
                    {"role": "user", "content": email_prompt}
                ],
                temperature=0.4,  # Slightly higher for more natural language
                max_tokens=1500
            )
           
            # Process the email content to ensure proper formatting
            email_content = response.choices[0].message.content
            
            # Ensure proper line breaks between sections
            email_lines = email_content.split('\n')
            formatted_lines = []
            
            for line in email_lines:
                line = line.strip()
                if line:  # If line is not empty
                    if line.startswith('Subject:'):
                        formatted_lines.extend(['', line, ''])
                    elif line.startswith('Dear') or line.startswith('Hi '):
                        formatted_lines.extend([line, ''])
                    elif line.startswith('Best') or line.startswith('Regards') or line.startswith('Sincerely'):
                        formatted_lines.extend(['', line])
                    else:
                        formatted_lines.append(line)
            
            # Join lines with proper spacing
            email_content = '\n\n'.join(' '.join(formatted_lines).split('  '))
            print("✅ Email generated successfully")
            return email_content
           
        except Exception as e:
            print(f"❌ Error generating email: {e}")
            raise
   
    def _get_email_requirements(self, email_type: EmailType) -> str:
        """Get specific requirements for each email type."""
        return EMAIL_TYPE_REQUIREMENTS.get(email_type.value, "Generate a professional, clear, and actionable email.")
 
 
def main():
    """Main function demonstrating the analyzer usage."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY not set in environment variables")
        return
   
    try:
        analyzer = MeetingTranscriptAnalyzer(api_key)
        
        sample_meeting = MeetingData(
            title="Q4 Product Planning Meeting",
            date="2025-08-02",
            participants=["John Smith (PM)", "Sarah Johnson (Dev Lead)", "Mike Chen (Designer)", "Lisa Brown (QA)"],
            duration="90 minutes",
            transcript="""
            John: Welcome everyone to our Q4 product planning meeting. Let's start by reviewing our current progress.
           
            Sarah: We've completed 85% of the feature development for the mobile app. However, we're facing some
            performance issues that need to be addressed before launch.
           
            Mike: From a design perspective, user testing showed that we need to simplify the onboarding flow.
            I'll need two weeks to redesign the wireframes.
           
            Lisa: QA testing has identified 15 critical bugs that must be fixed before release. I estimate
            we need an additional week for thorough testing after fixes are implemented.
           
            John: Based on this feedback, I think we need to push the launch date from October 15th to November 1st.
            Sarah, can you prioritize the performance fixes? Mike, please start on the onboarding redesign immediately.
           
            Sarah: Agreed. I'll focus on the performance issues first. We might need to consider hiring
            a temporary contractor to help with the workload.
           
            John: Good point. Lisa, please prepare a detailed bug report by Friday. We'll need it for the
            executive review next week.
           
            Lisa: Will do. Also, we should consider setting up automated testing to prevent these issues
            in future releases.
           
            Mike: One concern - if we delay the mobile app, it might impact our Q4 revenue targets.
            Should we discuss this with the sales team?
           
            John: Yes, I'll set up a meeting with sales leadership for Monday. We need to align on the
            revised timeline and its business impact.
           
            Meeting concluded with agreement on the new timeline and action items assigned.
            """
        )
       
        meeting_summary = analyzer.analyze_transcript(sample_meeting)
       
        print("\nAnalysis Results:")
        print("─" * 40)
        print(f"Executive Summary:\n{meeting_summary.executive_summary}\n")
       
        print("Key Decisions:")
        for i, decision in enumerate(meeting_summary.key_decisions, 1):
            print(f"{i}. {decision}")
       
        print("\nAction Items:")
        for i, item in enumerate(meeting_summary.action_items, 1):
            print(f"{i}. {item.task} ({item.owner}) - {item.due_date} [{item.priority}]")
       
        executive_email = analyzer.generate_stakeholder_email(
            meeting_summary,
            EmailType.EXECUTIVE_SUMMARY,
            ["CEO", "VP Product", "VP Engineering"]
        )
        print("\nExecutive Email:")
        print("─" * 40)
        print(executive_email)
       
    except Exception as e:
        print(f"Error: {e}")
 
 
if __name__ == "__main__":
    main()
 
 