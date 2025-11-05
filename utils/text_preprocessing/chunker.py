import os
import re

def find_project_data_dir():
    """
    Finds the main 'data' directory of the project dynamically.
    It climbs up the folder hierarchy until it finds a folder named 'data'.
    """
    current_dir = os.path.abspath(os.path.dirname(__file__))
    while True:
        potential_data = os.path.join(current_dir, "data")
        if os.path.isdir(potential_data):
            return potential_data
        parent_dir = os.path.dirname(current_dir)
        if parent_dir == current_dir:
            raise FileNotFoundError("Could not find 'data' directory in any parent folder.")
        current_dir = parent_dir


def chunk_text(text, max_chars=1000, overlap=100):
    """
    Splits text into chunks with optional overlap.
    """
    text = re.sub(r'\s+', ' ', text).strip()
    chunks = []
    start = 0

    while start < len(text):
        end = start + max_chars
        chunk = text[start:end]

        # Try to end chunk on a sentence boundary
        if end < len(text):
            period_pos = text.rfind('.', start, end)
            if period_pos != -1 and period_pos > start + max_chars * 0.6:
                chunk = text[start:period_pos + 1]
                end = period_pos + 1

        chunks.append(chunk.strip())
        start = end - overlap

    return chunks


def chunk_and_save(input_path, max_chars=1000, overlap=100):
    """
    Reads a text file, splits it into chunks, and saves each chunk
    inside 'data/text chunks'.
    """
    data_dir = find_project_data_dir()
    text_chunk_dir = os.path.join(data_dir, "text chunks")
    os.makedirs(text_chunk_dir, exist_ok=True)

    # Also ensure 'vectorized file' folder exists for later use
    os.makedirs(os.path.join(data_dir, "vectorized file"), exist_ok=True)

    # Read text file
    with open(input_path, "r", encoding="utf-8") as f:
        text = f.read()

    # Create chunks
    chunks = chunk_text(text, max_chars=max_chars, overlap=overlap)

    # Save chunks
    for i, chunk in enumerate(chunks, start=1):
        chunk_filename = f"chunk_{i:03}.txt"
        chunk_path = os.path.join(text_chunk_dir, chunk_filename)
        with open(chunk_path, "w", encoding="utf-8") as f:
            f.write(chunk)

    print(f"[INFO]  {len(chunks)} chunks saved in: {text_chunk_dir}")
    return text_chunk_dir


# Example usage:
# if __name__ == "__main__":
#     input_file = os.path.join("data", "transcripts", "transcript_cleaned.txt")
#     chunk_and_save(input_file)


chunk_and_save(r"C:\Users\SHEIKH SAIKAT AHMED\OneDrive\Desktop\Soft Computing Project\data\transcripts\transcript_cleaned.txt")