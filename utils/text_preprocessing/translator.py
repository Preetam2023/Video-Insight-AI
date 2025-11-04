from googletrans import Translator
import os
import time

def translate_to_eng(transcript_path):
    """
    Translates a transcript (any language) to English.
    Creates a new file transcript_english.txt in the same folder.
    """
    try:
        # Initialize translator
        translator = Translator()

        # Read transcript
        with open(transcript_path, "r", encoding="utf-8") as f:
            text = f.read().strip()

        # --- Split long text into safe chunks ---
        def split_text(text, max_chars=4000):
            return [text[i:i+max_chars] for i in range(0, len(text), max_chars)]

        chunks = split_text(text)
        print(f"[INFO] Detected {len(chunks)} chunks for translation.")

        translated_chunks = []
        for i, chunk in enumerate(chunks):
            for attempt in range(3):  # retry up to 3 times per chunk
                try:
                    translated = translator.translate(chunk, dest='en')
                    translated_chunks.append(translated.text)
                    print(f"[INFO] ✅ Translated chunk {i+1}/{len(chunks)}")
                    break
                except Exception as e:
                    print(f"[WARN] Chunk {i+1} retry {attempt+1}/3 failed: {e}")
                    time.sleep(2)
            time.sleep(1)  # prevent hitting rate limits

        english_text = "\n".join(translated_chunks)

        # Save new file
        base_dir = os.path.dirname(transcript_path)
        output_path = os.path.join(base_dir, "transcript_english.txt")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(english_text)

        print(f"[INFO] ✅ English transcript saved at: {output_path}")
        return output_path

    except Exception as e:
        print(f"❌ Error during translation: {e}")
        return transcript_path  # fallback

