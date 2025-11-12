document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const contentPlaceholder = document.getElementById("content-placeholder");
    const transcriptText = document.getElementById("transcript-text");
    const textContent = document.getElementById("text-content");
    const translationSection = document.getElementById("translation-section");
    const translationContent = document.getElementById("translation-content");
    const loadingState = document.getElementById("loading-state");
    const errorState = document.getElementById("error-state");
    const errorMessage = document.getElementById("error-message");
    
    // Buttons
    const translateBtn = document.getElementById("translate-btn");
    const downloadBtn = document.getElementById("download-btn");
    const copyBtn = document.getElementById("copy-btn");
    const searchBtn = document.getElementById("search-btn");
    const retryBtn = document.getElementById("retry-btn");
    
    // Info elements
    const wordCountEl = document.getElementById("word-count");
    const languageDetectedEl = document.getElementById("language-detected");
    const videoDurationEl = document.getElementById("video-duration");
    
    // Modal elements
    const searchModal = document.getElementById("search-modal");
    const searchInput = document.getElementById("search-input");
    const searchResults = document.getElementById("search-results");
    const closeSearch = document.getElementById("close-search");
    
    let currentTranscript = "";
    let currentTranslation = "";
    let isTranslated = false;

    // Initialize the page
    initPage();

    function initPage() {
        // Load existing transcript immediately
        loadExistingTranscript();
        
        // Add event listeners
        setupEventListeners();
    }

    function setupEventListeners() {
        translateBtn.addEventListener("click", handleTranslate);
        downloadBtn.addEventListener("click", handleDownload);
        copyBtn.addEventListener("click", handleCopy);
        searchBtn.addEventListener("click", handleSearch);
        retryBtn.addEventListener("click", handleRetry);
        
        // Search modal events
        closeSearch.addEventListener("click", () => searchModal.style.display = "none");
        searchInput.addEventListener("input", handleSearchInput);
        
        // Close modal when clicking outside
        window.addEventListener("click", (e) => {
            if (e.target === searchModal) {
                searchModal.style.display = "none";
            }
        });
    }

    async function loadExistingTranscript() {
        try {
            // Show loading state
            showLoadingState('Loading transcript...');
            
            // Check if we have transcript data - FIXED: using correct endpoint
            const response = await fetch('/get_transcript');
            const data = await response.json();
            
            if (data.status === 'success' && data.transcript) {
                currentTranscript = data.transcript;
                currentTranslation = data.english_transcript || '';
                
                displayTranscript(currentTranscript);
                updateWordCount(data.word_count || currentTranscript.split(/\s+/).length);
                detectLanguage(currentTranscript);
                hideLoadingState();
                
                // Show translation button if English version exists
                if (currentTranslation) {
                    translateBtn.style.display = 'inline-flex';
                }
            } else {
                showPlaceholderState();
            }
        } catch (error) {
            console.error('Error loading transcript:', error);
            showPlaceholderState();
        }
    }

    function displayTranscript(transcript) {
        contentPlaceholder.style.display = 'none';
        transcriptText.style.display = 'block';
        
        // Format the transcript with paragraphs
        const formattedTranscript = formatTranscript(transcript);
        textContent.innerHTML = formattedTranscript;
        
        // Add fade-in animation
        transcriptText.classList.add('fade-in');
    }

    function formatTranscript(transcript) {
        // Split into sentences and create paragraphs
        const sentences = transcript.split(/(?<=[.!?])\s+/);
        let paragraphs = [];
        let currentParagraph = [];
        
        // Group sentences into paragraphs (3-4 sentences per paragraph)
        sentences.forEach((sentence, index) => {
            currentParagraph.push(sentence);
            if (currentParagraph.length >= 3 || index === sentences.length - 1) {
                paragraphs.push(currentParagraph.join(' '));
                currentParagraph = [];
            }
        });
        
        // Create HTML with paragraphs
        return paragraphs.map(paragraph => 
            `<p style="margin-bottom: 1.5rem; text-align: justify;">${paragraph}</p>`
        ).join('');
    }

    async function handleTranslate() {
        if (!currentTranscript) {
            showError('No transcript available to translate');
            return;
        }
        
        // Toggle between original and translated
        if (isTranslated) {
            // Show original
            translationSection.style.display = 'none';
            transcriptText.style.display = 'block';
            isTranslated = false;
            translateBtn.innerHTML = '<i class="fas fa-language"></i>Translate to English';
            return;
        }
        
        // If we already have translation, use it
        if (currentTranslation) {
            displayTranslation(currentTranslation);
            isTranslated = true;
            translateBtn.innerHTML = '<i class="fas fa-sync"></i>Show Original';
            return;
        }
        
        try {
            showLoadingState('Translating to English...');
            translateBtn.disabled = true;
            
            // Call translation endpoint
            const response = await fetch('/translate_transcript', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ transcript: currentTranscript })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                currentTranslation = data.translated_text;
                displayTranslation(currentTranslation);
                isTranslated = true;
                translateBtn.innerHTML = '<i class="fas fa-sync"></i>Show Original';
            } else {
                throw new Error(data.message || 'Translation failed');
            }
            
        } catch (error) {
            console.error('Translation error:', error);
            showError('Translation failed. Please try again.');
        } finally {
            hideLoadingState();
            translateBtn.disabled = false;
        }
    }

    function displayTranslation(translation) {
        transcriptText.style.display = 'none';
        translationSection.style.display = 'block';
        translationContent.innerHTML = formatTranscript(translation);
        translationSection.classList.add('fade-in');
    }

    function handleDownload() {
        if (!currentTranscript) {
            showError('No transcript available to download');
            return;
        }
        
        const content = isTranslated ? currentTranslation : currentTranscript;
        const filename = `video_transcript_${new Date().getTime()}.txt`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show success feedback
        showToast('Transcript downloaded successfully!');
    }

    function handleCopy() {
        if (!currentTranscript) {
            showError('No transcript available to copy');
            return;
        }
        
        const content = isTranslated ? currentTranslation : currentTranscript;
        
        navigator.clipboard.writeText(content).then(() => {
            showToast('Transcript copied to clipboard!');
        }).catch(() => {
            showError('Failed to copy transcript');
        });
    }

    function handleSearch() {
        if (!currentTranscript) {
            showError('No transcript available to search');
            return;
        }
        
        searchModal.style.display = 'block';
        searchInput.value = '';
        searchResults.innerHTML = '';
        searchInput.focus();
    }

    function handleSearchInput(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (!searchTerm) {
            searchResults.innerHTML = '';
            return;
        }
        
        const content = isTranslated ? currentTranslation : currentTranscript;
        const sentences = content.split(/(?<=[.!?])\s+/);
        const results = sentences.filter(sentence => 
            sentence.toLowerCase().includes(searchTerm)
        );
        
        displaySearchResults(results, searchTerm);
    }

    function displaySearchResults(results, searchTerm) {
        if (results.length === 0) {
            searchResults.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.7); padding: 20px;">No results found</p>';
            return;
        }
        
        const highlightedResults = results.map(result => {
            const highlighted = result.replace(
                new RegExp(searchTerm, 'gi'),
                match => `<mark style="background: var(--primary); color: white; padding: 2px 4px; border-radius: 4px;">${match}</mark>`
            );
            return `<div class="search-result-item">${highlighted}</div>`;
        }).join('');
        
        searchResults.innerHTML = highlightedResults;
    }

    function handleRetry() {
        hideErrorState();
        loadExistingTranscript();
    }

    function updateWordCount(count) {
        wordCountEl.textContent = count.toLocaleString();
    }

    function detectLanguage(text) {
        // Simple language detection (this is a basic implementation)
        // In a real app, you would use a proper language detection library
        const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with'];
        const wordCount = text.toLowerCase().split(/\s+/).length;
        const englishWordCount = englishWords.filter(word => 
            text.toLowerCase().includes(word)
        ).length;
        
        const englishRatio = englishWordCount / Math.min(wordCount, 100);
        
        if (englishRatio > 0.3) {
            languageDetectedEl.textContent = 'English';
            languageDetectedEl.style.color = 'var(--success)';
        } else {
            languageDetectedEl.textContent = 'Other';
            languageDetectedEl.style.color = 'var(--warning)';
        }
    }

    // State management functions
    function showLoadingState(message = 'Loading Transcript...') {
        loadingState.style.display = 'block';
        contentPlaceholder.style.display = 'none';
        transcriptText.style.display = 'none';
        translationSection.style.display = 'none';
        errorState.style.display = 'none';
        
        if (message) {
            loadingState.querySelector('h3').textContent = message;
        }
    }

    function hideLoadingState() {
        loadingState.style.display = 'none';
    }

    function showPlaceholderState() {
        contentPlaceholder.style.display = 'block';
        transcriptText.style.display = 'none';
        translationSection.style.display = 'none';
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorState.style.display = 'block';
        contentPlaceholder.style.display = 'none';
        transcriptText.style.display = 'none';
        translationSection.style.display = 'none';
        loadingState.style.display = 'none';
    }

    function hideErrorState() {
        errorState.style.display = 'none';
    }

    function showToast(message) {
        // Create toast element
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 3000;
            animation: slideInRight 0.3s ease-out;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // Add CSS for animations
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
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        mark {
            background: var(--primary) !important;
            color: white !important;
            padding: 2px 4px !important;
            border-radius: 4px !important;
        }
    `;
    document.head.appendChild(style);
});