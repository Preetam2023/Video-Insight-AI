# utils/llm_features/notes_generator.py - IMPROVED VERSION

import os
import logging
import re
import time
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
                model="sshleifer/distilbart-cnn-12-6",
                max_length=1024
            )
            logger.info("Fast notes generator initialized")
        except Exception as e:
            logger.error(f"Error initializing: {e}")
            self.summarizer = None
    
    def _read_latest_transcript(self):
        """Read the most recent cleaned transcript"""
        try:
            # Check for the latest cleaned transcript
            cleaned_path = "data/transcripts/cleaned_transcript.txt"
            english_path = "data/transcripts/transcript_english.txt"
            original_path = "data/transcripts/transcript.txt"
            
            # Try in order of preference
            for path in [cleaned_path, english_path, original_path]:
                if os.path.exists(path):
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read().strip()
                    if content and len(content) > 50:  # Ensure meaningful content
                        logger.info(f"Using transcript from: {path}")
                        return content
            
            return None
        except Exception as e:
            logger.error(f"Error reading transcript: {e}")
            return None
    
    def _extract_key_points(self, text, num_points=8):
        """Extract key points using improved text analysis"""
        if not text:
            return []
            
        # Split into sentences
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 15]
        
        if not sentences:
            return []
        
        # Score sentences by importance
        scored_sentences = []
        for sentence in sentences:
            if len(sentence.split()) < 3:  # Skip very short sentences
                continue
                
            score = 0
            # Length score (optimal length gets higher score)
            word_count = len(sentence.split())
            if 8 <= word_count <= 25:
                score += 10
            elif word_count > 25:
                score += 5
            
            # Importance indicators
            importance_indicators = [
                'important', 'key', 'main', 'essential', 'critical', 'crucial',
                'must', 'should', 'because', 'therefore', 'however', 'consequently',
                'significantly', 'primarily', 'fundamental'
            ]
            
            for indicator in importance_indicators:
                if indicator in sentence.lower():
                    score += 8
            
            # Structural indicators
            if sentence[0].isupper() and any(char.isdigit() for char in sentence):
                score += 5  # Likely a numbered point
            
            scored_sentences.append((score, sentence))
        
        # Get top sentences
        scored_sentences.sort(reverse=True, key=lambda x: x[0])
        return [sentence for _, sentence in scored_sentences[:num_points] if sentence]
    
    def _create_structured_notes(self, content):
        """Create structured notes from any content"""
        if not content:
            return "No content available for note generation."
        
        # Extract main topics from content
        words = content.lower().split()
        common_words = set(['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'for'])
        content_words = [w for w in words if w not in common_words and len(w) > 3]
        
        # Get frequent words as potential topics
        from collections import Counter
        word_freq = Counter(content_words)
        main_topics = [word for word, count in word_freq.most_common(5)]
        
        # Generate summary
        summary = self._generate_summary(content)
        
        # Extract key points
        key_points = self._extract_key_points(content)
        
        # Build structured notes
        notes = f"""# Content Notes

## Overview
{summary}

## Main Topics
{chr(10).join(f"- {topic.capitalize()}" for topic in main_topics)}

## Key Points
"""
        
        # Add key points
        for i, point in enumerate(key_points[:6], 1):
            notes += f"{i}. {point}\n"
        
        # Add additional sections based on content
        notes += """
## Additional Information
- Important details from the content
- Supporting facts and evidence
- Relevant context and background

## Takeaways
- Main conclusions or learnings
- Practical applications
- Key insights worth remembering
"""
        return notes
    
    def _generate_summary(self, content):
        """Generate summary using local model"""
        if not self.summarizer or len(content.split()) < 100:
            # Fallback summary for short content
            sentences = re.split(r'[.!?]+', content)
            meaningful_sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
            if meaningful_sentences:
                return meaningful_sentences[0] + " " + meaningful_sentences[-1] if len(meaningful_sentences) > 1 else meaningful_sentences[0]
            return "Summary of the main content points."
        
        try:
            # Use first 1500 characters for summarization
            input_text = content[:1500]
            summary = self.summarizer(
                input_text,
                max_length=200,
                min_length=100,
                do_sample=False
            )[0]['summary_text']
            return summary
        except Exception as e:
            logger.error(f"Summarization failed: {e}")
            # Fallback: use first and last meaningful sentences
            sentences = [s.strip() for s in content.split('.') if len(s.strip()) > 30]
            if len(sentences) >= 2:
                return sentences[0] + ". " + sentences[-1] + "."
            elif sentences:
                return sentences[0] + "."
            return "Key points and main ideas from the content."
    
    def generate_detailed_notes(self):
        """Generate notes with timing and validation"""
        start_time = time.time()
        
        try:
            # Check if background processing is complete
            if not self._is_processing_complete():
                return {
                    'status': 'processing',
                    'message': 'Video is still being processed. Please wait...',
                    'notes': None
                }
            
            transcript = self._read_latest_transcript()
            
            if not transcript:
                return {
                    'status': 'error',
                    'message': 'No transcript available. Please process a video first.',
                    'notes': None
                }
            
            logger.info("Generating structured notes...")
            
            notes = self._create_structured_notes(transcript)
            
            processing_time = time.time() - start_time
            word_count = len(notes.split())
            
            logger.info(f"Notes generated in {processing_time:.2f}s: {word_count} words")
            
            return {
                'status': 'success',
                'notes': notes,
                'word_count': word_count,
                'processing_time': processing_time
            }
            
        except Exception as e:
            logger.error(f"Notes generation error: {e}")
            return {
                'status': 'error',
                'message': f'Failed to generate notes: {str(e)}',
                'notes': None
            }
    
    def _is_processing_complete(self):
        """Check if background processing is complete"""
        required_files = [
            "data/transcripts/cleaned_transcript.txt",
            "data/transcripts/transcript_english.txt"
        ]
        
        # Check if any of the required transcript files exist and have content
        for file_path in required_files:
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read().strip()
                    if content and len(content) > 50:
                        return True
                except:
                    continue
        return False

# Create global instance
notes_generator_instance = NotesGenerator()

def generate_detailed_notes():
    return notes_generator_instance.generate_detailed_notes()