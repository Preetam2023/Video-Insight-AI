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

@app.route('/transcript')
def transcript():
    """Transcript Page"""
    return render_template('transcript.html')

@app.route('/summarize_page')
def summarize_page():
    """Summarize Page"""
    return render_template('summary.html')

@app.route('/notes')
def notes():
    """Notes Page"""
    return render_template('notes.html')

@app.route('/qna')
def qna():
    """Q&A Page"""
    return render_template('qna.html')

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

        # Start background processing immediately after transcript is ready
        import threading
        background_thread = threading.Thread(
            target=background_processing, 
            args=(transcript_path,)
        )
        background_thread.daemon = True
        background_thread.start()

        # Return success immediately with transcript info
        if os.path.exists(transcript_path):
            with open(transcript_path, 'r', encoding='utf-8') as f:
                transcript_content = f.read()
            
            return jsonify({
                'status': 'success',
                'transcript_ready': True,
                'transcript_path': transcript_path,
                'message': 'Transcript ready! Other features are being processed in background...',
                'transcript_preview': transcript_content[:500] + "..." if len(transcript_content) > 500 else transcript_content
            })
        else:
            return jsonify({'status': 'error', 'message': 'Transcript generation failed'}), 500

    except Exception as e:
        print(f"[ERROR] Processing failed: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

def background_processing(transcript_path):
    """Run translation, cleaning, chunking and vectorization in background"""
    try:
        print("[BACKGROUND] Starting background processing...")
        
        # Translation
        print("[BACKGROUND] Translating to English...")
        output_path = translate_to_eng(transcript_path)

        # Cleaning english text
        print("[BACKGROUND] Cleaning transcript...")
        cleaned_path = clean_and_save_transcript(output_path)

        # Chunk cleaned transcript
        print("[BACKGROUND] Chunking transcript...")
        chunks_dir = chunk_and_save(cleaned_path)

        # Vectorize chunks
        print("[BACKGROUND] Vectorizing chunks...")
        vectorized_path = vectorize_chunks(chunks_dir)

        print("[BACKGROUND] All processing completed successfully!")
        
    except Exception as e:
        print(f"[BACKGROUND ERROR] Background processing failed: {e}")

@app.route('/check_processing_status')
def check_processing_status():
    """Check if background processing is complete"""
    try:
        # Check if all required files exist
        required_files = [
            "data/transcripts/transcript_english.txt",
            "data/transcripts/cleaned_transcript.txt",
            "data/chunks/chunk_0.txt"  # Check if at least one chunk exists
        ]
        
        status = "processing"
        completed_files = []
        
        for file_path in required_files:
            if os.path.exists(file_path):
                completed_files.append(file_path)
        
        if len(completed_files) == len(required_files):
            status = "completed"
        elif len(completed_files) > 0:
            status = "partial"
        else:
            status = "processing"
            
        return jsonify({
            'status': status,
            'completed_files': completed_files,
            'total_files': len(required_files)
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/summarize', methods=['POST'])
def summarize_video():
    try:
        logger.info("Starting summary generation using preprocessed chunks")
        
        # Generate summary using preprocessed chunks
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
        logger.info("Starting detailed notes generation using preprocessed chunks")
        
        # Generate detailed notes using preprocessed chunks
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
            "word_count": word_count,
            "message": "Detailed notes generated successfully"
        })
        
    except Exception as e:
        logger.error(f"Error in generate_notes route: {str(e)}")
        return jsonify({"error": str(e)}), 500

        # Cleaning english text
        print("[BACKGROUND] Cleaning transcript...")
        cleaned_path = clean_and_save_transcript(output_path)

        # Chunk cleaned transcript
        print("[BACKGROUND] Chunking transcript...")
        chunks_dir = chunk_and_save(cleaned_path)

        # Vectorize chunks
        print("[BACKGROUND] Vectorizing chunks...")
        vectorized_path = vectorize_chunks(chunks_dir)

        print("[BACKGROUND] All processing completed successfully!")
        
    except Exception as e:
        print(f"[BACKGROUND ERROR] Background processing failed: {e}")


@app.route('/get_transcript')
def get_transcript():
    """Serve transcript data"""
    try:
        # Check for original transcript
        transcript_path = "data/transcripts/transcript.txt"
        english_path = "data/transcripts/transcript_english.txt"
        
        if os.path.exists(transcript_path):
            with open(transcript_path, 'r', encoding='utf-8') as f:
                transcript = f.read()
            
            # Check if English version exists
            english_transcript = None
            if os.path.exists(english_path):
                with open(english_path, 'r', encoding='utf-8') as f:
                    english_transcript = f.read()
            
            return jsonify({
                'status': 'success',
                'transcript': transcript,
                'english_transcript': english_transcript,
                'word_count': len(transcript.split())
            })
        else:
            return jsonify({
                'status': 'error', 
                'message': 'No transcript found. Please process a video first.'
            })
            
    except Exception as e:
        logger.error(f"Error getting transcript: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/translate_transcript', methods=['POST'])
def translate_transcript():
    """Translate transcript to English"""
    try:
        data = request.get_json()
        transcript = data.get('transcript', '')
        
        # Your translation logic here
        # For now, we'll just return the English version if it exists
        english_path = "data/transcripts/transcript_english.txt"
        
        if os.path.exists(english_path):
            with open(english_path, 'r', encoding='utf-8') as f:
                english_transcript = f.read()
            
            return jsonify({
                'status': 'success',
                'translated_text': english_transcript
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'English translation not available'
            })
            
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)})
    

# ------------------- MAIN -------------------
if __name__ == '__main__':
    app.run(debug=True)
