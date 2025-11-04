import os
from googletrans import Translator

# Initialize translator
translator = Translator()

# Define file paths
input_path = r"C:\Users\SHEIKH SAIKAT AHMED\OneDrive\Desktop\Soft Computing Project\data\transcripts\transcript.txt"
output_path = r"C:\Users\SHEIKH SAIKAT AHMED\OneDrive\Desktop\Soft Computing Project\data\transcripts\transcript_english.txt"

# Read the transcript
with open(input_path, "r", encoding="utf-8") as f:
    text = f.read()

# Detect language
detected = translator.detect(text[:5000])  # only check first 5000 chars for speed
print(f"Detected language: {detected.lang}")

# Split text into smaller chunks (to avoid API length errors)
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

# Save to new file
with open(output_path, "w", encoding="utf-8") as f:
    f.write(english_text)

print(f"✅ Translation completed! Saved as: {output_path}")
