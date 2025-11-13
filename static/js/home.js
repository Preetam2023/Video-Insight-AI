document.addEventListener("DOMContentLoaded", () => {
  const uploadArea = document.getElementById("upload-area");
  const fileInput = document.getElementById("file-input");
  const uploadStatus = document.getElementById("upload-status");
  const urlInput = document.getElementById("video-url");
  const processButton = document.querySelector(".url-input .cta-button");
  const optionsSection = document.querySelector(".options-section");

  // Hide the 4 functional cards initially
  optionsSection.style.display = "none";

// ---------------- FILE UPLOAD HANDLER ----------------
fileInput.addEventListener("change", async (e) => {
  if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const fileName = file.name;
      uploadStatus.innerHTML = `<p style="color: var(--primary); text-align: center; margin-top: 10px;"><i class="fas fa-sync fa-spin"></i> Uploading & processing ${fileName}...</p>`;

      const formData = new FormData();
      formData.append("video_file", file);

      try {
          const res = await fetch("/process", { method: "POST", body: formData });
          const data = await res.json();

          if (data.status === "success") {
            uploadStatus.innerHTML = `<p style="color: var(--accent); text-align: center; margin-top: 10px;"><i class="fas fa-check-circle"></i> Video processed successfully! Select an analysis option below.</p>`;
              optionsSection.style.display = "block";
              optionsSection.classList.add("visible");
              
              // Start checking background processing status
              startBackgroundStatusCheck();
          } else {
              uploadStatus.innerHTML = `<p style="color: var(--secondary); text-align: center; margin-top: 10px;"> ! ${data.message}</p>`;
              optionsSection.style.display = "none";
          }
      } catch (err) {
          uploadStatus.innerHTML = `<p style="color: var(--secondary); text-align: center; margin-top: 10px;"> Error: ${err.message}</p>`;
          optionsSection.style.display = "none";
      }
  }
});

// ---------------- YOUTUBE LINK HANDLER ----------------
processButton.addEventListener("click", async () => {
  const url = urlInput.value.trim();

  if (!url) {
      uploadStatus.innerHTML = `<p style="color: var(--secondary); text-align: center; margin-top: 10px;"><i class="fas fa-exclamation-circle"></i> Please enter a valid YouTube URL.</p>`;
      optionsSection.style.display = "none";
      return;
  }

  if (!isValidYouTubeUrl(url)) {
      uploadStatus.innerHTML = `<p style="color: var(--secondary); text-align: center; margin-top: 10px;"><i class="fas fa-exclamation-circle"></i> Invalid YouTube URL format.</p>`;
      optionsSection.style.display = "none";
      return;
  }

  uploadStatus.innerHTML = `<p style="color: var(--primary); text-align: center; margin-top: 10px;"><i class="fas fa-sync fa-spin"></i> Processing YouTube video...</p>`;

  const formData = new FormData();
  formData.append("video_url", url);

  try {
      const res = await fetch("/process", { method: "POST", body: formData });
      const data = await res.json();

      if (data.status === "success") {
        uploadStatus.innerHTML = `<p style="color: var(--accent); text-align: center; margin-top: 10px;"><i class="fas fa-check-circle"></i> YouTube video processed successfully! Select an analysis option below.</p>`;
          optionsSection.style.display = "block";
          optionsSection.classList.add("visible");
          
          // Start checking background processing status
          startBackgroundStatusCheck();
      } else {
          uploadStatus.innerHTML = `<p style="color: var(--secondary); text-align: center; margin-top: 10px;"> !${data.message}</p>`;
          optionsSection.style.display = "none";
      }
  } catch (err) {
      uploadStatus.innerHTML = `<p style="color: var(--secondary); text-align: center; margin-top: 10px;">Error: ${err.message}</p>`;
      optionsSection.style.display = "none";
  }
});

  // ---------------- BACKGROUND PROCESSING STATUS CHECK ----------------
  function startBackgroundStatusCheck() {
    let checkCount = 0;
    const maxChecks = 60; // Check for up to 5 minutes (5 seconds interval)
    
    const checkInterval = setInterval(async () => {
      checkCount++;
      
      try {
        const response = await fetch('/check_processing_status');
        const data = await response.json();
        
        if (data.status === 'completed') {
          clearInterval(checkInterval);
          console.log("Background processing completed successfully");
        }
        
        // Stop checking after max attempts
        if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
          console.log("Background processing check timeout");
        }
      } catch (error) {
        console.error('Error checking processing status:', error);
      }
    }, 5000); // Check every 5 seconds
  }


// ---------------- OPTION CARDS INTERACTION ----------------
const optionCards = document.querySelectorAll(".option-card");

optionCards.forEach((card) => {
    card.addEventListener("click", async (e) => {
        const option = card.getAttribute("data-option");
        
        // For transcript, always allow access immediately
        if (option === "transcript") {
            window.location.href = "/transcript";
            return;
        }
        
        // For other features, check if background processing is complete
        try {
            const response = await fetch('/check_processing_status');
            const data = await response.json();
            
            if (data.status === 'completed') {
                // Processing complete, navigate to feature page
                if (option === "summary") {
                    window.location.href = "/summarize_page";
                } else if (option === "notes") {
                    window.location.href = "/notes";
                } else if (option === "qna") {
                    window.location.href = "/qna";
                }
            } else {
                // Processing not complete, show message
                uploadStatus.innerHTML = `
                    <p style="color: var(--warning); text-align: center; margin-top: 10px;">
                        <i class="fas fa-clock"></i> This feature is still being processed. Please wait a moment...
                    </p>
                    <p style="color: var(--primary); font-size: 0.9rem; text-align: center;">
                        Completed: ${data.completed_files.length}/${data.total_files} steps
                    </p>`;
            }
        } catch (error) {
            uploadStatus.innerHTML = `
                <p style="color: var(--secondary); text-align: center; margin-top: 10px;">
                    <i class="fas fa-exclamation-triangle"></i> Error checking status. Please try again.
                </p>`;
        }
    });
});


  function isValidYouTubeUrl(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return pattern.test(url);
  }
});