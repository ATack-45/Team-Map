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

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    let gapiLoaded = setInterval(() => {
        if (typeof gapi !== 'undefined') {
            clearInterval(gapiLoaded);
            loadGoogleApiClient();
        }
    }, 100);

    // Check if there's an access token in localStorage

   
    // Add event listeners
    mapForm.addEventListener('submit', handleFormSubmit);
    copyLinkBtn.addEventListener('click', copyShareLink);
    downloadBtn.addEventListener('click', downloadMapImage);
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
    const refreshToken = localStorage.getItem('refreshToken'); // Make sure to store the refresh token during login
    if (refreshToken) {
        // Call Google's token refresh endpoint to get a new access token
        fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: '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', // You should have this stored securely
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        })
        .then(response => response.json())
        .then(data => {
            accessToken = data.access_token;
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('accessTokenExpiry', Date.now() + data.expires_in * 1000); // Set new expiry time
            gapi.client.setToken({ access_token: accessToken });
        })
        .catch(error => console.error('Error refreshing token:', error));
    } else {
        console.error('No refresh token found');
    }
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
}

// Function to get the stored token
function getStoredToken() {
    const accessToken = localStorage.getItem('access_token');
    const tokenExpiry = localStorage.getItem('token_expiry');
    const now = new Date().getTime();

    // If token exists and hasn't expired, return it
    if (accessToken && tokenExpiry && now < tokenExpiry) {
        return accessToken;
    } else {
        // Token is either missing or expired
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
    
    // Get form values
    const formUrl = formUrlInput.value;
    const mapTitle = mapTitleInput.value || 'Team Locations';
    
    // Show loading indicator and hide result container
    loadingDiv.style.display = 'block';
    resultContainer.style.display = 'none';
    
    // Extract form ID from URL
    const formId = extractFormId(formUrl);
    if (!formId) {
        showError('Invalid Google Form URL. Please check and try again.');
        loadingDiv.style.display = 'none';
        return;
    }
    
    processForm(formId, mapTitle);
}

function extractFormId(url) {
    // Extract the form ID from a Google Form URL
    const regex = /\/forms\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function processForm(formId, mapTitle) {
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
            teamData = data;
            // Geocode the locations
            return geocodeLocations(data);
        })
        .then(geocodedData => {
            // Update team data with geocoded information
            teamData = geocodedData;
            // Display the map
            displayMap(geocodedData, mapTitle);
            // Update results UI
            updateResultsUI(geocodedData, mapTitle);
            // Generate share URL
            generateShareUrl(formId, mapTitle);
            // Hide loading indicator and show results
            loadingDiv.style.display = 'none';
            resultContainer.style.display = 'block';
        })
        .catch(error => {
            console.error('Error processing form:', error);
            loadingDiv.style.display = 'none';
            showError('An error occurred while processing your data: ' + error.message);
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
            mapTypeId: 'terrain'
        });
        mapInitialized = true;
    }
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    const bounds = new google.maps.LatLngBounds();
    teams.forEach(team => {
        if (team.lat && team.lng) {
            const marker = new google.maps.Marker({
                map: map,
                position: { lat: team.lat, lng: team.lng },
                title: team.teamName
            });          
            const infoWindow = new google.maps.InfoWindow({
                content: `<div>
                    <h5>${team.teamName}</h5>
                    <p>${team.formattedAddress}</p>
                </div>`
            });
            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });
            markers.push(marker);
            bounds.extend(marker.getPosition());
        }
    });
    if (markers.length > 0) {
        map.fitBounds(bounds);
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
    // Base URL for Google Static Map API
    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap?';

    // API key (replace with your actual key)
    const apiKey = API_KEY;

    // Set the center, zoom, size, and map type
    let url = `${baseUrl}center=20,0&zoom=1&size=500x300&maptype=satellite`;

    // Define your marker icon URL (make sure it's correct and publicly accessible)
    const markerIcon = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';

    // Combine all the markers into a single string
    const markerParams = markers.map(marker =>
        `${marker.position.lat().toFixed(5)},${marker.position.lng().toFixed(5)}`
    ).join('|');

    // Add the markers to the URL, using a single `&markers=` parameter
    url += `&markers=icon:${markerIcon}|size:tiny|${markerParams}`;

    // Add your API key at the end of the URL
    url += `&key=${apiKey}`;

    // Log the URL to check if it's correct
    console.log(url);

    // Create the download link for the static map image
    const link = document.createElement('a');
    link.download = `${resultTitle.textContent.replace(/\s+/g, '-')}.png`;
    link.href = url;
    link.click();
}




function showError(message) {
    alert(message);
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
