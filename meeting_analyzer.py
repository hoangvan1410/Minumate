
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
from openai import OpenAI
from functions.transcript_chunker import TranscriptChunker, TranscriptChunk
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
        """Analyze meeting transcript and extract key information using chunking for long transcripts."""
        
        # First extract metadata from the beginning portion of the transcript
        if not meeting_data.title or not meeting_data.participants:
            # Use first chunk for metadata extraction
            initial_chunk = meeting_data.transcript[:min(len(meeting_data.transcript), 2000)]
            extracted_metadata = self.extract_meeting_metadata(initial_chunk)
            
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
        
    def _analyze_chunk(self, chunk: TranscriptChunk) -> Dict[str, Any]:
        """Analyze a single chunk of the transcript."""
        # Prepare the prompt with context
        context = "\n".join([
            f"Previous discussion: {chunk.context.get('previous_chunk_summary', 'N/A')}",
            f"Meeting title: {chunk.context.get('meeting_title', 'N/A')}",
            f"Meeting type: {chunk.context.get('meeting_type', 'N/A')}",
            f"Time period: {chunk.start_time} - {chunk.end_time}",
            f"Speakers: {', '.join(chunk.speakers)}",
            "\nTranscript chunk:\n" + chunk.text
        ])
        
        # Get completion from OpenAI
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": ANALYSIS_PROMPT.format(transcript=context)}
        ]
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        try:
            # Parse the response
            analysis = json.loads(response.choices[0].message.content)
            return analysis
        except json.JSONDecodeError:
            # Fallback if response is not valid JSON
            return {
                "summary": response.choices[0].message.content,
                "key_points": [],
                "action_items": [],
                "decisions": []
            }
        
        # Chunk the transcript for analysis
        chunks = self.chunker.smart_chunk(meeting_data.transcript)
        print(f"Split transcript into {len(chunks)} chunks for analysis")
        
        # Analyze each chunk
        chunk_analyses = []
        for i, chunk in enumerate(chunks):
            print(f"Analyzing chunk {i+1}/{len(chunks)}...")
            
            # Add context from previous chunks if available
            if i > 0:
                chunk.context["previous_chunk_summary"] = chunk_analyses[-1].get("summary", "")
            
            # Add meeting metadata to chunk context
            chunk.context.update({
                "meeting_title": meeting_data.title,
                "meeting_type": meeting_data.meeting_type,
                "participants": meeting_data.participants
            })
            
            # Analyze the chunk
            chunk_analysis = self._analyze_chunk(chunk)
            chunk_analyses.append(chunk_analysis)
        
        # Merge analyses from all chunks
        merged_analysis = self.chunker.merge_analyses(chunk_analyses)
       
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
        key_decisions = format_bullet_points(meeting_summary.key_decisions)
        action_items = format_action_items(meeting_summary.action_items)
        next_steps = format_bullet_points(meeting_summary.next_steps)
        
        # Create a consistent base email content that's the same for everyone
        base_content = f"""Subject: Follow-Up on {meeting_data.title}

Dear [NAME],

I hope this email finds you well. I wanted to follow up on our {meeting_data.date} meeting to ensure everyone is aligned on the key outcomes and next steps.

**Meeting Summary:**
{meeting_summary.executive_summary}

**Key Decisions Made:**
{key_decisions}

**Action Items:**
{action_items}

**Next Steps:**
{next_steps}

Please let me know if you have any questions or need clarification on any of these points. Looking forward to our continued collaboration.

Best regards,
Meeting Organizer"""
       
        for participant in participants_data:
            name = participant.get("name", "Unknown")
            role = participant.get("role", "Participant")
            email_preference = participant.get("email_preference", "team")
            
            # Replace placeholder with actual name - this is the only personalization
            personalized_content = base_content.replace("[NAME]", name)
            
            # Extract subject and content
            lines = personalized_content.split('\n')
            subject = lines[0].replace("Subject: ", "")
            content = '\n'.join(lines[2:])  # Skip subject line and empty line
            
            emails[name] = {
                "subject": subject,
                "content": content,
                "role": role,
                "email_type": email_preference,
                "participant_data": participant
            }
       
        print(f"✅ Generated {len(emails)} consistent emails")
        return emails
   
    def generate_stakeholder_email(self, meeting_summary: MeetingSummary,
                                 email_type: EmailType, recipients: List[str]) -> str:
        """Generate professional email for stakeholders."""
        key_decisions = format_bullet_points(meeting_summary.key_decisions)
        action_items = format_action_items(meeting_summary.action_items)
        next_steps = format_bullet_points(meeting_summary.next_steps)
        risks = format_bullet_points(meeting_summary.risks_concerns)
        follow_ups = format_bullet_points(meeting_summary.follow_up_meetings)
        
        email_prompt = STAKEHOLDER_EMAIL_PROMPT.format(
            email_type=email_type.value,
            recipients=', '.join(recipients),
            executive_summary=meeting_summary.executive_summary,
            key_decisions=key_decisions,
            action_items=action_items,
            next_steps=next_steps,
            risks_concerns=risks,
            follow_up_meetings=follow_ups,
            email_requirements=self._get_email_requirements(email_type)
        )
       
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional business communication expert. Generate clear, actionable, and appropriately toned emails for different stakeholder groups."},
                    {"role": "user", "content": email_prompt}
                ],
                temperature=0.4,  # Slightly higher for more natural language
                max_tokens=1500
            )
           
            email_content = response.choices[0].message.content
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
 
 