# utils/llm_features/notes_generator.py - ULTRA FAST LOCAL VERSION

import os
import logging
import re
from transformers import pipeline

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NotesGenerator:
    def __init__(self):
        self.summarizer = None
        self._initialize_summarizer()
    
    def _initialize_summarizer(self):
        """Initialize with fast local model"""
        try:
            self.summarizer = pipeline(
                "summarization",
                model="sshleifer/distilbart-cnn-12-6",  # Fast and reliable
                max_length=1024
            )
            logger.info("Fast notes generator initialized")
        except Exception as e:
            logger.error(f"Error initializing: {e}")
            self.summarizer = None
    
    def _read_transcript(self):
        transcript_path = "data/transcripts/transcript_cleaned.txt"
        with open(transcript_path, 'r', encoding='utf-8') as f:
            return f.read().strip()
    
    def _extract_key_points(self, text, num_points=10):
        """Extract key points using simple text analysis"""
        # Split into sentences
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
        
        # Score sentences by importance (simple heuristic)
        scored_sentences = []
        for sentence in sentences:
            score = 0
            # Longer sentences often have more content
            score += min(len(sentence.split()), 50) / 2
            # Sentences with key terms
            key_terms = ['important', 'key', 'main', 'essential', 'must', 'should', 'because', 'therefore']
            if any(term in sentence.lower() for term in key_terms):
                score += 10
            # Questions often indicate important concepts
            if '?' in sentence:
                score += 5
            
            scored_sentences.append((score, sentence))
        
        # Get top sentences
        scored_sentences.sort(reverse=True)
        return [sentence for _, sentence in scored_sentences[:num_points]]
    
    def _create_structured_notes_local(self, content):
        """Create structured notes using local processing"""
        # Use summarization for main content
        if self.summarizer and len(content.split()) > 100:
            try:
                summary = self.summarizer(
                    content[:2000],
                    max_length=300,
                    min_length=150,
                    do_sample=False
                )[0]['summary_text']
            except:
                summary = "Key concepts from the educational content."
        else:
            summary = "Key concepts from the educational content."
        
        # Extract key points
        key_points = self._extract_key_points(content)
        
        # Build structured notes
        notes = f"""# Educational Notes

## Summary
{summary}

## Key Points
"""
        # Add key points
        for point in key_points[:8]:
            notes += f"- {point}\n"
        
        notes += """
## Core Concepts
- Main ideas and important information
- Essential understanding from the content

## Applications
- Practical usage and examples
- Real-world implementation
"""
        return notes
    
    def generate_detailed_notes(self):
        """Ultra-fast notes generation"""
        try:
            transcript = self._read_transcript()
            
            if not transcript:
                return "No transcript available."
            
            logger.info("Generating ultra-fast local notes...")
            
            notes = self._create_structured_notes_local(transcript)
            
            logger.info(f"Local notes generated: {len(notes.split())} words")
            return notes
            
        except Exception as e:
            logger.error(f"Local notes error: {e}")
            # Absolute fallback
            return """# Educational Notes

## Key Concepts
- Important ideas from the video content
- Main topics covered in the lecture

## Summary
Educational content extracted and organized for study purposes.

## Study Points
- Review the main concepts
- Understand the key principles
- Apply the learning to practical situations"""

# Create global instance
notes_generator_instance = NotesGenerator()

def generate_detailed_notes():
    return notes_generator_instance.generate_detailed_notes()