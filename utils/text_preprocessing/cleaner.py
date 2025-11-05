import re
import os

def clean_and_save_transcript(input_path):
    """
    Cleans the transcript text (removes timestamps, symbols, and extra spaces)
    and saves the cleaned version as transcript_cleaned.txt in the same folder.
    """
    try:
        # --- Step 1: Read the transcript file ---
        with open(input_path, "r", encoding="utf-8") as f:
            text = f.read()

        if not text.strip():
            print(" Transcript file is empty.")
            return None

        # --- Step 2: Cleaning logic ---
        cleaned_text = text

        # Remove timestamps like [00:10], (00:10), 00:10, 1:23:45
        cleaned_text = re.sub(r"\[?\(?\d{1,2}:\d{2}(?::\d{2})?\)?\]?", " ", cleaned_text)

        # Remove special characters, keeping normal punctuation and Hindi letters
        cleaned_text = re.sub(r"[^a-zA-Z0-9\u0900-\u097F\s.,?!]", " ", cleaned_text)

        # Remove multiple spaces and newlines
        cleaned_text = re.sub(r"\s+", " ", cleaned_text).strip()

        # --- Step 3: Save the cleaned transcript ---
        base_dir = os.path.dirname(input_path)
        output_path = os.path.join(base_dir, "transcript_cleaned.txt")

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(cleaned_text)

        print(f" Cleaned transcript saved at: {output_path}")
        return output_path

    except Exception as e:
        print(f" Error cleaning transcript: {e}")
        return None
