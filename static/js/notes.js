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
                hideLoadingState();
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
                updateProcessingTime();
                hideLoadingState();
                
                showToast('Structured notes generated successfully!');
            } else {
                throw new Error(data.error || 'Notes generation failed');
            }
            
        } catch (error) {
            console.error('Notes generation error:', error);
            showError('Failed to generate notes. Please try again.');
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
        // This is a simplified parser - in real app, this would parse AI-structured output
        const sections = [];
        const lines = notes.split('\n').filter(line => line.trim());
        
        let currentSection = null;
        let currentSubsection = null;
        
        lines.forEach(line => {
            line = line.trim();
            
            if (line.match(/^#\s+.+/) || line.match(/^[A-Z][^.]{10,}:$/)) {
                // Main section
                if (currentSection) {
                    sections.push(currentSection);
                }
                currentSection = {
                    title: line.replace(/^#\s+/, ''),
                    subsections: []
                };
                currentSubsection = null;
            } else if (line.match(/^##\s+.+/) || line.match(/^-\s+[A-Z]/)) {
                // Subsection
                if (currentSection) {
                    currentSubsection = {
                        title: line.replace(/^##\s+/, '').replace(/^-\s+/, ''),
                        points: []
                    };
                    currentSection.subsections.push(currentSubsection);
                }
            } else if (line.match(/^[•\-]\s+.+/) && currentSubsection) {
                // Point item
                currentSubsection.points.push(line.replace(/^[•\-]\s+/, ''));
            } else if (line.length > 20 && currentSection && !currentSubsection) {
                // Paragraph in main section
                if (!currentSection.paragraphs) {
                    currentSection.paragraphs = [];
                }
                currentSection.paragraphs.push(line);
            }
        });
        
        if (currentSection) {
            sections.push(currentSection);
        }
        
        return sections.length > 0 ? sections : createFallbackStructure(notes);
    }

    function createFallbackStructure(notes) {
        // Fallback structure if parsing fails
        return [{
            title: "Main Points",
            paragraphs: [notes],
            subsections: []
        }];
    }

    function displayStructuredNotes(sections) {
        notesStructure.innerHTML = sections.map((section, sectionIndex) => `
            <div class="section">
                <div class="section-header">
                    <div class="section-icon">
                        <i class="fas fa-folder${sectionIndex % 2 === 0 ? '-open' : ''}"></i>
                    </div>
                    <h4 class="section-title">${section.title}</h4>
                </div>
                <div class="section-content">
                    ${section.paragraphs ? section.paragraphs.map(paragraph => `
                        <div class="paragraph">${paragraph}</div>
                    `).join('') : ''}
                    ${section.subsections.map((subsection, subIndex) => `
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
                    `).join('')}
                </div>
            </div>
        `).join('');
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
        const sectionCount = sections.length;
        const totalPoints = sections.reduce((acc, section) => 
            acc + section.subsections.reduce((subAcc, subsection) => 
                subAcc + (subsection.points ? subsection.points.length : 0), 0), 0
        );
        
        totalKeyPoints = totalPoints;
        sectionsCountEl.textContent = sectionCount;
        totalSectionsEl.textContent = sectionCount;
        totalPointsEl.textContent = totalPoints.toLocaleString();
    }

    function updateProcessingTime() {
        const time = (Math.random() * 4 + 2).toFixed(1); // Random time between 2-6 seconds
        processingTimeEl.textContent = `${time}s`;
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
            
            if (section.paragraphs) {
                section.paragraphs.forEach(paragraph => {
                    content += `${paragraph}\n\n`;
                });
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
                    .point-item { margin: 5px 0; }
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
            handleGenerateNotes();
        }
    }

    function handleRetry() {
        hideErrorState();
        handleGenerateNotes();
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
    }

    function hideLoadingState() {
        loadingState.style.display = 'none';
        progressFill.style.width = '0%';
    }

    function showPlaceholderState() {
        contentPlaceholder.style.display = 'block';
        notesResult.style.display = 'none';
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorState.style.display = 'block';
        contentPlaceholder.style.display = 'none';
        notesResult.style.display = 'none';
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