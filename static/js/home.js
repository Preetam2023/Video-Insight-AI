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
  uploadArea.addEventListener("click", () => {
    fileInput.click();
  });

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
      } else {
        uploadStatus.innerHTML = `<p style="color: var(--secondary); text-align: center; margin-top: 10px;"> !${data.message}</p>`;
        optionsSection.style.display = "none";
      }
    } catch (err) {
      uploadStatus.innerHTML = `<p style="color: var(--secondary); text-align: center; margin-top: 10px;">Error: ${err.message}</p>`;
      optionsSection.style.display = "none";
    }
  });

  // ---------------- OPTION CARDS INTERACTION ----------------
  const optionCards = document.querySelectorAll(".option-card");

  optionCards.forEach((card) => {
    card.addEventListener("click", async (e) => {
      // If the card is already a link, let it navigate naturally
      if (card.getAttribute("href")) {
        return;
      }
      
      optionCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");

      const option = card.getAttribute("data-option");
      uploadStatus.innerHTML = `
        <p style="color: var(--primary); text-align: center; margin-top: 10px;">
          <i class="fas fa-sync fa-spin"></i> Generating ${getOptionName(option)}... Please wait.
        </p>`;

      try {
        let endpoint = "";
        if (option === "transcript") endpoint = "/transcript";
        else if (option === "summary") endpoint = "/summarize";
        else if (option === "notes") endpoint = "/generate_notes";
        else if (option === "qna") endpoint = "/generate_qna";
        else return;

        const res = await fetch(endpoint, { method: "POST" });
        const data = await res.json();

        let outputContent = "";
        if (data.transcript) outputContent = data.transcript;
        else if (data.summary) outputContent = data.summary;
        else if (data.notes) outputContent = data.notes;
        else if (data.answer) outputContent = data.answer;
        else outputContent = "No content returned.";

        uploadStatus.innerHTML = `
          <div style="margin-top: 15px; padding: 15px; background: #f8f8ff; border-radius: 10px;">
            <h3 style="color: var(--primary); text-align:center;">${getOptionName(option)}</h3>
            <pre style="white-space: pre-wrap; text-align: left; line-height: 1.5;">${outputContent}</pre>
          </div>`;
      } catch (err) {
        uploadStatus.innerHTML = `
          <p style="color: var(--secondary); text-align: center; margin-top: 10px;">
            <i class="fas fa-exclamation-triangle"></i> Error: ${err.message}
          </p>`;
      }
    });
  });

  function getOptionName(option) {
    switch (option) {
      case "transcript":
        return "Video Transcript";
      case "summary":
        return "Video Summary";
      case "notes":
        return "Notes";
      case "qna":
        return "Q&A Session";
      default:
        return "Content";
    }
  }

  function isValidYouTubeUrl(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return pattern.test(url);
  }
});