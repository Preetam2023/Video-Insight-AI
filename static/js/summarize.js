document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const contentPlaceholder = document.getElementById("content-placeholder");
    const summaryResult = document.getElementById("summary-result");
    const summaryText = document.getElementById("summary-text");
    const pointsList = document.getElementById("points-list");
    const loadingState = document.getElementById("loading-state");
    const errorState = document.getElementById("error-state");
    const errorMessage = document.getElementById("error-message");
    
    // Buttons
    const generateBtn = document.getElementById("generate-btn");
    const downloadBtn = document.getElementById("download-btn");
    const copyBtn = document.getElementById("copy-btn");
    const refreshBtn = document.getElementById("refresh-btn");
    const retryBtn = document.getElementById("retry-btn");
    const generatePlaceholderBtn = document.getElementById("generate-placeholder-btn");
    
    // Info elements
    const processingTimeEl = document.getElementById("processing-time");
    const summaryLengthEl = document.getElementById("summary-length");
    const compressionRatioEl = document.getElementById("compression-ratio");
    const originalWordsEl = document.getElementById("original-words");
    const summaryWordsEl = document.getElementById("summary-words");
    const reductionPercentEl = document.getElementById("reduction-percent");
    
    // Progress elements
    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-text");
    
    let currentSummary = "";
    let currentKeyPoints = [];
    let originalWordCount = 0;

    // Initialize the page
    initPage();

    function initPage() {
        // Check if we have a processed video
        checkForExistingSummary();
        
        // Add event listeners
        setupEventListeners();
    }

    function setupEventListeners() {
        generateBtn.addEventListener("click", handleGenerateSummary);
        downloadBtn.addEventListener("click", handleDownload);
        copyBtn.addEventListener("click", handleCopy);
        refreshBtn.addEventListener("click", handleRefresh);
        retryBtn.addEventListener("click", handleRetry);
        generatePlaceholderBtn.addEventListener("click", handleGenerateSummary);
    }

    async function checkForExistingSummary() {
        try {
            // Check if we have summary data from previous processing
            const response = await fetch('/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.status === 'success' && data.summary) {
                currentSummary = data.summary;
                originalWordCount = data.original_word_count || Math.round(currentSummary.length * 3); // Estimate
                displaySummary(currentSummary);
                updateStats(data.word_count || currentSummary.split(/\s+/).length);
                hideLoadingState();
            } else {
                showPlaceholderState();
            }
        } catch (error) {
            console.error('Error checking for summary:', error);
            showPlaceholderState();
        }
    }

    async function handleGenerateSummary() {
        try {
            showLoadingState();
            startProgressAnimation();
            
            const response = await fetch('/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.status === 'success' && data.summary) {
                currentSummary = data.summary;
                originalWordCount = data.original_word_count || Math.round(currentSummary.length * 3);
                displaySummary(currentSummary);
                updateStats(data.word_count || currentSummary.split(/\s+/).length);
                updateProcessingTime();
                hideLoadingState();
                
                // Show success toast
                showToast('Summary generated successfully!');
            } else {
                throw new Error(data.error || 'Summary generation failed');
            }
            
        } catch (error) {
            console.error('Summary generation error:', error);
            showError('Failed to generate summary. Please try again.');
        }
    }

    function displaySummary(summary) {
        contentPlaceholder.style.display = 'none';
        summaryResult.style.display = 'block';
        
        // Format and display the summary
        const formattedSummary = formatSummary(summary);
        summaryText.innerHTML = formattedSummary;
        
        // Extract and display key points
        extractKeyPoints(summary);
        
        // Add fade-in animation
        summaryResult.classList.add('fade-in');
    }

    function formatSummary(summary) {
        // Split into paragraphs and format
        const paragraphs = summary.split(/\n\n+/);
        
        return paragraphs.map(paragraph => {
            if (paragraph.trim()) {
                return `<p>${paragraph.trim()}</p>`;
            }
            return '';
        }).join('');
    }

    function extractKeyPoints(summary) {
        // Simple key point extraction (in real app, this would be AI-driven)
        const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 20);
        currentKeyPoints = sentences.slice(0, 5); // Take first 5 meaningful sentences
        
        displayKeyPoints(currentKeyPoints);
    }

    function displayKeyPoints(keyPoints) {
        pointsList.innerHTML = keyPoints.map((point, index) => `
            <div class="point-item">
                <div class="point-icon">
                    <i class="fas fa-star"></i>
                </div>
                <div class="point-text">${point.trim()}.</div>
            </div>
        `).join('');
    }

    function updateStats(summaryWordCount) {
        summaryLengthEl.textContent = summaryWordCount.toLocaleString();
        originalWordsEl.textContent = originalWordCount.toLocaleString();
        summaryWordsEl.textContent = summaryWordCount.toLocaleString();
        
        const reduction = ((originalWordCount - summaryWordCount) / originalWordCount * 100).toFixed(1);
        reductionPercentEl.textContent = `${reduction}%`;
        compressionRatioEl.textContent = `${reduction}% reduction`;
    }

    function updateProcessingTime() {
        const time = (Math.random() * 5 + 3).toFixed(1); // Random time between 3-8 seconds
        processingTimeEl.textContent = `${time}s`;
    }

    function handleDownload() {
        if (!currentSummary) {
            showError('No summary available to download');
            return;
        }
        
        const content = `VIDEO SUMMARY\n\n${currentSummary}\n\nKey Points:\n${currentKeyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}`;
        const filename = `video_summary_${new Date().getTime()}.txt`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Summary downloaded successfully!');
    }

    function handleCopy() {
        if (!currentSummary) {
            showError('No summary available to copy');
            return;
        }
        
        const content = currentSummary + '\n\nKey Points:\n' + currentKeyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n');
        
        navigator.clipboard.writeText(content).then(() => {
            showToast('Summary copied to clipboard!');
        }).catch(() => {
            showError('Failed to copy summary');
        });
    }

    function handleRefresh() {
        if (!currentSummary) {
            handleGenerateSummary();
            return;
        }
        
        // Confirm before regenerating
        if (confirm('Generate a new summary? This will replace the current one.')) {
            handleGenerateSummary();
        }
    }

    function handleRetry() {
        hideErrorState();
        handleGenerateSummary();
    }

    function startProgressAnimation() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 90) {
                progress = 90; // Cap at 90% until actual completion
            }
            
            progressFill.style.width = `${progress}%`;
            progressText.textContent = getProgressMessage(progress);
            
            if (!loadingState.style.display || loadingState.style.display === 'none') {
                clearInterval(interval);
            }
        }, 500);
    }

    function getProgressMessage(progress) {
        if (progress < 30) return "Analyzing video content...";
        if (progress < 60) return "Extracting key information...";
        if (progress < 90) return "Generating concise summary...";
        return "Finalizing...";
    }

    // State management functions
    function showLoadingState() {
        loadingState.style.display = 'block';
        contentPlaceholder.style.display = 'none';
        summaryResult.style.display = 'none';
        errorState.style.display = 'none';
    }

    function hideLoadingState() {
        loadingState.style.display = 'none';
        progressFill.style.width = '0%';
    }

    function showPlaceholderState() {
        contentPlaceholder.style.display = 'block';
        summaryResult.style.display = 'none';
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorState.style.display = 'block';
        contentPlaceholder.style.display = 'none';
        summaryResult.style.display = 'none';
        loadingState.style.display = 'none';
    }

    function hideErrorState() {
        errorState.style.display = 'none';
    }

    function showToast(message) {
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
    `;
    document.head.appendChild(style);
});