// Client ID from Google Developer Console
const CLIENT_ID = '62964583092-bpgbhepra98c5kausth6d13iqub28rlp.apps.googleusercontent.com';
// API key from Google Developer Console
const API_KEY = 'AIzaSyBo-7CIAJFVIsUXbwAkjGD6taSqzCQs6i4';
// Discovery docs for Google Sheets and Forms API
const DISCOVERY_DOCS = [
    "https://sheets.googleapis.com/$discovery/rest?version=v4",
    "https://forms.googleapis.com/$discovery/rest?version=v1"
];
// Scope for reading Google Sheets and Forms
const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/forms.body.readonly";

// Global variables
let map;
let markers = [];
let teamData = [];
let mapInitialized = false;
let tokenClient;
let accessToken = null;

// DOM elements
const mapForm = document.getElementById('mapForm');
const formUrlInput = document.getElementById('formUrl');
const mapTitleInput = document.getElementById('mapTitle');
const loadingDiv = document.querySelector('.loading');
const resultContainer = document.querySelector('.result-container');
const resultTitle = document.getElementById('resultTitle');
const shareUrlInput = document.getElementById('shareUrl');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const downloadBtn = document.getElementById('downloadBtn');
const teamTableBody = document.getElementById('teamTableBody');
const darkModeToggle = document.getElementById('darkModeToggle');
const generateBtn = document.getElementById('generateBtn');
const submitSpinner = document.getElementById('submitSpinner');

// Kiosk mode elements
const kioskModeToggle = document.getElementById('kioskModeToggle');
const normalModeCard = document.getElementById('normalModeCard');
const kioskModeCard = document.getElementById('kioskModeCard');
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

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', initApp);

// Listen for fullscreen change events
document.addEventListener('fullscreenchange', updateFullscreenButtons);
document.addEventListener('webkitfullscreenchange', updateFullscreenButtons);
document.addEventListener('mozfullscreenchange', updateFullscreenButtons);
document.addEventListener('MSFullscreenChange', updateFullscreenButtons);

function initApp() {
    let gapiLoaded = setInterval(() => {
        if (typeof gapi !== 'undefined') {
            clearInterval(gapiLoaded);
            loadGoogleApiClient();
        }
    }, 100);

    // Add event listeners for map generation
    mapForm.addEventListener('submit', handleFormSubmit);
    copyLinkBtn.addEventListener('click', copyShareLink);
    downloadBtn.addEventListener('click', downloadMapImage);

    // Set up template link
    document.getElementById('templateLink').addEventListener('click', openFormTemplate);

    // Set up dark mode toggle
    darkModeToggle.addEventListener('click', toggleDarkMode);

    // Default to dark mode unless explicitly set to light mode
    if (localStorage.getItem('darkMode') !== 'disabled') {
        enableDarkMode();
    } else {
        disableDarkMode();
    }

    // Set up kiosk mode toggle
    kioskModeToggle.addEventListener('change', toggleKioskMode);

    // Set up kiosk form submission
    kioskForm.addEventListener('submit', handleKioskFormSubmit);

    // Set up QR code buttons
    printQrBtn.addEventListener('click', printQrCode);
    newQrBtn.addEventListener('click', resetKioskForm);

    // Set up fullscreen buttons
    fullscreenBtn.addEventListener('click', () => toggleFullscreen(kioskModeCard));
    qrFullscreenBtn.addEventListener('click', () => toggleFullscreen(kioskModeCard));

    // Check for saved kiosk mode preference
    if (localStorage.getItem('kioskMode') === 'enabled') {
        kioskModeToggle.checked = true;
        toggleKioskMode();
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

    // If map is initialized, update map styles for dark mode
    if (mapInitialized && map) {
        map.setOptions({
            styles: [
                { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                {
                    featureType: "administrative.locality",
                    elementType: "labels.text.fill",
                    stylers: [{ color: "#d59563" }],
                },
                {
                    featureType: "poi",
                    elementType: "labels.text.fill",
                    stylers: [{ color: "#d59563" }],
                },
                {
                    featureType: "poi.park",
                    elementType: "geometry",
                    stylers: [{ color: "#263c3f" }],
                },
                {
                    featureType: "poi.park",
                    elementType: "labels.text.fill",
                    stylers: [{ color: "#6b9a76" }],
                },
                {
                    featureType: "road",
                    elementType: "geometry",
                    stylers: [{ color: "#38414e" }],
                },
                {
                    featureType: "road",
                    elementType: "geometry.stroke",
                    stylers: [{ color: "#212a37" }],
                },
                {
                    featureType: "road",
                    elementType: "labels.text.fill",
                    stylers: [{ color: "#9ca5b3" }],
                },
                {
                    featureType: "road.highway",
                    elementType: "geometry",
                    stylers: [{ color: "#746855" }],
                },
                {
                    featureType: "road.highway",
                    elementType: "geometry.stroke",
                    stylers: [{ color: "#1f2835" }],
                },
                {
                    featureType: "road.highway",
                    elementType: "labels.text.fill",
                    stylers: [{ color: "#f3d19c" }],
                },
                {
                    featureType: "transit",
                    elementType: "geometry",
                    stylers: [{ color: "#2f3948" }],
                },
                {
                    featureType: "transit.station",
                    elementType: "labels.text.fill",
                    stylers: [{ color: "#d59563" }],
                },
                {
                    featureType: "water",
                    elementType: "geometry",
                    stylers: [{ color: "#17263c" }],
                },
                {
                    featureType: "water",
                    elementType: "labels.text.fill",
                    stylers: [{ color: "#515c6d" }],
                },
                {
                    featureType: "water",
                    elementType: "labels.text.stroke",
                    stylers: [{ color: "#17263c" }],
                },
            ]
        });
    }
}

// Function to disable dark mode
function disableDarkMode() {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
    darkModeToggle.innerHTML = '<i class="bi bi-moon-stars"></i> Dark Mode';
    localStorage.setItem('darkMode', 'disabled');

    // If map is initialized, update map styles for light mode
    if (mapInitialized && map) {
        map.setOptions({
            styles: [
                {
                    featureType: "administrative.country",
                    elementType: "geometry.stroke",
                    stylers: [{ color: "#4d90fe" }, { weight: 1 }]
                }
            ]
        });
    }
}
function initiateLogin() {
    // You can replace this with a prompt for the user to log in
    google.accounts.id.prompt(); // Prompt user for login if necessary
}
// Function to check if the token is expired
function isAccessTokenExpired() {
    const expiryTime = localStorage.getItem('accessTokenExpiry');
    return expiryTime && Date.now() > expiryTime;
}

// Function to refresh the access token if expired
function refreshAccessToken() {
    // For security reasons, we should not use client_secret in client-side code
    // Instead, we'll prompt the user to re-authenticate
    console.log('Token expired, requesting re-authentication');

    // Clear existing tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_expiry');
    localStorage.removeItem('refresh_token');

    // Show auth message and hide the form
    document.getElementById('auth-status').style.display = 'block';
    document.getElementById('auth-status').textContent = 'Your session has expired. Please sign in again.';
    document.getElementById('auth-status').className = 'alert alert-warning';
    mapForm.style.display = 'none';

    // Prompt for re-authentication
    google.accounts.id.prompt();
}


// Load the Google API client library and initialize it
function loadGoogleApiClient() {
    if (typeof gapi === 'undefined') {
        console.error("gapi is not loaded yet.");
        return;
    }
    gapi.load('client', function() {
        console.log('Google API client loaded');
        gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS
        }).then(() => {
            console.log('Google API client initialized');
            const storedToken = getStoredToken();

            if (storedToken) {
                accessToken = storedToken;
                gapi.client.setToken({ access_token: accessToken });
                // Hide auth message and show the form directly if token is valid
                document.getElementById('auth-status').style.display = 'none';
                mapForm.style.display = 'block';
            }
        }).catch(err => console.error('Error initializing gapi:', err));
    });
}

// Function to store the access token and expiry time
function storeToken(tokenResponse) {
    const now = new Date().getTime();
    const expiryTime = now + tokenResponse.expires_in * 1000; // Convert to ms
    // Save the token and expiry time in localStorage
    localStorage.setItem('access_token', tokenResponse.access_token);
    localStorage.setItem('token_expiry', expiryTime);

    // Store refresh token if available
    if (tokenResponse.refresh_token) {
        localStorage.setItem('refresh_token', tokenResponse.refresh_token);
    }
}

// Function to get the stored token
function getStoredToken() {
    const accessToken = localStorage.getItem('access_token');
    const tokenExpiry = localStorage.getItem('token_expiry');
    const now = new Date().getTime();

    // If token exists and hasn't expired, return it
    if (accessToken && tokenExpiry && now < tokenExpiry) {
        return accessToken;
    } else if (accessToken && tokenExpiry && now >= tokenExpiry) {
        // Token has expired, try to refresh it
        refreshAccessToken();
        return null;
    } else {
        // Token is missing
        return null;
    }
}

// Callback for Google Identity Services sign-in
function handleCredentialResponse(response) {
    console.log("Encoded JWT ID token: " + response.credential);
    // Initialize token client for OAuth access
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse.error) {
                console.error(tokenResponse);
                showError("Failed to get access token");
                return;
            }
            accessToken = tokenResponse.access_token;
            storeToken(tokenResponse); // Store the token and expiry time

            gapi.client.setToken({ access_token: accessToken });
            // Hide auth message and show the form
            document.getElementById('auth-status').style.display = 'none';
            mapForm.style.display = 'block';
        },
    });
    // Request access token
    tokenClient.requestAccessToken();
}


function handleFormSubmit(event) {
    event.preventDefault();

    // Ensure the user is signed in and access token is available
    if (!accessToken) {
        showError('Please sign in with Google first.');
        return;
    }

    // Validate form
    if (!formUrlInput.value.trim()) {
        formUrlInput.classList.add('is-invalid');
        showError('Please enter a Google Form URL.');
        return;
    }

    // Get form values
    const formUrl = formUrlInput.value;
    const mapTitle = mapTitleInput.value || 'Team Locations';

    // Show loading indicators
    submitSpinner.classList.remove('d-none');
    generateBtn.disabled = true;
    loadingDiv.style.display = 'block';
    resultContainer.style.display = 'none';

    // Extract form ID from URL
    const formId = extractFormId(formUrl);
    if (!formId) {
        showError('Invalid Google Form URL. Please check and try again.');
        loadingDiv.style.display = 'none';
        submitSpinner.classList.add('d-none');
        generateBtn.disabled = false;
        return;
    }

    // Process the form
    processForm(formId, mapTitle)
        .catch(error => {
            console.error('Error in form processing:', error);
            showError('An error occurred: ' + error.message);
        })
        .finally(() => {
            // Always re-enable the button when done
            submitSpinner.classList.add('d-none');
            generateBtn.disabled = false;
        });
}

function extractFormId(url) {
    // Extract the form ID from a Google Form URL
    const regex = /\/forms\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function processForm(formId, mapTitle) {
    // Return a promise that resolves when the form processing is complete
    return new Promise((resolve, reject) => {
        // First, get the linked response spreadsheet ID from the form
        getResponseSpreadsheetId(formId)
            .then(spreadsheetId => {
                if (!spreadsheetId) {
                    throw new Error('Could not find a response spreadsheet for this form. Make sure the form has collected responses.');
                }
                // Fetch data from the spreadsheet
                return fetchSheetData(spreadsheetId);
            })
            .then(data => {
                if (!data || data.length === 0) {
                    throw new Error('No team data found in the spreadsheet. Make sure your form has responses.');
                }

                teamData = data;
                // Show progress message
                document.querySelector('.loading p').textContent = `Processing ${data.length} team locations...`;

                // Geocode the locations
                return geocodeLocations(data);
            })
            .then(geocodedData => {
                // Update team data with geocoded information
                teamData = geocodedData;

                // Count valid locations
                const validLocations = geocodedData.filter(team => team.lat && team.lng).length;
                if (validLocations === 0) {
                    throw new Error('None of the locations could be geocoded. Please check the location data in your form responses.');
                }

                // Show progress message
                document.querySelector('.loading p').textContent = 'Creating map...';

                // Display the map
                displayMap(geocodedData, mapTitle);

                // Update results UI
                updateResultsUI(geocodedData, mapTitle);

                // Generate share URL
                generateShareUrl(formId, mapTitle);

                // Hide loading indicator and show results
                loadingDiv.style.display = 'none';
                resultContainer.style.display = 'block';

                // Resolve the promise
                resolve();
            })
            .catch(error => {
                console.error('Error processing form:', error);
                loadingDiv.style.display = 'none';
                showError('An error occurred while processing your data: ' + error.message);
                reject(error);
            });
    });
}

function getResponseSpreadsheetId(formId) {
    return gapi.client.forms.forms.get({
        formId: formId
    }).then(response => {
        const form = response.result;

        // Check if a response destination (Google Sheets) exists
        if (form.linkedSheetId) {
            return form.linkedSheetId;
        } else {
            throw new Error("No linked response spreadsheet found. Please ensure your form collects responses in Google Sheets.");
        }
    }).catch(error => {
        console.error('Error retrieving response spreadsheet:', error);
        showError('Could not retrieve the response spreadsheet. Please ensure your form has responses saved in a Google Sheet.');
        return null;
    });
}



function fetchLinkedSheets(formId) {
    const responseSheetUrl = `https://docs.google.com/spreadsheets/d/e/${formId}/viewanalytics`;
    return fetch(responseSheetUrl, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                const spreadsheetId = response.url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                return spreadsheetId ? spreadsheetId[1] : null;
            }
            return null;
        })
        .catch(() => {
            const spreadsheetId = prompt(
                'Could not automatically find the response spreadsheet. Please open your form, go to "Responses" tab, ' +
                'click the Google Sheets icon, and paste the spreadsheet URL here:'
            );
            if (spreadsheetId) {
                const match = spreadsheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                return match ? match[1] : null;
            }
            return null;
        });
}

function fetchSheetData(spreadsheetId) {
    return gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: 'A:C'
    }).then(response => {
        const values = response.result.values || [];
        const teams = [];
        for (let i = 1; i < values.length; i++) {
            const row = values[i];
            if (row.length >= 3) {
                teams.push({
                    timestamp: row[0],
                    teamName: row[1],
                    location: row[2]
                });
            }
        }
        return teams;
    });
}

function geocodeLocations(teams) {
    const geocoder = new google.maps.Geocoder();
    const geocodePromises = teams.map(team => {
        return new Promise((resolve, reject) => {
            geocoder.geocode({ address: team.location }, (results, status) => {
                if (status === 'OK' && results && results.length > 0) {
                    const location = results[0].geometry.location;
                    resolve({
                        ...team,
                        lat: location.lat(),
                        lng: location.lng(),
                        formattedAddress: results[0].formatted_address
                    });
                } else {
                    console.warn(`Geocoding failed for "${team.location}": ${status}`);
                    resolve({
                        ...team,
                        lat: null,
                        lng: null,
                        formattedAddress: team.location + ' (not found)'
                    });
                }
            });
        });
    });
    return Promise.all(geocodePromises);
}

function displayMap(teams, mapTitle) {
    if (!mapInitialized) {
        map = new google.maps.Map(document.getElementById('map'), {
            zoom: 2,
            center: { lat: 20, lng: 0 },
            mapTypeId: 'terrain',
            styles: [
                {
                    featureType: "administrative.country",
                    elementType: "geometry.stroke",
                    stylers: [{ color: "#4d90fe" }, { weight: 1 }]
                }
            ]
        });
        mapInitialized = true;
    }

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    // Create bounds object to fit all markers
    const bounds = new google.maps.LatLngBounds();

    // Create markers for each team location
    teams.forEach(team => {
        if (team.lat && team.lng) {
            const marker = new google.maps.Marker({
                position: { lat: team.lat, lng: team.lng },
                title: team.teamName,
                animation: google.maps.Animation.DROP,
                icon: {
                    url: 'marker.png',
                    scaledSize: new google.maps.Size(30, 30)
                }
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `<div style="max-width: 200px;">
                    <h5 style="margin-bottom: 5px;">${team.teamName}</h5>
                    <p style="margin-bottom: 0;">${team.formattedAddress}</p>
                </div>`
            });

            marker.addListener('click', () => {
                // Close any open info windows
                markers.forEach(m => {
                    if (m.infoWindow && m.infoWindow.getMap()) {
                        m.infoWindow.close();
                    }
                });

                infoWindow.open(map, marker);
                marker.infoWindow = infoWindow;
            });

            markers.push(marker);
            bounds.extend(marker.getPosition());
        }
    });

    // Add markers to the map using MarkerClusterer
    if (markers.length > 0) {
        // Apply marker clusterer to group nearby markers
        const markerCluster = new markerClusterer.MarkerClusterer({
            map,
            markers,
            algorithm: new markerClusterer.SuperClusterAlgorithm({
                radius: 100,
                maxZoom: 15
            }),
            renderer: {
                render: ({ count, position }) => {
                    return new google.maps.Marker({
                        position,
                        label: { text: String(count), color: "white", fontSize: "12px" },
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: "#4285F4",
                            fillOpacity: 0.8,
                            strokeWeight: 1,
                            strokeColor: "#FFFFFF",
                            scale: Math.max(count * 3, 20)
                        },
                        zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count
                    });
                }
            }
        });

        // Fit map to show all markers
        map.fitBounds(bounds);

        // Prevent excessive zoom when there's only one marker
        const listener = google.maps.event.addListener(map, 'idle', function() {
            if (map.getZoom() > 16) {
                map.setZoom(16);
            }
            google.maps.event.removeListener(listener);
        });
    }

    resultTitle.textContent = mapTitle;
}



function updateResultsUI(teams, mapTitle) {
    resultTitle.textContent = mapTitle;
    teamTableBody.innerHTML = '';
    teams.forEach(team => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${team.teamName}</td>
            <td>${team.formattedAddress || team.location}</td>
        `;
        teamTableBody.appendChild(row);
    });
}

function generateShareUrl(formId, mapTitle) {
    const url = new URL(window.location.href);
    url.searchParams.set('formId', formId);
    url.searchParams.set('title', encodeURIComponent(mapTitle));
    shareUrlInput.value = url.toString();
}

function copyShareLink() {
    shareUrlInput.select();
    document.execCommand('copy');
    copyLinkBtn.textContent = 'Copied!';
    setTimeout(() => {
        copyLinkBtn.textContent = 'Copy Link';
    }, 2000);
}
function downloadMapImage() {
    // Show loading indicator
    downloadBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
    downloadBtn.disabled = true;

    // Use html2canvas to capture the map as an image
    html2canvas(document.getElementById('map'), {
        useCORS: true,
        allowTaint: true,
        scale: 2 // Higher resolution
    }).then(canvas => {
        // Create a table with team information
        const teamTable = document.createElement('table');
        teamTable.style.width = '100%';
        teamTable.style.borderCollapse = 'collapse';
        teamTable.style.marginTop = '20px';
        teamTable.style.fontFamily = 'Arial, sans-serif';

        // Add table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr style="background-color: #f2f2f2;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Team Name</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Location</th>
            </tr>
        `;
        teamTable.appendChild(thead);

        // Add table body with team data
        const tbody = document.createElement('tbody');
        teamData.forEach(team => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 8px; border: 1px solid #ddd;">${team.teamName}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${team.formattedAddress || team.location}</td>
            `;
            tbody.appendChild(row);
        });
        teamTable.appendChild(tbody);

        // Create a container for the complete image
        const container = document.createElement('div');
        container.style.width = canvas.width + 'px';
        container.style.backgroundColor = 'white';
        container.style.padding = '20px';

        // Add title
        const title = document.createElement('h2');
        title.textContent = resultTitle.textContent;
        title.style.textAlign = 'center';
        title.style.fontFamily = 'Arial, sans-serif';
        title.style.marginBottom = '20px';
        container.appendChild(title);

        // Add map canvas
        container.appendChild(canvas);

        // Add team table
        container.appendChild(teamTable);

        // Add timestamp
        const timestamp = document.createElement('p');
        timestamp.textContent = `Generated on ${new Date().toLocaleString()}`;
        timestamp.style.textAlign = 'right';
        timestamp.style.fontSize = '12px';
        timestamp.style.marginTop = '20px';
        timestamp.style.color = '#666';
        container.appendChild(timestamp);

        // Append container to document temporarily (invisible)
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);

        // Use html2canvas again to capture the entire container
        html2canvas(container, {
            useCORS: true,
            allowTaint: true,
            scale: 1.5
        }).then(finalCanvas => {
            // Remove the temporary container
            document.body.removeChild(container);

            // Convert canvas to data URL and trigger download
            const imgData = finalCanvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `${resultTitle.textContent.replace(/\s+/g, '-')}.png`;
            link.href = imgData;
            link.click();

            // Reset button state
            downloadBtn.innerHTML = 'Download Map Image';
            downloadBtn.disabled = false;
        }).catch(err => {
            console.error('Error generating final image:', err);
            showError('Failed to generate the complete map image.');
            downloadBtn.innerHTML = 'Download Map Image';
            downloadBtn.disabled = false;
        });
    }).catch(err => {
        console.error('Error capturing map:', err);
        showError('Failed to capture the map image.');
        downloadBtn.innerHTML = 'Download Map Image';
        downloadBtn.disabled = false;
    });
}




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

// Function to open the form template
function openFormTemplate(e) {
    e.preventDefault();

    // Google Form template URL - this should be a template form you've created
    const templateUrl = "https://docs.google.com/forms/d/1Qs9RrDDa_NyVYRYIwxiG0jgWVt_MRsyeGqnQTjkLdPo/template/preview";

    // Open the template in a new tab
    window.open(templateUrl, '_blank');
}

// Function to toggle kiosk mode
function toggleKioskMode() {
    if (kioskModeToggle.checked) {
        // Enable kiosk mode
        normalModeCard.style.display = 'none';
        kioskModeCard.style.display = 'block';
        resultContainer.style.display = 'none';
        localStorage.setItem('kioskMode', 'enabled');
    } else {
        // Disable kiosk mode
        normalModeCard.style.display = 'block';
        kioskModeCard.style.display = 'none';
        localStorage.setItem('kioskMode', 'disabled');
    }
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
    const title = kioskTitleInput.value || 'Team Registration';

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

// Check for URL parameters on page load to handle shared maps
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get('formId');
    const mapTitle = urlParams.get('title') ? decodeURIComponent(urlParams.get('title')) : 'Team Locations';

    if (formId) {
        formUrlInput.value = `https://docs.google.com/forms/d/${formId}`;
        mapTitleInput.value = mapTitle;

        const waitForToken = setInterval(() => {
            if (accessToken) {
                clearInterval(waitForToken);
                mapForm.dispatchEvent(new Event('submit'));
            }
        }, 100);
    }
};
