# utils/llm_features/summarizer.py - ULTRA FAST VERSION

import os
from transformers import pipeline
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TextSummarizer:
    def __init__(self):
        self.hf_api_token = os.getenv("HF_API_TOKEN")
        self.summarizer = None
        self._initialize_summarizer()
    
    def _initialize_summarizer(self):
        """Initialize with the fastest available model"""
        try:
            # Use valid model names that exist on HuggingFace
            model_options = [
                "sshleifer/distilbart-cnn-12-6",  # Valid and fast
                "facebook/bart-large-cnn",        # Valid and high quality
                "Falconsai/text_summarization",   # Fast alternative
            ]
            
            for model_name in model_options:
                try:
                    logger.info(f"Trying to load model: {model_name}")
                    self.summarizer = pipeline(
                        "summarization",
                        model=model_name,
                        token=self.hf_api_token,
                        framework="pt"
                    )
                    logger.info(f"Summarizer initialized with model: {model_name}")
                    break
                except Exception as model_error:
                    logger.warning(f"Failed to load {model_name}: {model_error}")
                    continue
            else:
                # Fallback to any available summarization model
                logger.warning("All specified models failed, using default summarization")
                self.summarizer = pipeline(
                    "summarization",
                    token=self.hf_api_token
                )
            
        except Exception as e:
            logger.error(f"Error initializing summarizer: {e}")
            raise
    
    def _read_transcript(self):
        """Read the cleaned transcript directly"""
        try:
            # Try multiple possible paths
            possible_paths = [
                "data/transcripts/transcript_cleaned.txt",
                os.path.join("data", "transcripts", "transcript_cleaned.txt"),
            ]
            
            # If not found, try from project root
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
            possible_paths.append(os.path.join(project_root, "data", "transcripts", "transcript_cleaned.txt"))
            
            transcript_path = None
            for path in possible_paths:
                if os.path.exists(path):
                    transcript_path = path
                    break
            
            if not transcript_path:
                raise FileNotFoundError("Could not find transcript_cleaned.txt")
            
            with open(transcript_path, 'r', encoding='utf-8') as f:
                transcript = f.read().strip()
            
            logger.info(f"Read transcript: {len(transcript.split())} words from {transcript_path}")
            return transcript
            
        except Exception as e:
            logger.error(f"Error reading transcript: {e}")
            raise

    def generate_summary(self):
        """
        Ultra-fast summary generation
        """
        try:
            transcript = self._read_transcript()
            
            if not transcript:
                return "No transcript content available for summarization."
            
            # Calculate appropriate summary length based on transcript size
            transcript_words = len(transcript.split())
            if transcript_words > 2000:
                max_len = 200
                min_len = 100
            elif transcript_words > 1000:
                max_len = 150
                min_len = 80
            else:
                max_len = 120
                min_len = 60
            
            logger.info(f"Summarizing {transcript_words} words -> {max_len} words")
            
            # Ultra-fast settings
            summary = self.summarizer(
                transcript,
                max_length=max_len,
                min_length=min_len,
                do_sample=False,
                truncation=True,
            )[0]['summary_text']
            
            final_word_count = len(summary.split())
            logger.info(f"Fast summary generated: {final_word_count} words")
            return summary
            
        except Exception as e:
            logger.error(f"Error in fast summarization: {e}")
            # Fallback: return first 100 words or meaningful excerpt
            if 'transcript' in locals():
                words = transcript.split()
                if len(words) > 100:
                    return ' '.join(words[:100]) + "..."
                else:
                    return transcript
            return "Summary unavailable due to processing error"

# Create global instance
summarizer_instance = TextSummarizer()

def generate_summary():
    return summarizer_instance.generate_summary()