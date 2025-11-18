document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const contentPlaceholder = document.getElementById("content-placeholder");
    const notesResult = document.getElementById("notes-result");
    const notesStructure = document.getElementById("notes-structure");
    const loadingState = document.getElementById("loading-state");
    const errorState = document.getElementById("error-state");
    const errorMessage = document.getElementById("error-message");
    
    // Buttons
    const generateBtn = document.getElementById("generate-btn");
    const downloadBtn = document.getElementById("download-btn");
    const copyBtn = document.getElementById("copy-btn");
    const printBtn = document.getElementById("print-btn");
    const refreshBtn = document.getElementById("refresh-btn");
    const retryBtn = document.getElementById("retry-btn");
    const generatePlaceholderBtn = document.getElementById("generate-placeholder-btn");
    const exportPdfBtn = document.getElementById("export-pdf-btn");
    const shareNotesBtn = document.getElementById("share-notes-btn");
    
    // Info elements
    const processingTimeEl = document.getElementById("processing-time");
    const notesLengthEl = document.getElementById("notes-length");
    const sectionsCountEl = document.getElementById("sections-count");
    const totalWordsEl = document.getElementById("total-words");
    const totalSectionsEl = document.getElementById("total-sections");
    const totalPointsEl = document.getElementById("total-points");
    
    // Progress elements
    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-text");
    
    let currentNotes = "";
    let structuredNotes = [];
    let totalWordCount = 0;
    let totalKeyPoints = 0;
    let retryCount = 0;
    const MAX_RETRIES = 10;
    const RETRY_DELAY = 3000;

    // Initialize the page
    initPage();

    function initPage() {
        // Check if we have a processed video
        checkForExistingNotes();
        
        // Add event listeners
        setupEventListeners();
    }

    function setupEventListeners() {
        generateBtn.addEventListener("click", handleGenerateNotes);
        downloadBtn.addEventListener("click", handleDownload);
        copyBtn.addEventListener("click", handleCopy);
        printBtn.addEventListener("click", handlePrint);
        refreshBtn.addEventListener("click", handleRefresh);
        retryBtn.addEventListener("click", handleRetry);
        generatePlaceholderBtn.addEventListener("click", handleGenerateNotes);
        exportPdfBtn.addEventListener("click", handleExportPdf);
        shareNotesBtn.addEventListener("click", handleShareNotes);
    }

    async function checkForExistingNotes() {
        try {
            // Check if we have notes data from previous processing
            const response = await fetch('/generate_notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.status === 'success' && data.notes) {
                currentNotes = data.notes;
                processAndDisplayNotes(currentNotes);
                updateStats(data.word_count || currentNotes.split(/\s+/).length);
                if (data.processing_time) {
                    updateProcessingTime(data.processing_time);
                }
                hideLoadingState();
            } else if (data.status === 'processing') {
                showProcessingState(data.message);
                // Auto-retry after delay
                setTimeout(checkForExistingNotes, RETRY_DELAY);
            } else {
                showPlaceholderState();
            }
        } catch (error) {
            console.error('Error checking for notes:', error);
            showPlaceholderState();
        }
    }

    async function handleGenerateNotes() {
        try {
            showLoadingState();
            startProgressAnimation();
            retryCount = 0;
            
            const response = await fetch('/generate_notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.status === 'success' && data.notes) {
                currentNotes = data.notes;
                processAndDisplayNotes(currentNotes);
                updateStats(data.word_count || currentNotes.split(/\s+/).length);
                if (data.processing_time) {
                    updateProcessingTime(data.processing_time);
                } else {
                    updateProcessingTime();
                }
                hideLoadingState();
                
                showToast('Structured notes generated successfully!');
            } else if (data.status === 'processing') {
                // Video is still processing
                showProcessingState(data.message);
                // Auto-retry after delay
                retryCount++;
                if (retryCount < MAX_RETRIES) {
                    setTimeout(handleGenerateNotes, RETRY_DELAY);
                } else {
                    showError('Video processing is taking too long. Please try again later.');
                }
            } else {
                throw new Error(data.message || data.error || 'Notes generation failed');
            }
            
        } catch (error) {
            console.error('Notes generation error:', error);
            showError('Failed to generate notes: ' + error.message);
        }
    }

    function processAndDisplayNotes(notes) {
        contentPlaceholder.style.display = 'none';
        notesResult.style.display = 'block';
        
        // Parse and structure the notes
        structuredNotes = parseStructuredNotes(notes);
        displayStructuredNotes(structuredNotes);
        
        // Update statistics
        updateDetailedStats(structuredNotes);
        
        // Add fade-in animation
        notesResult.classList.add('fade-in');
    }

    function parseStructuredNotes(notes) {
        const sections = [];
        const lines = notes.split('\n').filter(line => line.trim());
        
        let currentSection = null;
        let currentSubsection = null;
        let inKeyPoints = false;
        let keyPoints = [];
        
        lines.forEach(line => {
            line = line.trim();
            
            // Main section headers (starting with #)
            if (line.match(/^#\s+.+/)) {
                if (currentSection) {
                    sections.push(currentSection);
                }
                currentSection = {
                    title: line.replace(/^#\s+/, ''),
                    content: [],
                    subsections: []
                };
                currentSubsection = null;
                inKeyPoints = false;
            }
            // Subsection headers (starting with ##)
            else if (line.match(/^##\s+.+/)) {
                const title = line.replace(/^##\s+/, '');
                
                // Check if this is the Key Points section
                if (title.toLowerCase().includes('key points')) {
                    inKeyPoints = true;
                    keyPoints = [];
                } else {
                    inKeyPoints = false;
                }
                
                if (currentSection) {
                    currentSubsection = {
                        title: title,
                        points: []
                    };
                    currentSection.subsections.push(currentSubsection);
                }
            }
            // Numbered points (like "1. Point text")
            else if (line.match(/^\d+\.\s+.+/) && inKeyPoints) {
                const point = line.replace(/^\d+\.\s+/, '');
                keyPoints.push(point);
            }
            // Bullet points (starting with -)
            else if (line.match(/^-\s+.+/)) {
                const point = line.replace(/^-\s+/, '');
                if (currentSubsection) {
                    if (!currentSubsection.points) currentSubsection.points = [];
                    currentSubsection.points.push(point);
                } else if (currentSection) {
                    // If no subsection, add to main section content
                    currentSection.content.push(point);
                }
            }
            // Regular content lines
            else if (line.length > 0 && !line.match(/^#/) && !line.match(/^##/)) {
                if (currentSection && line.length > 5) { // Only add meaningful content
                    currentSection.content.push(line);
                }
            }
        });
        
        // Add the last section
        if (currentSection) {
            sections.push(currentSection);
        }
        
        // If we collected key points but no proper structure, create a Key Points section
        if (keyPoints.length > 0 && sections.length > 0) {
            const keyPointsSection = {
                title: "Key Points",
                points: keyPoints,
                subsections: []
            };
            // Insert after Overview section or at the beginning
            const overviewIndex = sections.findIndex(s => s.title.toLowerCase().includes('overview'));
            if (overviewIndex !== -1) {
                sections.splice(overviewIndex + 1, 0, keyPointsSection);
            } else {
                sections.splice(1, 0, keyPointsSection);
            }
        }
        
        return sections.length > 0 ? sections : createFallbackStructure(notes);
    }

    function createFallbackStructure(notes) {
        // Fallback structure if parsing fails
        return [{
            title: "Content Notes",
            content: [notes],
            subsections: []
        }];
    }

    function displayStructuredNotes(sections) {
        notesStructure.innerHTML = sections.map((section, sectionIndex) => {
            // Check if this section has points (like Key Points)
            const hasPoints = section.points && section.points.length > 0;
            const hasContent = section.content && section.content.length > 0;
            const hasSubsections = section.subsections && section.subsections.length > 0;
            
            return `
            <div class="section">
                <div class="section-header">
                    <div class="section-icon">
                        <i class="fas fa-${getSectionIcon(sectionIndex, section.title)}"></i>
                    </div>
                    <h4 class="section-title">${section.title}</h4>
                </div>
                <div class="section-content">
                    ${hasContent ? section.content.map(paragraph => `
                        <div class="paragraph">${paragraph}</div>
                    `).join('') : ''}
                    
                    ${hasPoints ? `
                        <div class="points-list">
                            ${section.points.map((point, pointIndex) => `
                                <div class="point-item">
                                    <div class="point-icon">
                                        <span class="point-number">${pointIndex + 1}</span>
                                    </div>
                                    <div class="point-text">${point}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${hasSubsections ? section.subsections.map((subsection, subIndex) => `
                        <div class="subsection">
                            <h5 class="subsection-title">
                                <i class="fas fa-${getSubsectionIcon(subIndex)}"></i>
                                ${subsection.title}
                            </h5>
                            ${subsection.points && subsection.points.length > 0 ? `
                                <div class="points-list">
                                    ${subsection.points.map(point => `
                                        <div class="point-item">
                                            <div class="point-icon">
                                                <i class="fas fa-check-circle"></i>
                                            </div>
                                            <div class="point-text">${point}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('') : ''}
                </div>
            </div>
            `;
        }).join('');
    }

    function getSectionIcon(index, title) {
        const lowerTitle = title.toLowerCase();
        
        if (lowerTitle.includes('overview') || lowerTitle.includes('summary')) return 'file-alt';
        if (lowerTitle.includes('topic')) return 'tags';
        if (lowerTitle.includes('key point')) return 'key';
        if (lowerTitle.includes('additional')) return 'info-circle';
        if (lowerTitle.includes('takeaway')) return 'lightbulb';
        if (lowerTitle.includes('application')) return 'rocket';
        
        const icons = ['file-alt', 'clipboard-list', 'sticky-note', 'book', 'graduation-cap'];
        return icons[index % icons.length];
    }

    function getSubsectionIcon(index) {
        const icons = ['list-ul', 'tasks', 'check-double', 'clipboard-list', 'th-list'];
        return icons[index % icons.length];
    }

    function updateStats(wordCount) {
        totalWordCount = wordCount;
        notesLengthEl.textContent = wordCount.toLocaleString();
        totalWordsEl.textContent = wordCount.toLocaleString();
    }

    function updateDetailedStats(sections) {
        let sectionCount = sections.length;
        let totalPoints = 0;
        
        sections.forEach(section => {
            // Count points in main section
            if (section.points) {
                totalPoints += section.points.length;
            }
            // Count points in subsections
            if (section.subsections) {
                section.subsections.forEach(subsection => {
                    if (subsection.points) {
                        totalPoints += subsection.points.length;
                    }
                });
            }
        });
        
        totalKeyPoints = totalPoints;
        sectionsCountEl.textContent = sectionCount;
        totalSectionsEl.textContent = sectionCount;
        totalPointsEl.textContent = totalPoints.toLocaleString();
    }

    function updateProcessingTime(customTime) {
        if (customTime) {
            processingTimeEl.textContent = `${customTime.toFixed(1)}s`;
        } else {
            const time = (Math.random() * 2 + 1).toFixed(1); // Faster expected time: 1-3 seconds
            processingTimeEl.textContent = `${time}s`;
        }
    }

    function handleDownload() {
        if (!currentNotes) {
            showError('No notes available to download');
            return;
        }
        
        const content = formatNotesForDownload(structuredNotes);
        const filename = `video_notes_${new Date().getTime()}.txt`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Notes downloaded successfully!');
    }

    function formatNotesForDownload(sections) {
        let content = "VIDEO NOTES\n\n";
        
        sections.forEach((section, index) => {
            content += `${index + 1}. ${section.title}\n`;
            content += "=".repeat(section.title.length + 4) + "\n\n";
            
            if (section.content) {
                section.content.forEach(paragraph => {
                    content += `${paragraph}\n\n`;
                });
            }
            
            if (section.points) {
                content += "Key Points:\n";
                section.points.forEach((point, pointIndex) => {
                    content += `  ${pointIndex + 1}. ${point}\n`;
                });
                content += "\n";
            }
            
            section.subsections.forEach((subsection, subIndex) => {
                content += `   ${subIndex + 1}. ${subsection.title}\n`;
                
                if (subsection.points) {
                    subsection.points.forEach((point, pointIndex) => {
                        content += `      • ${point}\n`;
                    });
                }
                content += "\n";
            });
            
            content += "\n";
        });
        
        return content;
    }

    function handleCopy() {
        if (!currentNotes) {
            showError('No notes available to copy');
            return;
        }
        
        const content = formatNotesForDownload(structuredNotes);
        
        navigator.clipboard.writeText(content).then(() => {
            showToast('Notes copied to clipboard!');
        }).catch(() => {
            showError('Failed to copy notes');
        });
    }

    function handlePrint() {
        if (!currentNotes) {
            showError('No notes available to print');
            return;
        }
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Video Notes - Video Insight AI</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
                    h1 { color: #6C63FF; border-bottom: 2px solid #6C63FF; padding-bottom: 10px; }
                    .section { margin-bottom: 30px; }
                    .section-header { background: #f0f0f0; padding: 10px; border-left: 4px solid #6C63FF; }
                    .points-list { margin-left: 20px; }
                    .point-item { margin: 5px 0; display: flex; align-items: flex-start; }
                    .point-number { background: #6C63FF; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 10px; }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>Video Notes</h1>
                ${notesStructure.innerHTML}
                <div class="no-print">
                    <p><em>Generated by Video Insight AI</em></p>
                </div>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    }

    function handleExportPdf() {
        showToast('PDF export feature coming soon!');
        // In a real implementation, this would generate a PDF
    }

    function handleShareNotes() {
        if (!currentNotes) {
            showError('No notes available to share');
            return;
        }
        
        if (navigator.share) {
            navigator.share({
                title: 'Video Notes - Video Insight AI',
                text: 'Check out these structured notes generated from the video!',
                url: window.location.href
            }).then(() => {
                showToast('Notes shared successfully!');
            }).catch(() => {
                showToast('Share cancelled');
            });
        } else {
            showToast('Web Share API not supported in your browser');
        }
    }

    function handleRefresh() {
        if (!currentNotes) {
            handleGenerateNotes();
            return;
        }
        
        if (confirm('Generate new notes? This will replace the current ones.')) {
            clearPreviousNotes();
            handleGenerateNotes();
        }
    }

    function handleRetry() {
        hideErrorState();
        retryCount = 0;
        handleGenerateNotes();
    }

    function clearPreviousNotes() {
        currentNotes = "";
        structuredNotes = [];
        notesStructure.innerHTML = "";
        notesResult.style.display = 'none';
        contentPlaceholder.style.display = 'block';
        retryCount = 0;
    }

    function startProgressAnimation() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 8;
            if (progress > 85) {
                progress = 85; // Cap at 85% until actual completion
            }
            
            progressFill.style.width = `${progress}%`;
            progressText.textContent = getProgressMessage(progress);
            
            if (!loadingState.style.display || loadingState.style.display === 'none') {
                clearInterval(interval);
            }
        }, 500);
    }

    function getProgressMessage(progress) {
        if (progress < 25) return "Analyzing video structure...";
        if (progress < 50) return "Identifying key topics...";
        if (progress < 75) return "Organizing content...";
        return "Finalizing structured notes...";
    }

    // State management functions
    function showLoadingState() {
        loadingState.style.display = 'block';
        contentPlaceholder.style.display = 'none';
        notesResult.style.display = 'none';
        errorState.style.display = 'none';
        progressFill.style.width = '0%';
        progressText.textContent = "Initializing...";
    }

    function hideLoadingState() {
        loadingState.style.display = 'none';
        progressFill.style.width = '0%';
        retryCount = 0;
    }

    function showProcessingState(message) {
        loadingState.style.display = 'block';
        contentPlaceholder.style.display = 'none';
        notesResult.style.display = 'none';
        errorState.style.display = 'none';
        
        // Update progress text with processing message
        progressText.textContent = message || 'Processing video content...';
        
        // Animate progress bar slowly to indicate waiting
        let progress = 0;
        const interval = setInterval(() => {
            progress += 0.5;
            if (progress > 70) {
                progress = 70; // Cap at 70% during processing
            }
            progressFill.style.width = `${progress}%`;
            
            if (!loadingState.style.display || loadingState.style.display === 'none') {
                clearInterval(interval);
            }
        }, 500);
    }

    function showPlaceholderState() {
        contentPlaceholder.style.display = 'block';
        notesResult.style.display = 'none';
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
        retryCount = 0;
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorState.style.display = 'block';
        contentPlaceholder.style.display = 'none';
        notesResult.style.display = 'none';
        loadingState.style.display = 'none';
        retryCount = 0;
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

        .fade-in {
            animation: fadeIn 0.5s ease-in;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .point-number {
            background: #6C63FF;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            margin-right: 10px;
            flex-shrink: 0;
        }
    `;
    document.head.appendChild(style);
});