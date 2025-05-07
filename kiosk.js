// DOM elements
const kioskForm = document.getElementById('kioskForm');
const kioskFormUrlInput = document.getElementById('kioskFormUrl');
const kioskTitleInput = document.getElementById('kioskTitle');
const generateQrBtn = document.getElementById('generateQrBtn');
const qrSpinner = document.getElementById('qrSpinner');
const qrResult = document.getElementById('qrResult');
const qrTitle = document.getElementById('qrTitle');
const qrCanvas = document.getElementById('qrCanvas');
const printQrBtn = document.getElementById('printQrBtn');
const newQrBtn = document.getElementById('newQrBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const qrFullscreenBtn = document.getElementById('qrFullscreenBtn');
const darkModeToggle = document.getElementById('darkModeToggle');

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', initApp);

// Listen for fullscreen change events
document.addEventListener('fullscreenchange', updateFullscreenButtons);
document.addEventListener('webkitfullscreenchange', updateFullscreenButtons);
document.addEventListener('mozfullscreenchange', updateFullscreenButtons);
document.addEventListener('MSFullscreenChange', updateFullscreenButtons);

function initApp() {
    // Set up event listeners
    kioskForm.addEventListener('submit', handleKioskFormSubmit);
    printQrBtn.addEventListener('click', printQrCode);
    newQrBtn.addEventListener('click', resetKioskForm);
    
    // Set up fullscreen buttons
    fullscreenBtn.addEventListener('click', () => toggleFullscreen(document.getElementById('kioskModeCard')));
    qrFullscreenBtn.addEventListener('click', () => toggleFullscreen(document.getElementById('kioskModeCard')));
    
    // Set up dark mode toggle
    darkModeToggle.addEventListener('click', toggleDarkMode);
    
    // Check for saved dark mode preference
    if (localStorage.getItem('darkMode') !== 'disabled') {
        enableDarkMode();
    } else {
        disableDarkMode();
    }
    
    // Check URL parameters for prefilled form URL
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get('formId');
    
    if (formId) {
        const formUrl = `https://docs.google.com/forms/d/${formId}`;
        kioskFormUrlInput.value = formUrl;
    }
}

// Function to toggle dark mode
function toggleDarkMode(e) {
    if (e) e.preventDefault();
    if (document.body.classList.contains('dark-mode')) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
}

// Function to enable dark mode
function enableDarkMode() {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
    darkModeToggle.innerHTML = '<i class="bi bi-sun"></i> Light Mode';
    localStorage.setItem('darkMode', 'enabled');
}

// Function to disable dark mode
function disableDarkMode() {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
    darkModeToggle.innerHTML = '<i class="bi bi-moon-stars"></i> Dark Mode';
    localStorage.setItem('darkMode', 'disabled');
}

// Function to handle kiosk form submission
function handleKioskFormSubmit(event) {
    event.preventDefault();

    // Validate form
    if (!kioskFormUrlInput.value.trim()) {
        kioskFormUrlInput.classList.add('is-invalid');
        showError('Please enter a Google Form URL.');
        return;
    }

    // Get form values
    const formUrl = kioskFormUrlInput.value;
    const title = kioskTitleInput.value || 'Join Our Team Map!';

    // Show loading indicator
    qrSpinner.classList.remove('d-none');
    generateQrBtn.disabled = true;

    // Generate QR code
    generateQrCode(formUrl, title);
}

// Function to generate QR code
function generateQrCode(url, title) {
    // Set the title
    qrTitle.textContent = title;
    
    // Generate QR code
    QRCode.toCanvas(qrCanvas, url, {
        width: 300,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    }, function(error) {
        if (error) {
            console.error('Error generating QR code:', error);
            showError('Failed to generate QR code: ' + error);
        } else {
            // Show the QR code result and hide the info alert
            kioskForm.style.display = 'none';
            qrResult.style.display = 'block';
            document.querySelector('#kioskModeCard .alert-info').style.display = 'none';
        }
        
        // Hide loading indicator
        qrSpinner.classList.add('d-none');
        generateQrBtn.disabled = false;
    });
}

// Function to print QR code
function printQrCode() {
    const printWindow = window.open('', '_blank');
    
    // Create print content
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${qrTitle.textContent} - QR Code</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 20px;
                }
                .qr-container {
                    margin: 30px auto;
                    max-width: 400px;
                }
                h1 {
                    margin-bottom: 20px;
                }
                .description {
                    margin-bottom: 20px;
                    font-size: 16px;
                    color: #555;
                }
                .instructions {
                    margin-top: 20px;
                    font-size: 16px;
                }
                @media print {
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="qr-container">
                <h1>${qrTitle.textContent}</h1>
                <p class="description">Be part of our team map! Tell us where you're from.</p>
                <img src="${qrCanvas.toDataURL('image/png')}" alt="QR Code" style="max-width: 100%;">
                <p class="instructions">Just point your phone camera at this QR code</p>
                <button class="no-print" onclick="window.print();return false;">Print</button>
            </div>
        </body>
        </html>
    `;
    
    // Write to the new window and trigger print
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load before printing
    printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
    };
}

// Function to reset kiosk form
function resetKioskForm() {
    kioskForm.reset();
    kioskForm.style.display = 'block';
    qrResult.style.display = 'none';
    document.querySelector('#kioskModeCard .alert-info').style.display = 'block';
}

// Function to update fullscreen button icons
function updateFullscreenButtons() {
    const isFullscreen = document.fullscreenElement || 
                        document.mozFullScreenElement || 
                        document.webkitFullscreenElement || 
                        document.msFullscreenElement;
    
    if (isFullscreen) {
        fullscreenBtn.innerHTML = '<i class="bi bi-fullscreen-exit"></i>';
        if (qrFullscreenBtn) {
            qrFullscreenBtn.innerHTML = '<i class="bi bi-fullscreen-exit"></i> Exit Fullscreen';
        }
    } else {
        fullscreenBtn.innerHTML = '<i class="bi bi-fullscreen"></i>';
        if (qrFullscreenBtn) {
            qrFullscreenBtn.innerHTML = '<i class="bi bi-fullscreen"></i> Fullscreen';
        }
    }
}

// Function to toggle fullscreen mode
function toggleFullscreen(element) {
    // Check if fullscreen is currently active
    if (!document.fullscreenElement && 
        !document.mozFullScreenElement && 
        !document.webkitFullscreenElement && 
        !document.msFullscreenElement) {
        
        // Request fullscreen on different browsers
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    } else {
        // Exit fullscreen on different browsers
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

// Function to show error messages
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
    errorDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.querySelector('.card-body').prepend(errorDiv);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(errorDiv);
        bsAlert.close();
    }, 5000);
}
