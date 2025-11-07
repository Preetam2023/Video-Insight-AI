from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify
import os
import logging

from utils.video_processing.video_to_audio import download_audio_from_youtube, split_audio_to_chunks
from utils.video_processing.audio_to_text import (
    get_youtube_transcript,
    save_youtube_transcript,
    transcribe_audio_to_text,
    cleanup_temp
)
from utils.text_preprocessing.translator import translate_to_eng
from utils.text_preprocessing.cleaner import clean_and_save_transcript
from utils.text_preprocessing.chunker import chunk_and_save
from utils.text_preprocessing.vectorizer import vectorize_chunks
from utils.llm_features.summarizer import generate_summary
from utils.llm_features.notes_generator import generate_detailed_notes

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Create necessary directories
os.makedirs("data/uploads", exist_ok=True)
os.makedirs("data/transcripts", exist_ok=True)

# ------------------- ROUTES -------------------

@app.route('/')
def home():
    """Home Page"""
    return render_template('home.html')

@app.route('/process', methods=['POST'])
def process_video():
    """Handles both YouTube link and uploaded video file."""
    youtube_url = request.form.get('video_url')
    file = request.files.get('video_file')

    try:
        transcript_path = None

        # === Case 1: YouTube URL provided ===
        if youtube_url:
            print("[INFO] YouTube URL received, attempting transcript fetch...")
            text = get_youtube_transcript(youtube_url)

            if text:
                # Captions available then save directly
                transcript_path = save_youtube_transcript(text)
            else:
                # No captions then fallback to Whisper
                print("[INFO] Captions not available, using Whisper fallback...")
                audio_path = download_audio_from_youtube(youtube_url)
                chunks = split_audio_to_chunks(audio_path)
                transcript_path = transcribe_audio_to_text(chunks)
                cleanup_temp()

        # === Case 2: Uploaded video file ===
        elif file:
            print("[INFO] Uploaded video file received, processing...")
            upload_dir = "data/uploads"
            os.makedirs(upload_dir, exist_ok=True)
            upload_path = os.path.join(upload_dir, file.filename)
            file.save(upload_path)

            chunks = split_audio_to_chunks(upload_path)
            transcript_path = transcribe_audio_to_text(chunks)
            cleanup_temp()

        else:
            return jsonify({'status': 'error', 'message': 'No video or URL provided.'}), 400

        # Translation
        output_path = translate_to_eng(transcript_path)

        # cleaning english text
        cleaned_path = clean_and_save_transcript(output_path)

        # chunk cleaned transcript
        chunks_dir = chunk_and_save(cleaned_path)

        # Vectorize chunks
        vectorized_path = vectorize_chunks(chunks_dir)

        return jsonify({
            'status': 'success',
            'clean': cleaned_path,
            'chunks_dir': chunks_dir,
            'vectorized_file': vectorized_path
        })



    except Exception as e:
        print(f"[ERROR] Processing failed: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/summarize', methods=['POST'])
def summarize_video():
    try:
        logger.info("Starting DIRECT transcript summarization")  # Changed this line
        
        # Generate summary using direct transcript processing
        from utils.llm_features.summarizer import generate_summary
        summary = generate_summary()
        
        word_count = len(summary.split())
        logger.info(f"Summary generated: {word_count} words")
        
        # Save summary to file
        summary_path = "data/transcripts/summary.txt"
        os.makedirs("data/transcripts", exist_ok=True)
        with open(summary_path, "w", encoding="utf-8") as f:
            f.write(summary)
        
        return jsonify({
            "summary": summary,
            "status": "success",
            "word_count": word_count
        })
        
    except Exception as e:
        logger.error(f"Error in summarize_video route: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/generate_notes', methods=['POST'])
def generate_notes():
    try:
        logger.info("Starting detailed notes generation from transcript")
        
        # Generate notes using the notes generator
        from utils.llm_features.notes_generator import generate_detailed_notes
        notes = generate_detailed_notes()
        
        word_count = len(notes.split())
        logger.info(f"Detailed notes generated: {word_count} words")
        
        # Save notes to file
        notes_path = "data/transcripts/detailed_notes.txt"
        os.makedirs("data/transcripts", exist_ok=True)
        with open(notes_path, "w", encoding="utf-8") as f:
            f.write(notes)
        
        return jsonify({
            "notes": notes,
            "status": "success",
            "word_count": word_count
        })
        
    except Exception as e:
        logger.error(f"Error in generate_notes route: {str(e)}")
        return jsonify({"error": str(e)}), 500
# ------------------- MAIN -------------------
if __name__ == '__main__':
    app.run(debug=True)
