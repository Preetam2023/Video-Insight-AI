import os
import shutil
import whisper
import re
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

OUTPUT_TRANSCRIPT = "data/transcripts/transcript.txt"


def get_youtube_transcript(youtube_url):
    """Fetch YouTube transcript in any available language.
    Auto-translate to English if possible, else return original language text.
    """
    try:
        # Extract video ID
        match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", youtube_url)
        if not match:
            raise ValueError("Invalid YouTube URL")

        video_id = match.group(1)
        ytt_api = YouTubeTranscriptApi()

        # List all available transcripts
        transcript_list = ytt_api.list(video_id)
        available_langs = [t.language_code for t in transcript_list]
        print(f"[INFO] Available transcript languages: {available_langs}")

        # Step 1: Try English transcript
        try:
            transcript = transcript_list.find_transcript(['en'])
        except Exception:
            # Step 2: Try any other available language
            transcript = transcript_list.find_transcript(available_langs)

        # Step 3: Try to translate if possible
        if transcript.language_code != 'en':
            if transcript.is_translatable:
                print(f"[INFO] Translating transcript from '{transcript.language_code}' to English.")
                transcript = transcript.translate('en')
            else:
                print(f"[INFO] Using transcript in original language '{transcript.language_code}' (not translatable).")

        # Fetch transcript text
        transcript_data = transcript.fetch()
        text = " ".join(snippet.text for snippet in transcript_data)

        print("[INFO] Transcript fetched successfully.")
        return text

    except (TranscriptsDisabled, NoTranscriptFound):
        print("[WARNING] No captions found for this video.")
        return None
    except Exception as e:
        print(f"[ERROR] Transcript fetch failed: {e}")
        return None



def transcribe_audio_to_text(chunks, model_name="tiny", output_path=OUTPUT_TRANSCRIPT):
    """Transcribe audio chunks using Whisper (fallback method)."""
    model = whisper.load_model(model_name)
    recognitions = []

    for chunk_file in chunks:
        print(f"[INFO] Transcribing chunk: {chunk_file}")
        result = model.transcribe(chunk_file)
        text = result.get("text", "").strip()
        if text:
            recognitions.append(text)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(recognitions))

    print("[INFO] Whisper transcription completed.")
    return output_path


def save_youtube_transcript(text, output_path=OUTPUT_TRANSCRIPT):
    """Save transcript text fetched from YouTube."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"[INFO] Transcript saved to {output_path}")
    return output_path


def cleanup_temp(dirpath="data/uploads/chunks"):
    """Clean up temporary files after processing."""
    if os.path.exists(dirpath):
        shutil.rmtree(dirpath)
        print("[INFO] Temporary files cleaned up.")
