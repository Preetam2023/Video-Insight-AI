# utils/llm_features/vectorizer.py

import os
import pickle
from sentence_transformers import SentenceTransformer

def vectorize_chunks(chunk_dir):
    """
    Vectorizes all text chunks from the given chunk_dir using SentenceTransformer.
    Saves a single embeddings.pkl file in the same folder and PRESERVES text chunks.
    """
    # Load embedding model
    model = SentenceTransformer('all-MiniLM-L6-v2')

    # Collect all text chunks
    txt_files = [f for f in os.listdir(chunk_dir) if f.endswith(".txt")]
    if not txt_files:
        print("No text chunks found in folder.")
        return None

    print(f"Loaded {len(txt_files)} text chunks for vectorization...")

    chunks = []
    for filename in txt_files:
        file_path = os.path.join(chunk_dir, filename)
        with open(file_path, "r", encoding="utf-8") as f:
            chunks.append(f.read())

    # Generate embeddings
    embeddings = model.encode(chunks, show_progress_bar=True, batch_size=8)

    # Save embeddings.pkl in the same directory
    output_path = os.path.join(chunk_dir, "embeddings.pkl")
    with open(output_path, "wb") as f:
        pickle.dump(embeddings, f)

    print(f"Embeddings saved successfully to: {output_path}")

    # ✅ PRESERVING text chunk files (commented out deletion)
    # Text chunks are kept for summarization, notes generation, etc.
    print("Text chunks preserved for summarization and other features.")
    
    return output_path

# Example usage:
# vectorize_chunks("data/text_chunks")