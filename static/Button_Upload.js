document.addEventListener('DOMContentLoaded', () => {
    const uploadButton = document.getElementById('uploadButton');
    const fileInput = document.getElementById('fileInput');
    const summaryContentDiv = document.getElementById('summaryContent');
    const extractedImagesOutput = document.querySelector('#extractedImagesOutput .image-content-scrollable');

    const chatHistory = document.getElementById('chatHistory');
    const chatInput = document.getElementById('chatInput');
    const sendChatButton = document.getElementById('sendChatButton');

    // Image Modal Elements
    const imageModal = document.getElementById('imageModal');
    const closeModalButton = document.getElementById('closeModal');
    const modalImage = document.getElementById('modalImage');

    // API Key Modal Elements
    const apiKeyModal = document.getElementById('apiKeyModal');
    const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
    const submitApiKeyButton = document.getElementById('submitApiKeyButton');
    const mainContainer = document.querySelector('.main-container');

    let currentPdfTextContext = []; // Stores extracted text for chat context
    let currentPdfImageContext = []; // Stores extracted images (Base64) for chat context
    let geminiApiKey = ''; // Variable to store the API key

    // Function to initialize the application after API key is set
    function initializeApp() {
        // Try to load API key from localStorage
        const storedApiKey = localStorage.getItem('geminiApiKey');
        if (storedApiKey) {
            geminiApiKey = storedApiKey;
            apiKeyModal.classList.add('hidden'); // Hide modal
            mainContainer.classList.remove('hidden'); // Show main content
        } else {
            // Show API key modal if no key is stored
            apiKeyModal.classList.remove('hidden');
            mainContainer.classList.add('hidden');
        }

        // Add event listener to the upload button
        if (uploadButton) {
            uploadButton.addEventListener('click', uploadFile);
        }

        // Add event listener to the chat send button
        if (sendChatButton) {
            sendChatButton.addEventListener('click', sendMessage);
        }

        // Allow sending message with Enter key
        if (chatInput) {
            chatInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    sendMessage();
                }
            });
        }

        // Add event listeners for the image modal
        if (closeModalButton) {
            closeModalButton.addEventListener('click', closeImageModal);
        }

        if (imageModal) {
            // Close modal if clicking outside the content
            imageModal.addEventListener('click', (event) => {
                if (event.target === imageModal) {
                    closeImageModal();
                }
            });
        }
    }

    // Event listener for API key submission
    if (submitApiKeyButton) {
        submitApiKeyButton.addEventListener('click', () => {
            const key = geminiApiKeyInput.value.trim();
            if (key) {
                geminiApiKey = key;
                localStorage.setItem('geminiApiKey', key); // Store key for future sessions
                apiKeyModal.classList.add('hidden'); // Hide modal
                mainContainer.classList.remove('hidden'); // Show main content
            } else {
                // IMPORTANT: For production, replace alert with a custom modal/message box.
                // Alerts block the UI and are not user-friendly.
                alert('Please enter your Gemini API Key to proceed.');
            }
        });
    }

    /**
     * Converts a simple Markdown string with bullet points and bold text to HTML.
     * Supports `* `, `- `, or `\d+\. ` for list items and `**text**` for bold text.
     * This version is simplified to handle flat lists and bolding more reliably.
     * @param {string} markdownText The markdown string.
     * @returns {string} HTML string.
     */
    function markdownToHtml(markdownText) {
        let html = markdownText;

        // Convert bold text (e.g., **Summary:**) to <strong>Summary:</strong>
        html = html.replace(/\*\*(\s*[^<>\s].*?\s*)\*\*/g, '<strong>$1</strong>');

        // Convert bullet points (*, -, or 1.) to <ul><li>.
        // This regex captures lines that look like list items.
        // It's a simpler approach for non-nested lists.
        const lines = html.split('\n');
        let inList = false;
        let processedLines = [];

        lines.forEach(line => {
            const trimmedLine = line.trim();
            // Check for bullet points or numbered lists
            if (trimmedLine.match(/^(?:[*-]|\d+\.)\s+(.+)$/)) {
                if (!inList) {
                    processedLines.push('<ul>');
                    inList = true;
                }
                // Replace the bullet/number and wrap in <li>
                processedLines.push(`<li>${trimmedLine.replace(/^(?:[*-]|\d+\.)\s+/, '')}</li>`);
            } else {
                if (inList) {
                    processedLines.push('</ul>');
                    inList = false;
                }
                // Add as a paragraph if it's not empty
                if (trimmedLine !== '') {
                    processedLines.push(`<p>${trimmedLine}</p>`);
                }
            }
        });

        // Close any open list at the end
        if (inList) {
            processedLines.push('</ul>');
        }

        return processedLines.join('\n');
    }


    /**
     * Displays a message in the chat history.
     * @param {string} message The message content.
     * @param {string} sender 'user' or 'bot'.
     */
    function displayMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        // Use markdownToHtml for bot messages to render bold/lists
        messageDiv.innerHTML = `<p>${sender === 'bot' ? markdownToHtml(message) : message}</p>`;
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight; // Auto-scroll to bottom
    }

    /**
     * Opens the image modal with the specified image source.
     * @param {string} imageSrc The source URL of the image to display.
     */
    function openImageModal(imageSrc) {
        modalImage.src = imageSrc;
        imageModal.classList.add('show');
    }

    /**
     * Closes the image modal.
     */
    function closeImageModal() {
        imageModal.classList.remove('show');
        modalImage.src = ''; // Clear the image source when closing
    }

    /**
     * Handles the file upload process.
     */
    async function uploadFile() {
        const selectedFile = fileInput.files[0];

        if (!selectedFile) {
            summaryContentDiv.innerHTML = '<p class="text-red-500">Please select a PDF file first.</p>';
            // Update parent's class for error state
            summaryContentDiv.parentElement.className = "mb-4 p-3 bg-red-100 rounded-md text-red-800";
            return;
        }

        if (!geminiApiKey) {
            summaryContentDiv.innerHTML = '<p class="text-red-500">Please provide your Gemini API Key first.</p>';
            summaryContentDiv.parentElement.className = "mb-4 p-3 bg-red-100 rounded-md text-red-800";
            apiKeyModal.classList.remove('hidden'); // Show modal again if key is missing
            mainContainer.classList.add('hidden');
            return;
        }

        console.log("Selected file:", selectedFile);

        const formData = new FormData();
        formData.append("file", selectedFile);
        // Append the API key to the form data
        formData.append("gemini_api_key", geminiApiKey);

        // Clear previous output and show a loading message
        summaryContentDiv.innerHTML = '<p class="text-gray-600">Uploading and processing file...</p>';
        summaryContentDiv.parentElement.className = "mb-4 p-3 bg-blue-50 rounded-md text-blue-800"; // Reset to processing state color
        extractedImagesOutput.innerHTML = '<p class="text-gray-600 italic">Processing images...</p>';
        chatHistory.innerHTML = '<div class="message bot-message"><p>Processing your PDF...</p></div>';


        try {
            // --- CHANGE: Updated API endpoint to a relative path for AWS deployment ---
            // This will make the request relative to the current domain (e.g., your-aws-domain.com/upload)
            const response = await fetch("/upload", { // Removed "http://127.0.0.1:8080"
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Upload success:", data);

            // Store context for chat (text is still needed for chat, even if not displayed)
            currentPdfTextContext = data.pages_lines || [];
            currentPdfImageContext = data.extracted_images || [];

            // Display summary using Markdown conversion
            if (data.pdf_summary) {
                summaryContentDiv.innerHTML = markdownToHtml(data.pdf_summary);
                summaryContentDiv.parentElement.className = "mb-4 p-3 bg-green-50 rounded-md text-green-800"; // Success state color
            } else {
                summaryContentDiv.innerHTML = '<p>No summary generated.</p>';
                summaryContentDiv.parentElement.className = "mb-4 p-3 bg-yellow-100 rounded-md text-yellow-800"; // Warning state color
            }

            // Display extracted images
            extractedImagesOutput.innerHTML = ""; // Clear previous content
            if (data.extracted_images && data.extracted_images.length > 0) {
                data.extracted_images.forEach(imgInfo => {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = "flex flex-col items-center p-2 border border-gray-200 rounded-md bg-white shadow-sm";
                    
                    const imgElement = document.createElement('img');
                    imgElement.src = `data:image/${imgInfo.ext};base64,${imgInfo.data}`;
                    imgElement.alt = `Image from Page ${imgInfo.page_num}, Index ${imgInfo.image_index}`;
                    imgElement.className = "max-w-full h-auto rounded-md mb-2 cursor-pointer"; // Add cursor-pointer
                    imgElement.style.maxWidth = "150px"; // Smaller preview for images

                    // Add click listener to open modal
                    imgElement.addEventListener('click', () => {
                        openImageModal(imgElement.src);
                    });

                    const imgCaption = document.createElement('p');
                    imgCaption.className = "text-xs text-gray-500 text-center"; // Center caption
                    imgCaption.textContent = `Page ${imgInfo.page_num}, Image ${imgInfo.image_index}`;
                    
                    imgContainer.appendChild(imgElement);
                    imgContainer.appendChild(imgCaption);
                    extractedImagesOutput.appendChild(imgContainer);
                });
            } else {
                extractedImagesOutput.innerHTML = '<p class="text-gray-600 italic">No images extracted from the PDF.</p>';
            }

            // Display any warnings from the backend
            if (data.warnings && data.warnings.length > 0) {
                const warningsDiv = document.createElement('div');
                warningsDiv.className = "mt-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md";
                warningsDiv.innerHTML = `<p class="font-bold">Warnings:</p><ul>${data.warnings.map(w => `<li>${w}</li>`).join('')}</ul>`;
                // Append warnings to the main pdfOutput div
                document.getElementById('pdfOutput').appendChild(warningsDiv);
            }

            // After successful upload and summary, prompt user to chat
            displayMessage("PDF processed! You can now ask me questions about its content.", "bot");

        } catch (error) {
            console.error("Upload error:", error);
            summaryContentDiv.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
            summaryContentDiv.parentElement.className = "mb-4 p-3 bg-red-100 rounded-md text-red-800"; // Error state color
            extractedImagesOutput.innerHTML = '<p class="text-red-500">Failed to load images due to an error.</p>';
            displayMessage(`Error processing PDF: ${error.message}`, "bot");
        }
    }

    /**
     * Handles sending a chat message to the backend.
     */
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        if (!geminiApiKey) {
            displayMessage('Please provide your Gemini API Key first.', 'bot');
            apiKeyModal.classList.remove('hidden'); // Show modal again if key is missing
            mainContainer.classList.add('hidden');
            return;
        }

        displayMessage(message, "user");
        chatInput.value = ''; // Clear input

        // Show typing indicator or loading message
        const loadingMessageDiv = document.createElement('div');
        loadingMessageDiv.className = 'message bot-message loading-indicator';
        loadingMessageDiv.innerHTML = '<p>AI is thinking<span class="dot-animation">.</span><span class="dot-animation delay-1">.</span><span class="dot-animation delay-2">.</span></p>';
        chatHistory.appendChild(loadingMessageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        try {
            // --- CHANGE: Updated API endpoint to a relative path for AWS deployment ---
            const response = await fetch("/chat", { // Removed "http://127.0.0.1:8080"
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'X-Gemini-Api-Key': geminiApiKey // Send API key in header
                },
                body: JSON.stringify({
                    message: message,
                    pdf_text_context: currentPdfTextContext, // Send text context
                    pdf_image_context: currentPdfImageContext // Send image context
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Chat response:", data);

            // Remove loading indicator
            if (loadingMessageDiv.parentNode) {
                loadingMessageDiv.parentNode.removeChild(loadingMessageDiv);
            }
            displayMessage(data.response || "No response from AI.", "bot");

        } catch (error) {
            console.error("Chat error:", error);
            // Remove loading indicator
            if (loadingMessageDiv.parentNode) {
                loadingMessageDiv.parentNode.removeChild(loadingMessageDiv);
            }
            displayMessage(`Error communicating with AI: ${error.message}`, "bot");
        }
    }

    // Add CSS for loading animation (dots) - these can be added directly to style.css or here.
    // For simplicity, adding here as it's specific to the JS-driven loading indicator.
    const style = document.createElement('style');
    style.innerHTML = `
        .dot-animation {
            animation: blink 1.4s infinite;
            opacity: 0;
        }
        .dot-animation.delay-1 {
            animation-delay: 0.2s;
        }
        .dot-animation.delay-2 {
            animation-delay: 0.4s;
        }
        @keyframes blink {
            0% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // Initialize the app when DOM is ready
    initializeApp();
});
