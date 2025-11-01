document.addEventListener("DOMContentLoaded", () => {
    const uploadArea = document.getElementById("upload-area");
    const fileInput = document.getElementById("file-input");
    const uploadStatus = document.getElementById("upload-status");
    const processBtn = document.getElementById("process-btn");
    const urlInput = document.getElementById("video-url");
    const optionsSection = document.getElementById("options-section");

    // Hide options initially
    optionsSection.style.display = "none";

    // File Upload Logic
    uploadArea.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validTypes = ["video/mp4", "video/mov", "video/avi"];
        if (!validTypes.includes(file.type)) {
            uploadStatus.innerHTML = `<p style="color: red; text-align:center;">❌ Invalid file type.</p>`;
            optionsSection.style.display = "none";
            return;
        }

        uploadStatus.innerHTML = `<p style="color: var(--primary); text-align:center;"><i class="fas fa-sync fa-spin"></i> Processing video...</p>`;

        setTimeout(() => {
            uploadStatus.innerHTML = `<p style="color: green; text-align:center;"><i class="fas fa-check-circle"></i> Video processed successfully!</p>`;
            optionsSection.style.display = "block";
        }, 2000);
    });

    // YouTube URL Validation
    processBtn.addEventListener("click", () => {
        const url = urlInput.value.trim();
        if (!isValidYouTubeUrl(url)) {
            uploadStatus.innerHTML = `<p style="color: red; text-align:center;">❌ Please enter a valid YouTube URL.</p>`;
            optionsSection.style.display = "none";
            return;
        }

        uploadStatus.innerHTML = `<p style="color: var(--primary); text-align:center;"><i class="fas fa-sync fa-spin"></i> Processing YouTube video...</p>`;

        setTimeout(() => {
            uploadStatus.innerHTML = `<p style="color: green; text-align:center;"><i class="fas fa-check-circle"></i> YouTube video processed successfully!</p>`;
            optionsSection.style.display = "block";
        }, 2000);
    });

    function isValidYouTubeUrl(url) {
        const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
        return pattern.test(url);
    }
});

// File upload functionality
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');
const optionsSection = document.getElementById('options-section');
const processBtn = document.getElementById('process-btn');
const videoUrl = document.getElementById('video-url');

// Initialize floating elements
function initFloatingElements() {
    const container = document.querySelector('.floating-elements');
    const count = 5;
    
    for (let i = 0; i < count; i++) {
        const element = document.createElement('div');
        element.classList.add('floating-element');
        
        // Random properties
        const size = Math.random() * 100 + 50;
        const top = Math.random() * 100;
        const left = Math.random() * 100;
        const delay = Math.random() * 20;
        
        element.style.width = `${size}px`;
        element.style.height = `${size}px`;
        element.style.top = `${top}%`;
        element.style.left = `${left}%`;
        element.style.animationDelay = `-${delay}s`;
        
        container.appendChild(element);
    }
}

// File upload handling
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        const fileName = e.target.files[0].name;
        showUploadStatus(`<i class="fas fa-check-circle"></i> Selected: ${fileName}`, 'success');
        
        // Simulate processing
        setTimeout(() => {
            showUploadStatus('<i class="fas fa-sync fa-spin"></i> Processing video...', 'processing');
            
            setTimeout(() => {
                showUploadStatus('<i class="fas fa-check-circle"></i> Video processed successfully! Select an analysis option below.', 'success');
                showOptionsSection();
            }, 2000);
        }, 1000);
    }
});

// URL processing
processBtn.addEventListener('click', () => {
    const url = videoUrl.value.trim();
    
    if (!url) {
        showUploadStatus('<i class="fas fa-exclamation-circle"></i> Please enter a valid YouTube URL', 'error');
        return;
    }
    
    if (!isValidYouTubeUrl(url)) {
        showUploadStatus('<i class="fas fa-exclamation-circle"></i> Please enter a valid YouTube URL', 'error');
        return;
    }
    
    showUploadStatus('<i class="fas fa-sync fa-spin"></i> Processing YouTube video...', 'processing');
    
    // Simulate processing
    setTimeout(() => {
        showUploadStatus('<i class="fas fa-check-circle"></i> YouTube video processed successfully! Select an analysis option below.', 'success');
        showOptionsSection();
    }, 2000);
});

// Option cards interaction
const optionCards = document.querySelectorAll('.option-card');

optionCards.forEach(card => {
    card.addEventListener('click', () => {
        // Remove active class from all cards
        optionCards.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked card
        card.classList.add('active');
        
        // Get the selected option
        const option = card.getAttribute('data-option');
        
        // Show processing message
        showUploadStatus(`<i class="fas fa-sync fa-spin"></i> Generating ${getOptionName(option)}... This may take a few moments.`, 'processing');
        
        // Simulate processing completion
        setTimeout(() => {
            showUploadStatus(`<i class="fas fa-check-circle"></i> ${getOptionName(option)} generated successfully!`, 'success');
        }, 3000);
    });
});

// Helper functions
function getOptionName(option) {
    switch(option) {
        case 'summary': return 'Video summary';
        case 'notes': return 'Notes';
        case 'quiz': return 'Quiz';
        case 'qna': return 'Q&A session';
        default: return 'Content';
    }
}

function isValidYouTubeUrl(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    return pattern.test(url);
}

function showUploadStatus(message, type) {
    let color;
    
    switch(type) {
        case 'success':
            color = '#42e2b8';
            break;
        case 'error':
            color = '#ff6584';
            break;
        case 'processing':
            color = '#6c63ff';
            break;
        default:
            color = '#6c63ff';
    }
    
    uploadStatus.innerHTML = `<p style="color: ${color}; text-align: center; margin-top: 15px; font-weight: 500;">${message}</p>`;
}

function showOptionsSection() {
    optionsSection.classList.add('visible');
    optionsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initFloatingElements();
    
    // Add scroll effect to header
    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.style.background = 'rgba(15, 15, 26, 0.95)';
            header.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
        } else {
            header.style.background = 'rgba(26, 26, 46, 0.85)';
            header.style.boxShadow = 'none';
        }
    });
});