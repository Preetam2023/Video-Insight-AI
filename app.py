from flask import Flask, render_template, request, redirect, url_for, jsonify
import os

# Import utility modules
# from utils.video_to_text.video_to_audio import convert_video_to_audio
# from utils.video_to_text.audio_to_text import convert_audio_to_text
# from utils.text_preprocessing.cleaner import clean_text
# from utils.text_preprocessing.chunker import chunk_text
# from utils.llm_features.summarizer import generate_summary
# from utils.llm_features.notes_generator import generate_notes
# from utils.llm_features.quiz_maker import generate_quiz
# from utils.llm_features.qna import answer_question

app = Flask(__name__)

# Folder to store uploaded files
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# ------------------- ROUTES -------------------

@app.route('/')
def home():
    """Home Page"""
    return render_template('home.html')


@app.route('/upload', methods=['POST'])
def upload_video():
    """Handles video upload or YouTube link input"""
    video_file = request.files.get('video')
    video_url = request.form.get('video_url')

    if video_file:
        # Save uploaded file
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], video_file.filename)
        video_file.save(filepath)
        audio_path = convert_video_to_audio(filepath)
        text = convert_audio_to_text(audio_path)
    elif video_url:
        # (Later: handle YouTube download using pytube)
        return jsonify({"message": "YouTube link processing coming soon!"})
    else:
        return jsonify({"error": "No video or link provided!"}), 400

    # Preprocess the text
    cleaned = clean_text(text)
    chunks = chunk_text(cleaned)

    # Store for LLM features
    with open("processed_text.txt", "w", encoding="utf-8") as f:
        f.write(cleaned)

    return render_template('summary.html', text=cleaned[:1500])  # preview part of text


@app.route('/summary')
def summary_page():
    """Generate and display summary"""
    with open("processed_text.txt", "r", encoding="utf-8") as f:
        text = f.read()
    summary = generate_summary(text)
    return render_template('summary.html', summary=summary)


@app.route('/notes')
def notes_page():
    """Generate and display notes"""
    with open("processed_text.txt", "r", encoding="utf-8") as f:
        text = f.read()
    notes = generate_notes(text)
    return render_template('notes.html', notes=notes)


@app.route('/quiz')
def quiz_page():
    """Generate quiz questions"""
    with open("processed_text.txt", "r", encoding="utf-8") as f:
        text = f.read()
    quiz = generate_quiz(text)
    return render_template('quiz.html', quiz=quiz)


@app.route('/qna', methods=['GET', 'POST'])
def qna_page():
    """Interactive Q&A system"""
    if request.method == 'POST':
        question = request.form.get('question')
        with open("processed_text.txt", "r", encoding="utf-8") as f:
            text = f.read()
        answer = answer_question(text, question)
        return render_template('qna.html', question=question, answer=answer)
    return render_template('qna.html')

# ------------------- MAIN -------------------
if __name__ == '__main__':
    app.run(debug=True)
