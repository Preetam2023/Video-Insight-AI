from flask import Flask, render_template, request, jsonify
import os
from utils.video_processing.video_to_audio import download_audio_from_youtube, split_audio_to_chunks
from utils.video_processing.audio_to_text import (
    get_youtube_transcript,
    save_youtube_transcript,
    transcribe_audio_to_text,
    cleanup_temp
)
from utils.text_preprocessing.translator import translate_to_eng
from utils.text_preprocessing.cleaner import clean_and_save_transcript

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
        return jsonify({'status': 'success', 'clean': cleaned_path})

    except Exception as e:
        print(f"[ERROR] Processing failed: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ------------------- MAIN -------------------
if __name__ == '__main__':
    app.run(debug=True)
