import os
from googletrans import Translator

# Initialize translator
translator = Translator()

# Dynamically find the base directory (project root)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# ↑ This goes up 3 folders from utils/text_preprocessing/translator.py

# Define relative paths
input_path = os.path.join(BASE_DIR, "data", "transcripts", "transcript.txt")
output_path = os.path.join(BASE_DIR, "data", "transcripts", "transcript_english.txt")

# Read transcript
with open(input_path, "r", encoding="utf-8") as f:
    text = f.read()

# Detect language
detected = translator.detect(text[:5000])
print(f"Detected language: {detected.lang}")

# Split large text into chunks (for API safety)
def split_text(text, max_chars=4000):
    return [text[i:i+max_chars] for i in range(0, len(text), max_chars)]

chunks = split_text(text)
translated_chunks = []

# Translate if needed
if detected.lang != "en":
    print("Translating text to English...")
    for i, chunk in enumerate(chunks):
        translated = translator.translate(chunk, dest="en")
        translated_chunks.append(translated.text)
        print(f"Translated chunk {i+1}/{len(chunks)}")
    english_text = "\n".join(translated_chunks)
else:
    print("Text already in English.")
    english_text = text

# Save translated text
os.makedirs(os.path.dirname(output_path), exist_ok=True)
with open(output_path, "w", encoding="utf-8") as f:
    f.write(english_text)

print(f"Translation completed! Saved at: {output_path}")
