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
        
        print(f"🔧 Initializing OpenAI client with base_url: {base_url}")
        
        # Initialize OpenAI client with explicit parameters only
        try:
            client_kwargs = {"api_key": api_key}
            if base_url:
                client_kwargs["base_url"] = base_url
            
            print(f"🔧 Client kwargs: {list(client_kwargs.keys())}")
            self.client = OpenAI(**client_kwargs)
            print("✅ OpenAI client initialized successfully")
        except TypeError as e:
            if "proxies" in str(e):
                print(f"⚠️ Proxies error detected, trying fallback initialization...")
                # Fallback: try without any optional parameters
                try:
                    self.client = OpenAI(api_key=api_key)
                    print("✅ OpenAI client initialized with fallback method")
                except Exception as fallback_error:
                    print(f"❌ Fallback initialization failed: {fallback_error}")
                    raise
            else:
                print(f"❌ Error initializing OpenAI client: {e}")
                raise
        except Exception as e:
            print(f"❌ Error initializing OpenAI client: {e}")
            raise
        
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
        """Generate personalized emails for each participant with consistent summary content."""
        emails = {}
        participants_data = getattr(meeting_data, 'participants_data', [])
        
        # Generate consistent base content that will be the same for all participants
        key_decisions_text = ". ".join(meeting_summary.key_decisions)
        action_items_text = ". ".join(f"{item.task} (assigned to {item.owner}, due {item.due_date})" 
                                    for item in meeting_summary.action_items)
        next_steps_text = ". ".join(meeting_summary.next_steps)
        
        # Create a consistent base email content that's the same for everyone
        base_subject = f"Follow-Up on {meeting_data.title}"
        base_content = f"""Dear [NAME],

I hope this email finds you well. I wanted to follow up on our {meeting_data.date} meeting to ensure everyone is aligned on the key outcomes and next steps.

**Meeting Summary:**
{meeting_summary.executive_summary}

**Key Decisions Made:**
{key_decisions_text}

**Action Items:**
{action_items_text}

**Next Steps:**
{next_steps_text}

Please let me know if you have any questions or need clarification on any of these points. Looking forward to our continued collaboration.

Best regards,
Meeting Organizer"""
       
        for participant in participants_data:
            name = participant.get("name", "Unknown")
            role = participant.get("role", "Participant")
            email_preference = participant.get("email_preference", "team")
            
            # Replace placeholder with actual name - this is the only personalization
            personalized_content = base_content.replace("[NAME]", name)
            
            emails[name] = {
                "subject": base_subject,
                "content": personalized_content,
                "role": role,
                "email_type": email_preference,
                "participant_data": participant
            }
       
        print(f"✅ Generated {len(emails)} consistent emails")
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
 
 