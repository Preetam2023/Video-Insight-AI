import os
import yt_dlp
from pydub import AudioSegment
import math

CHUNK_SECONDS = 60
TMP_DIR = "data/uploads/chunks"

def download_audio_from_youtube(url, outname="data/uploads/downloaded_audio.m4a"):
    opts = {"format": "bestaudio/best", "outtmpl": outname, "quiet": True, "no_warnings": True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])
    return os.path.abspath(outname)

def split_audio_to_chunks(audio_path, chunk_secs=CHUNK_SECONDS, out_dir=TMP_DIR):
    os.makedirs(out_dir, exist_ok=True)
    audio = AudioSegment.from_file(audio_path)
    total_ms = len(audio)
    chunk_ms = chunk_secs * 1000
    chunks = []
    for i in range(0, total_ms, chunk_ms):
        idx = i // chunk_ms
        filename = os.path.join(out_dir, f"chunk_{idx:04d}.wav")
        audio[i:i+chunk_ms].export(filename, format="wav")
        chunks.append(filename)
    return chunks
