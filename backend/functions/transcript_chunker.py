"""
Transcript Chunker for handling long meeting transcripts.
Implements intelligent chunking strategies for processing long text.
"""

import re
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class TranscriptChunk:
    """Represents a chunk of the transcript with metadata."""
    text: str
    start_time: str = ""
    end_time: str = ""
    speakers: List[str] = None
    context: Dict[str, Any] = None

    def __post_init__(self):
        if self.speakers is None:
            self.speakers = []
        if self.context is None:
            self.context = {}


class TranscriptChunker:
    """Handles chunking of long meeting transcripts."""
    
    def __init__(self, max_chunk_size: int = 6000):
        """Initialize the chunker with maximum chunk size."""
        self.max_chunk_size = max_chunk_size

    def extract_timestamp(self, line: str) -> str:
        """Extract timestamp from a line if present."""
        timestamp_pattern = r'\[(\d{2}:\d{2}(?::\d{2})?)\]'
        match = re.search(timestamp_pattern, line)
        return match.group(1) if match else ""

    def extract_speaker(self, line: str) -> str:
        """Extract speaker name from a line if present."""
        speaker_pattern = r'^([^:]+):'
        match = re.search(speaker_pattern, line)
        return match.group(1).strip() if match else ""

    def smart_chunk(self, transcript: str) -> List[TranscriptChunk]:
        """
        Intelligently chunk the transcript based on semantic and structural markers:
        - Semantic topic changes
        - Discussion flow breaks
        - Speaker changes
        - Time gaps
        - Natural paragraph breaks
        """
        # First pass: Split into semantic segments
        semantic_segments = self._split_by_semantics(transcript)
        
        chunks: List[TranscriptChunk] = []
        current_chunk: List[str] = []
        current_speakers: set = set()
        chunk_start_time = ""
        current_size = 0
        current_topic = ""

        for segment in semantic_segments:
            segment_lines = segment.split('\n')
            segment_topic = self._extract_topic(segment)
            
            for line in segment_lines:
                line = line.strip()
                if not line:
                    continue

                # Extract timestamp and speaker
                timestamp = self.extract_timestamp(line)
                speaker = self.extract_speaker(line)
                
                # Check if we need to start a new chunk
                should_split = (
                    current_size > self.max_chunk_size or
                    (current_topic and segment_topic != current_topic) or
                    self._is_major_topic_shift(line, current_chunk[-1] if current_chunk else "")
                )

                if should_split and current_chunk:
                    chunks.append(TranscriptChunk(
                        text='\n'.join(current_chunk),
                        start_time=chunk_start_time,
                        end_time=timestamp or chunks[-1].end_time if chunks else "",
                        speakers=list(current_speakers),
                        context={"topic": current_topic}
                    ))
                    current_chunk = []
                    current_size = 0
                    current_speakers = set()
                    chunk_start_time = timestamp
                    current_topic = segment_topic

                # Add line to current chunk
                current_chunk.append(line)
                current_size += len(line)
                if speaker:
                    current_speakers.add(speaker)
                if timestamp and not chunk_start_time:
                    chunk_start_time = timestamp
                if not current_topic:
                    current_topic = segment_topic

        # Add final chunk
        if current_chunk:
            chunks.append(TranscriptChunk(
                text='\n'.join(current_chunk),
                start_time=chunk_start_time,
                end_time=self.extract_timestamp(current_chunk[-1]) or "",
                speakers=list(current_speakers),
                context={"topic": current_topic}
            ))

        return chunks

    def _split_by_semantics(self, transcript: str) -> List[str]:
        """Split transcript into semantic segments using key phrases and context."""
        segments = []
        current_segment = []
        lines = transcript.split('\n')
        
        for i, line in enumerate(lines):
            current_segment.append(line)
            
            # Check for semantic breaks
            if i < len(lines) - 1:
                current_context = ' '.join(current_segment[-5:])  # Look at last few lines for context
                next_line = lines[i + 1]
                
                if self._is_semantic_break(current_context, next_line):
                    segments.append('\n'.join(current_segment))
                    current_segment = []
        
        if current_segment:
            segments.append('\n'.join(current_segment))
        
        return segments

    def _is_semantic_break(self, current_context: str, next_line: str) -> bool:
        """Detect semantic breaks in the discussion flow."""
        # Topic transition phrases
        topic_transitions = [
            r'moving on to',
            r'next item',
            r'regarding',
            r'lets discuss',
            r'turning to',
            r'speaking of',
            r'about the',
            r'on the topic of'
        ]
        
        # Conclusion phrases
        conclusion_phrases = [
            r'in conclusion',
            r'to summarize',
            r'wrapping up',
            r'finally',
            r'in summary'
        ]
        
        # Question or discussion starters
        discussion_starters = [
            r'what (do|are|if|about)',
            r'how (should|do|would|can)',
            r'should we',
            r'could we',
            r'lets think about'
        ]
        
        next_line_lower = next_line.lower()
        
        # Check for topic transitions
        if any(re.search(pattern, next_line_lower) for pattern in topic_transitions):
            return True
            
        # Check for conclusion phrases
        if any(re.search(pattern, next_line_lower) for pattern in conclusion_phrases):
            return True
            
        # Check for new discussion starters
        if any(re.search(pattern, next_line_lower) for pattern in discussion_starters):
            return True
            
        # Check for significant speaker or context shifts
        if self._is_major_topic_shift(current_context, next_line):
            return True
            
        return False

    def _extract_topic(self, segment: str) -> str:
        """Extract the main topic from a segment."""
        # Look for explicit topic markers
        topic_patterns = [
            r'discussing (.+?)(\.|\n|$)',
            r'topic: (.+?)(\.|\n|$)',
            r'regarding (.+?)(\.|\n|$)',
            r'about (.+?)(\.|\n|$)'
        ]
        
        for pattern in topic_patterns:
            match = re.search(pattern, segment.lower())
            if match:
                return match.group(1).strip()
        
        # If no explicit topic found, use first substantive sentence
        sentences = re.split(r'[.!?]+', segment)
        if sentences:
            return sentences[0].strip()
        
        return ""

    def _is_major_topic_shift(self, current_text: str, next_text: str) -> bool:
        """Detect major shifts in discussion topic."""
        # Keywords that might indicate topic areas
        topic_keywords = {
            'technical': set(['code', 'bug', 'feature', 'development', 'testing']),
            'business': set(['cost', 'budget', 'client', 'revenue', 'market']),
            'planning': set(['schedule', 'timeline', 'deadline', 'plan', 'milestone']),
            'design': set(['ui', 'ux', 'design', 'layout', 'interface']),
            'team': set(['team', 'staff', 'hire', 'role', 'responsibility'])
        }
        
        # Get current and next topics
        current_words = set(current_text.lower().split())
        next_words = set(next_text.lower().split())
        
        # Determine topic areas for each text
        current_topics = set()
        next_topics = set()
        
        for topic, keywords in topic_keywords.items():
            if current_words & keywords:
                current_topics.add(topic)
            if next_words & keywords:
                next_topics.add(topic)
        
        # Check if there's a significant topic shift
        return bool(next_topics) and not (current_topics & next_topics)

    def _is_topic_transition(self, line: str) -> bool:
        """
        Detect if a line indicates a topic transition.
        Looks for markers like "Moving on to", "Next topic", "Let's discuss", etc.
        """
        transition_markers = [
            r'moving on to',
            r'next topic',
            r"let's discuss",
            r'turning to',
            r'regarding',
            r'about the',
            r'discussing',
            r'new agenda item',
            r'new topic'
        ]
        
        line_lower = line.lower()
        return any(re.search(marker, line_lower) for marker in transition_markers)

    def merge_analyses(self, chunk_analyses: List[Dict]) -> Dict:
        """
        Merge analyses from multiple chunks into a cohesive summary.
        Implements smart deduplication and consolidation of information.
        """
        merged = {
            "key_points": [],
            "action_items": [],
            "decisions": [],
            "summary": ""
        }
        
        seen_points = set()
        seen_actions = set()
        seen_decisions = set()
        summaries = []

        for analysis in chunk_analyses:
            # Merge key points with deduplication
            for point in analysis.get("key_points", []):
                point_text = str(point).lower()
                if point_text not in seen_points:
                    merged["key_points"].append(point)
                    seen_points.add(point_text)

            # Merge action items with deduplication
            for action in analysis.get("action_items", []):
                action_text = str(action).lower()
                if action_text not in seen_actions:
                    merged["action_items"].append(action)
                    seen_actions.add(action_text)

            # Merge decisions with deduplication
            for decision in analysis.get("decisions", []):
                decision_text = str(decision).lower()
                if decision_text not in seen_decisions:
                    merged["decisions"].append(decision)
                    seen_decisions.add(decision_text)

            # Collect summaries for final consolidation
            if analysis.get("summary"):
                summaries.append(analysis["summary"])

        # Create consolidated summary
        if summaries:
            merged["summary"] = self._consolidate_summaries(summaries)

        return merged

    def _consolidate_summaries(self, summaries: List[str]) -> str:
        """
        Consolidate multiple chunk summaries into a coherent overall summary.
        """
        # Join all summaries with proper transitions
        consolidated = " ".join(summaries)
        
        # Remove redundant phrases and transitions
        redundant_phrases = [
            r'in this part of the meeting,',
            r'during this segment,',
            r'in this section,',
            r'moving on,',
            r'additionally,'
        ]
        
        for phrase in redundant_phrases:
            consolidated = re.sub(phrase, '', consolidated, flags=re.IGNORECASE)
        
        return consolidated.strip()
