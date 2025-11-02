# process_long_youtube_whisper.py
# Usage: python process_long_youtube_whisper.py
# It will ask for a YouTube URL (or local filename).
# Output: transcript_long.txt

import os
import sys
import shutil
import yt_dlp
from pydub import AudioSegment
import whisper
import math

# ---------- Configuration ----------
CHUNK_SECONDS = 60          # chunk size in seconds (change to 30 or 120 if you want)
MODEL_NAME = "base"         # choose "tiny","base","small","medium" depending on speed/accuracy
OUTPUT_TRANSCRIPT = "transcript_long.txt"
TMP_DIR = "whisper_chunks"
AUDIO_FILENAME = "downloaded_audio.m4a"  # audio downloaded from yt-dlp
# -----------------------------------

def download_audio_from_youtube(url, outname=AUDIO_FILENAME):
    opts = {
        "format": "bestaudio/best",
        "outtmpl": outname,
        "quiet": False,
        "no_warnings": True,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            print("Downloading audio from YouTube (may take a minute)...")
            ydl.download([url])
        print("Downloaded:", outname)
        return os.path.abspath(outname)
    except Exception as e:
        print("Download failed:", e)
        return None

def split_audio_to_chunks(audio_path, chunk_secs=CHUNK_SECONDS, out_dir=TMP_DIR):
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)
    audio = AudioSegment.from_file(audio_path)
    total_ms = len(audio)
    chunk_ms = chunk_secs * 1000
    chunks = []
    num_chunks = math.ceil(total_ms / chunk_ms)
    print(f"Total audio length: {total_ms/1000:.1f}s -> creating {num_chunks} chunks of {chunk_secs}s")
    for i in range(0, total_ms, chunk_ms):
        j = i // chunk_ms
        chunk = audio[i:i+chunk_ms]
        filename = os.path.join(out_dir, f"chunk_{j:04d}.wav")
        chunk.export(filename, format="wav")
        chunks.append(filename)
    return chunks

def transcribe_chunks_with_whisper(chunks, model_name=MODEL_NAME, output_path=OUTPUT_TRANSCRIPT):
    print("Loading Whisper model:", model_name)
    model = whisper.load_model(model_name)   # may download model first time
    recognitions = []
    for idx, chunk_file in enumerate(chunks, start=1):
        print(f"Transcribing chunk {idx}/{len(chunks)} -> {chunk_file}")
        # We use model.transcribe which handles audio file reading via ffmpeg
        try:
            res = model.transcribe(chunk_file)
            text = res.get("text", "").strip()
        except Exception as e:
            print("Whisper error on chunk:", e)
            text = ""
        recognitions.append((chunk_file, text))
    # Combine and save
    with open(output_path, "w", encoding="utf-8") as f:
        for i, (chunk_file, text) in enumerate(recognitions, start=1):
            f.write(f"--- Chunk {i} ({os.path.basename(chunk_file)}) ---\n")
            f.write(text + "\n\n")
    print("All chunks transcribed. Saved combined transcript to:", output_path)
    return output_path

def cleanup_temp(dirpath=TMP_DIR, keep_audio=False, audio_path=AUDIO_FILENAME):
    # remove chunks directory
    if os.path.exists(dirpath):
        shutil.rmtree(dirpath)
    if not keep_audio and os.path.exists(audio_path):
        os.remove(audio_path)
    print("Cleaned up temporary files.")

def main():
    print("Enter a YouTube URL (or a local audio/video filename):")
    user = input("→ ").strip()
    if not user:
        print("No input given. Exiting.")
        return
    # If user input starts with http treat as URL
    if user.lower().startswith("http"):
        audio_path = download_audio_from_youtube(user, outname=AUDIO_FILENAME)
        if not audio_path:
            print("Download failed. Exiting.")
            return
    else:
        # local file provided
        if not os.path.exists(user):
            print("Local file not found:", user)
            return
        # If local file is video or audio, we will use it directly
        audio_path = os.path.abspath(user)

    # Split into chunks
    chunks = split_audio_to_chunks(audio_path, chunk_secs=CHUNK_SECONDS)
    # Transcribe chunks with Whisper
    trans_path = transcribe_chunks_with_whisper(chunks, model_name=MODEL_NAME)
    # Cleanup chunk files but keep the downloaded audio by default
    cleanup_temp(TMP_DIR, keep_audio=False, audio_path=audio_path)
    print("\nDONE. Open", trans_path, "to read the transcript.")

if __name__ == "__main__":
    main()
