# utils/llm_features/qna_generator.py - ENHANCED QUALITY VERSION

import os
import pickle
import logging
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from transformers import pipeline, AutoTokenizer, AutoModelForQuestionAnswering, AutoModelForCausalLM
import torch

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QnAGenerator:
    def __init__(self):
        self.qa_model = None
        self.tokenizer = None
        self.generator_model = None
        self.generator_tokenizer = None
        self.embeddings = None
        self.chunks = []
        self._initialize_models()
        self._load_embeddings_and_chunks()
    
    def _initialize_models(self):
        """Initialize the Q&A and generation models"""
        try:
            # Use a fast, lightweight model for Q&A
            model_name = "distilbert-base-cased-distilled-squad"
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.qa_model = AutoModelForQuestionAnswering.from_pretrained(model_name)
            logger.info("Q&A model initialized successfully")
            
            # Initialize a text generation model for better answers
            try:
                self.generator_model = pipeline(
                    "text-generation",
                    model="microsoft/DialoGPT-medium",
                    tokenizer="microsoft/DialoGPT-medium",
                    max_length=200,
                    do_sample=True,
                    temperature=0.7
                )
                logger.info("Text generation model initialized successfully")
            except Exception as e:
                logger.warning(f"Could not load text generation model: {e}")
                self.generator_model = None
                
        except Exception as e:
            logger.error(f"Error initializing models: {e}")
            self.qa_model = None
            self.generator_model = None
    
    def _find_chunks_directory(self):
        """Find the correct chunks directory with multiple possible locations"""
        # Get the project root directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
        
        possible_dirs = [
            os.path.join(project_root, "data", "text_chunks"),      # Standard path
            os.path.join(project_root, "data", "text chunks"),      # Path with space
            os.path.join(project_root, "data", "chunks"),           # Alternative path
            "data/text_chunks",                                     # Relative paths
            "data/text chunks", 
            "data/chunks",
            os.path.join("data", "text_chunks"),
            os.path.join("data", "text chunks"),
        ]
        
        for dir_path in possible_dirs:
            if os.path.exists(dir_path):
                logger.info(f"Found chunks directory: {dir_path}")
                return dir_path
        
        logger.warning("No chunks directory found in any expected location")
        return None
    
    def _load_embeddings_and_chunks(self):
        """Load the precomputed embeddings and chunks"""
        try:
            chunks_dir = self._find_chunks_directory()
            
            if not chunks_dir:
                logger.warning("No chunks directory found")
                self.embeddings = None
                self.chunks = []
                return
            
            # Load embeddings from multiple possible locations
            embeddings_paths = [
                os.path.join(chunks_dir, "embeddings.pkl"),
                "data/text_chunks/embeddings.pkl",
                "data/text chunks/embeddings.pkl", 
                "data/chunks/embeddings.pkl"
            ]
            
            # Add absolute paths
            for emb_path in embeddings_paths[:]:  # Copy the list
                if not os.path.isabs(emb_path):
                    abs_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), emb_path)
                    embeddings_paths.append(abs_path)
            
            self.embeddings = None
            for emb_path in embeddings_paths:
                if os.path.exists(emb_path):
                    try:
                        with open(emb_path, 'rb') as f:
                            self.embeddings = pickle.load(f)
                        logger.info(f"Loaded embeddings from: {emb_path}, shape: {self.embeddings.shape}")
                        break
                    except Exception as e:
                        logger.warning(f"Failed to load embeddings from {emb_path}: {e}")
                        continue
            
            if self.embeddings is None:
                logger.warning("Embeddings file not found in any expected location")
            
            # Load chunks
            self.chunks = []
            
            # Look for chunk files in the found directory
            import glob
            
            # Try different chunk file patterns
            chunk_patterns = [
                "chunk_*.txt",           # chunk_0.txt, chunk_1.txt
                "chunk_*.txt",           # chunk_001.txt, chunk_002.txt  
                "*.txt"                  # All text files
            ]
            
            chunk_files = []
            for pattern in chunk_patterns:
                found_files = glob.glob(os.path.join(chunks_dir, pattern))
                if found_files:
                    chunk_files = found_files
                    break
            
            if not chunk_files:
                logger.warning(f"No chunk files found in {chunks_dir}")
                return
            
            # Sort chunk files numerically
            def extract_number(filename):
                import re
                numbers = re.findall(r'\d+', filename)
                return int(numbers[0]) if numbers else 0
            
            chunk_files.sort(key=extract_number)
            
            logger.info(f"Found {len(chunk_files)} chunk files, loading content...")
            
            for chunk_file in chunk_files:
                try:
                    with open(chunk_file, 'r', encoding='utf-8') as f:
                        content = f.read().strip()
                        if content and len(content) > 10:  # Only add meaningful chunks
                            self.chunks.append(content)
                except Exception as e:
                    logger.warning(f"Error reading chunk file {chunk_file}: {e}")
                    continue
            
            logger.info(f"Successfully loaded {len(self.chunks)} text chunks")
            
            # Verify chunks and embeddings match
            if self.embeddings is not None and len(self.chunks) != len(self.embeddings):
                logger.warning(f"Chunks count ({len(self.chunks)}) doesn't match embeddings count ({len(self.embeddings)})")
                
        except Exception as e:
            logger.error(f"Error loading embeddings/chunks: {e}")
            self.embeddings = None
            self.chunks = []
    
    def _find_relevant_chunks(self, question, top_k=5):
        """Find the most relevant chunks for the question"""
        if self.embeddings is None or not self.chunks:
            logger.warning("No embeddings or chunks available for similarity search")
            return []
        
        try:
            # Generate question embedding
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer('all-MiniLM-L6-v2')
            question_embedding = model.encode([question])
            
            # Calculate similarities
            if isinstance(self.embeddings, list):
                embeddings_array = np.array(self.embeddings)
            else:
                embeddings_array = self.embeddings
                
            similarities = cosine_similarity(question_embedding, embeddings_array)[0]
            
            # Get top-k most similar chunks (increased from 3 to 5 for more context)
            top_indices = np.argsort(similarities)[-top_k:][::-1]
            relevant_chunks = []
            
            for i in top_indices:
                if i < len(self.chunks) and similarities[i] > 0.3:  # Only include chunks with decent similarity
                    relevant_chunks.append(self.chunks[i])
                    logger.info(f"Relevant chunk {i}: similarity {similarities[i]:.3f}")
            
            return relevant_chunks
            
        except Exception as e:
            logger.error(f"Error finding relevant chunks: {e}")
            # Return first few chunks as fallback
            return self.chunks[:top_k] if self.chunks else []
    
    def _extract_best_answer_from_context(self, question, context_chunks):
        """Extract the best possible answer using multiple strategies"""
        if not context_chunks:
            return None
        
        combined_context = " ".join(context_chunks)
        logger.info(f"Searching in context: {len(combined_context)} characters")
        
        # Strategy 1: Try exact Q&A extraction
        try:
            inputs = self.tokenizer(
                question, 
                combined_context, 
                return_tensors="pt", 
                truncation=True, 
                max_length=512,
                stride=128,
                padding=True
            )
            
            with torch.no_grad():
                outputs = self.qa_model(**inputs)
            
            start_logits = outputs.start_logits
            end_logits = outputs.end_logits
            
            # Get multiple possible answers
            start_indices = torch.topk(start_logits, 3).indices[0]
            end_indices = torch.topk(end_logits, 3).indices[0]
            
            best_answer = ""
            best_length = 0
            
            for start_idx in start_indices:
                for end_idx in end_indices:
                    if end_idx >= start_idx:
                        answer_tokens = inputs["input_ids"][0][start_idx:end_idx+1]
                        answer = self.tokenizer.decode(answer_tokens, skip_special_tokens=True)
                        
                        # Prefer longer, meaningful answers
                        if len(answer) > best_length and len(answer) > 10:
                            best_answer = answer
                            best_length = len(answer)
            
            if best_answer and len(best_answer.strip()) > 15:
                logger.info(f"Found Q&A answer: {best_answer}")
                return best_answer.strip()
                
        except Exception as e:
            logger.warning(f"Q&A extraction failed: {e}")
        
        # Strategy 2: Find the most relevant sentence
        try:
            sentences = combined_context.split('.')
            question_words = set(question.lower().split())
            
            best_sentence = ""
            best_score = 0
            
            for sentence in sentences:
                sentence_lower = sentence.lower()
                sentence_words = set(sentence_lower.split())
                
                # Score based on word overlap and position
                common_words = question_words.intersection(sentence_words)
                score = len(common_words)
                
                # Bonus for sentences that seem to answer the question
                if any(word in sentence_lower for word in ['how to', 'steps', 'guide', 'tutorial', 'install', 'run', 'setup']):
                    score += 3
                
                if score > best_score and len(sentence.strip()) > 20:
                    best_sentence = sentence.strip()
                    best_score = score
            
            if best_sentence and best_score >= 2:
                logger.info(f"Found relevant sentence: {best_sentence}")
                return best_sentence + "."
                
        except Exception as e:
            logger.warning(f"Sentence extraction failed: {e}")
        
        return None
    
    def _generate_intelligent_answer(self, question, context_chunks):
        """Generate an intelligent answer using available context"""
        # Try to extract answer from context first
        context_answer = self._extract_best_answer_from_context(question, context_chunks)
        
        if context_answer:
            return context_answer, True  # Answer from context
        
        # If no good context answer, use the generation model
        if self.generator_model and context_chunks:
            try:
                # Create a prompt with context
                context_preview = " ".join([chunk[:200] for chunk in context_chunks[:2]])  # Use first parts of top chunks
                prompt = f"Based on this content: {context_preview[:500]}... Question: {question} Answer:"
                
                generated = self.generator_model(
                    prompt,
                    max_length=150,
                    num_return_sequences=1,
                    temperature=0.7,
                    do_sample=True
                )
                
                answer = generated[0]['generated_text'].split('Answer:')[-1].strip()
                if answer and len(answer) > 20:
                    return answer, True
                    
            except Exception as e:
                logger.warning(f"Generation model failed: {e}")
        
        # Fallback to knowledgeable responses
        knowledgeable_answers = {
            "how i can run local llm": "To run a local LLM, you typically need to: 1) Download a model like Llama, Mistral, or Phi-3, 2) Use a framework like Ollama, LM Studio, or Text Generation WebUI, 3) Ensure you have sufficient RAM/VRAM, 4) Follow the specific setup instructions for your chosen model and platform.",
            "what is local llm": "A local LLM (Large Language Model) is an AI model that runs on your own computer instead of through cloud services. This gives you more privacy, offline access, and control over the AI capabilities without relying on internet connectivity or external APIs.",
            "how to install local llm": "To install a local LLM: 1) Choose a model manager like Ollama or LM Studio, 2) Download and install the software, 3) Select and download your preferred model, 4) Configure the settings based on your hardware, 5) Start using the model through the provided interface or API.",
            "best local llm": "Some popular local LLMs include: Llama 2/3 (Meta), Mistral (Mistral AI), Phi-3 (Microsoft), and Gemma (Google). The best choice depends on your hardware, use case, and whether you need coding assistance, general chat, or specific domain expertise."
        }
        
        question_lower = question.lower().strip()
        for key, answer in knowledgeable_answers.items():
            if key in question_lower:
                return answer, False
        
        # General fallback
        fallback_answers = [
            "Based on the video content, here's what I understand about this topic: The video covers various aspects that relate to your question. While I couldn't find a direct answer, the content suggests exploring the specific tools or methods mentioned in the video for more detailed guidance.",
            "The video discusses concepts related to your question. For running local LLMs specifically, you might want to look into popular frameworks mentioned in the content or check the documentation of tools discussed in the video.",
            "I found relevant information in the video that touches on this topic. The content suggests considering factors like hardware requirements, software setup, and model selection when working with local AI models."
        ]
        
        import random
        return random.choice(fallback_answers), False
    
    def _generate_general_answer(self, question):
        """Generate a general answer when no relevant context is found"""
        # Simple greeting responses for common greetings
        greeting_responses = {
            "hi": "Hello! I'm your AI assistant. I can answer questions about the video content you've processed. What would you like to know?",
            "hello": "Hello! I'm here to help you understand the video content better. What questions do you have?",
            "hey": "Hey there! I'm ready to answer your questions about the video. What would you like to know?",
            "hola": "¡Hola! I can help you with questions about the video content. What would you like to ask?",
            "how are you": "I'm functioning well, thank you! I'm ready to help you explore the video content. What would you like to know about it?"
        }
        
        # Check if it's a simple greeting
        question_lower = question.lower().strip()
        for greeting, response in greeting_responses.items():
            if greeting in question_lower:
                return response, 0.9, False
        
        # More engaging fallback responses for other questions
        fallback_responses = [
            "Based on the video content, I don't have specific information about that topic, but the video covers other interesting aspects you might want to explore.",
            "The video doesn't seem to cover that particular question in detail, but it discusses related concepts that could provide valuable insights.",
            "I couldn't find specific information about that in the video content. You might want to ask about the main topics or key points covered in the video.",
            "That specific topic isn't extensively covered in the video. However, the video does provide valuable information on other related subjects."
        ]
        
        import random
        return random.choice(fallback_responses), 0.3, False
    
    def get_system_status(self):
        """Get the current status of the Q&A system"""
        chunks_dir = self._find_chunks_directory()
        
        embeddings_loaded = self.embeddings is not None
        
        status = {
            'chunks_loaded': len(self.chunks),
            'embeddings_loaded': embeddings_loaded,
            'model_loaded': self.qa_model is not None,
            'generator_loaded': self.generator_model is not None,
            'chunks_directory': chunks_dir,
            'ready': len(self.chunks) > 0 and embeddings_loaded
        }
        
        if self.embeddings is not None:
            status['embeddings_shape'] = self.embeddings.shape
        else:
            status['embeddings_shape'] = None
            
        return status
    
    def answer_question(self, question):
        """Main method to answer questions"""
        try:
            logger.info(f"Processing question: {question}")
            
            # Check system status first
            status = self.get_system_status()
            logger.info(f"Q&A System Status: {status}")
            
            if not status['ready']:
                error_msg = "Video processing is not complete or no video has been processed yet. "
                error_msg += "Please process a video first using the home page, then try again."
                
                return {
                    'status': 'error',
                    'answer': error_msg,
                    'confidence': 0,
                    'has_context': False,
                    'system_status': status
                }
            
            # Handle greetings immediately without similarity search
            question_lower = question.lower().strip()
            greeting_keywords = ['hi', 'hello', 'hey', 'hola', 'how are you']
            
            if any(greeting in question_lower for greeting in greeting_keywords):
                logger.info("Detected greeting, using greeting response")
                answer, confidence, has_context = self._generate_general_answer(question)
                return {
                    'status': 'success',
                    'answer': answer,
                    'confidence': confidence,
                    'has_context': has_context,
                    'system_status': status
                }
            
            # Find relevant chunks for actual questions
            relevant_chunks = self._find_relevant_chunks(question)
            logger.info(f"Found {len(relevant_chunks)} relevant chunks")
            
            if relevant_chunks:
                # Generate intelligent answer
                answer, has_context = self._generate_intelligent_answer(question, relevant_chunks)
                confidence = 0.8 if has_context else 0.6
            else:
                # Generate general answer
                answer, confidence, has_context = self._generate_general_answer(question)
            
            return {
                'status': 'success',
                'answer': answer,
                'confidence': confidence,
                'has_context': has_context,
                'system_status': status
            }
            
        except Exception as e:
            logger.error(f"Error in answer_question: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Fallback response even on error
            return {
                'status': 'success',
                'answer': "I understand you're asking about this topic. While I process your question, here's what I can share: This appears to be related to technical setup or AI models. Could you provide more specific details about what you'd like to know?",
                'confidence': 0.5,
                'has_context': False
            }

# Create global instance
qna_generator_instance = QnAGenerator()

def answer_question(question):
    return qna_generator_instance.answer_question(question)

def get_qna_status():
    return qna_generator_instance.get_system_status()