// Q&A JavaScript - Royal Chat Interface
class RoyalQnA {
    constructor() {
        this.messagesContainer = document.getElementById('royal-messages-container');
        this.inputElement = document.getElementById('royal-input');
        this.sendButton = document.getElementById('royal-send-btn');
        this.typingIndicator = document.getElementById('royal-typing-indicator');
        this.questionCount = 0;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        
        // Check system status first
        const status = await this.checkSystemStatus();
        if (status.ready) {
            this.showWelcomeMessage();
        } else {
            this.showNotReadyMessage(status);
        }
        
        this.updateStats();
    }
    showNotReadyMessage(status) {
        const notReadyMessage = {
            sender: 'System',
            content: `🔧 <strong>Q&A System Not Ready</strong><br><br>
                     The Q&A feature needs a processed video to work.<br><br>
                     <strong>To get started:</strong><br>
                     1. Go to the <a href="{{ url_for('home') }}" style="color: var(--royal-gold);">Home page</a><br>
                     2. Process a YouTube video or upload a video file<br>
                     3. Wait for background processing to complete (check terminal)<br>
                     4. Return here to ask questions!<br><br>
                     <em>Status: ${status.chunks_loaded} chunks loaded, ${status.embeddings_loaded ? 'embeddings ready' : 'no embeddings'}</em>`,
            timestamp: this.getCurrentTime(),
            type: 'ai'
        };
        
        this.addMessage(notReadyMessage);
    }
    setupEventListeners() {
        // Send message on button click
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Send message on Enter key (but allow Shift+Enter for new line)
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        this.inputElement.addEventListener('input', () => {
            this.autoResizeTextarea();
        });
        
        // Focus input on page load
        this.inputElement.focus();
    }
    
    autoResizeTextarea() {
        this.inputElement.style.height = 'auto';
        this.inputElement.style.height = Math.min(this.inputElement.scrollHeight, 120) + 'px';
    }
    
    showWelcomeMessage() {
        const welcomeMessage = {
            sender: 'AI Assistant',
            content: `Welcome to the Video Q&A System! 👑<br><br>
                     I'm your AI assistant, ready to answer questions about the video content you've processed. 
                     Whether you're looking for specific information, explanations, or insights from the video, 
                     I'm here to help!<br><br>
                     <strong>How to get the best answers:</strong><br>
                     • Ask specific questions about the video content<br>
                     • Request explanations or clarifications<br>
                     • Ask about key points or main ideas<br>
                     • Inquire about specific topics covered in the video<br><br>
                     Go ahead and ask your first question!`,
            timestamp: this.getCurrentTime(),
            type: 'ai'
        };
        
        this.addMessage(welcomeMessage);
    }

    async checkSystemStatus() {
        try {
            const response = await fetch('/qna_status');
            const status = await response.json();
            console.log('Q&A System Status:', status);
            return status;
        } catch (error) {
            console.error('Error checking system status:', error);
            return { ready: false, error: error.message };
        }
    }
    
    async sendMessage() {
        const question = this.inputElement.value.trim();
        
        if (!question) {
            return;
        }
        
        // Add user message
        const userMessage = {
            sender: 'You',
            content: question,
            timestamp: this.getCurrentTime(),
            type: 'user'
        };
        
        this.addMessage(userMessage);
        this.clearInput();
        this.showTypingIndicator();
        this.disableInput();
        
        try {
            const response = await this.getAIResponse(question);
            this.hideTypingIndicator();
            this.addAIReply(response);
            this.updateStats();
        } catch (error) {
            this.hideTypingIndicator();
            this.showError('Failed to get response. Please try again.');
            console.error('Error:', error);
        }
        
        this.enableInput();
    }
    
    async getAIResponse(question) {
        const response = await fetch('/ask_question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: question })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        return await response.json();
    }
    
    addMessage(message) {
        const messageElement = this.createMessageElement(message);
        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
        
        // Add animation
        messageElement.style.animation = 'messageSlide 0.5s ease-out';
    }
    
    addAIReply(response) {
        if (response.status === 'success') {
            this.questionCount++;
            
            const aiMessage = {
                sender: 'AI Assistant',
                content: response.answer,
                timestamp: this.getCurrentTime(),
                type: 'ai',
                confidence: response.confidence,
                hasContext: response.has_context
            };
            
            this.addMessage(aiMessage);
        } else {
            this.showError(response.answer || 'Sorry, I encountered an error.');
        }
    }
    
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `royal-message ${message.type}`;
        
        const confidenceBadge = message.confidence > 0.7 ? 
            `<div class="royal-confidence high">
                <i class="fas fa-crown"></i>
                High Confidence
            </div>` : 
            message.confidence > 0 ? 
            `<div class="royal-confidence">
                <i class="fas fa-info-circle"></i>
                General Answer
            </div>` : '';
        
        messageDiv.innerHTML = `
            <div class="royal-message-header">
                <div class="royal-message-avatar">
                    <i class="fas ${message.type === 'ai' ? 'fa-robot' : 'fa-user'}"></i>
                </div>
                <span class="royal-message-sender">${message.sender}</span>
                <span class="royal-message-time">${message.timestamp}</span>
            </div>
            <div class="royal-message-content">
                ${message.content}
                ${confidenceBadge}
            </div>
        `;
        
        return messageDiv;
    }
    
    showTypingIndicator() {
        this.typingIndicator.style.display = 'block';
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }
    
    showError(message) {
        const errorMessage = {
            sender: 'System',
            content: `<i class="fas fa-exclamation-triangle"></i> ${message}`,
            timestamp: this.getCurrentTime(),
            type: 'ai'
        };
        
        this.addMessage(errorMessage);
    }
    
    clearInput() {
        this.inputElement.value = '';
        this.autoResizeTextarea();
    }
    
    disableInput() {
        this.inputElement.disabled = true;
        this.sendButton.disabled = true;
    }
    
    enableInput() {
        this.inputElement.disabled = false;
        this.sendButton.disabled = false;
        this.inputElement.focus();
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }
    
    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }
    
    updateStats() {
        document.getElementById('royal-questions-count').textContent = this.questionCount;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RoyalQnA();
});

// Additional utility functions
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!');
    });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'royal-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--royal-gradient);
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add CSS for notification animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);