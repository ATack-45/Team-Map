// Client ID from Google Developer Console
const CLIENT_ID = '62964583092-bpgbhepra98c5kausth6d13iqub28rlp.apps.googleusercontent.com';
// API key from Google Developer Console
const API_KEY = 'AIzaSyBo-7CIAJFVIsUXbwAkjGD6taSqzCQs6i4';
// Discovery docs for Google Sheets API
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4", "https://forms.googleapis.com/$discovery/rest?version=v1"];
// Scope for reading Google Sheets
const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/forms.readonly";

// Global variables
let map;
let markers = [];
let teamData = [];
let mapInitialized = false;

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
    // Add event listeners
    mapForm.addEventListener('submit', handleFormSubmit);
    copyLinkBtn.addEventListener('click', copyShareLink);
    downloadBtn.addEventListener('click', downloadMapImage);
    
    // Load the Google API client library
    loadGoogleApiClient();
}

function loadGoogleApiClient() {
    // Load the Google API client library
    gapi.load('client:auth2', initClient);
}

function initClient() {
    // Initialize the Google API client library
    gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
    }).then(() => {
        // Listen for sign-in state changes
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSignInStatus);
        
        // Handle the initial sign-in state
        updateSignInStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    }).catch(error => {
        console.error('Error initializing Google API client:', error);
        showError('Failed to initialize Google API client. Please try again later.');
    });
}

function updateSignInStatus(isSignedIn) {
    // Update UI based on sign-in status
    console.log('User signed in:', isSignedIn);
}

function handleFormSubmit(event) {
    event.preventDefault();
    
    // Get form values
    const formUrl = formUrlInput.value;
    const mapTitle = mapTitleInput.value || 'Team Locations';
    
    // Show loading indicator
    loadingDiv.style.display = 'block';
    resultContainer.style.display = 'none';
    
    // Extract form ID from URL
    const formId = extractFormId(formUrl);
    if (!formId) {
        showError('Invalid Google Form URL. Please check and try again.');
        loadingDiv.style.display = 'none';
        return;
    }
    
    // Check if user is signed in to Google
    if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
        // Prompt user to sign in
        gapi.auth2.getAuthInstance().signIn()
            .then(() => {
                // After sign-in, process the form
                processForm(formId, mapTitle);
            })
            .catch(error => {
                console.error('Sign-in error:', error);
                loadingDiv.style.display = 'none';
                showError('Failed to sign in to Google. Please try again.');
            });
    } else {
        // User is already signed in, process the form
        processForm(formId, mapTitle);
    }
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
            
            // Now fetch data from the spreadsheet
            return fetchSheetData(spreadsheetId);
        })
        .then(data => {
            teamData = data;
            
            // Geocode the locations
            return geocodeLocations(data);
        })
        .then(geocodedData => {
            // Update the team data with geocoded information
            teamData = geocodedData;
            
            // Display the map
            displayMap(geocodedData, mapTitle);
            
            // Update the results UI
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
    // Get the form metadata to find the linked response spreadsheet
    return gapi.client.forms.forms.get({
        formId: formId
    }).then(response => {
        const form = response.result;
        // Check if the form has a response destination
        if (form.responseDestination && form.responseDestination.spreadsheet) {
            return form.responseDestination.spreadsheet.spreadsheetId;
        }
        
        // If we can't get the spreadsheet ID from form metadata, try a workaround
        // by checking for any linked sheets
        return fetchLinkedSheets(formId);
    }).catch(error => {
        console.error('Error getting form metadata:', error);
        // Try the alternative method if the form API fails
        return fetchLinkedSheets(formId);
    });
}

function fetchLinkedSheets(formId) {
    // Alternative method to find the response spreadsheet
    // This is a workaround since the Forms API may not be fully accessible
    
    // The URL format for the responses spreadsheet is predictable
    const responseSheetUrl = `https://docs.google.com/spreadsheets/d/e/${formId}/viewanalytics`;
    
    // Make a request to check if this spreadsheet exists
    return fetch(responseSheetUrl, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                // Extract the spreadsheet ID from the URL
                const spreadsheetId = response.url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                return spreadsheetId ? spreadsheetId[1] : null;
            }
            return null;
        })
        .catch(() => {
            // If this fails, we'll need to ask the user for the spreadsheet ID
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
    // Fetch the first sheet in the spreadsheet
    return gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: 'A:C', // Assuming the form responses are in columns A-C
    }).then(response => {
        const values = response.result.values || [];
        
        // Extract team data from sheet values
        // Assuming the first row is headers: Timestamp, Team Name, Location
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
    // Create a geocoder instance
    const geocoder = new google.maps.Geocoder();
    
    // Create an array of promises for geocoding each location
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
    
    // Return a promise that resolves when all geocoding is complete
    return Promise.all(geocodePromises);
}

function displayMap(teams, mapTitle) {
    // Initialize the map if it hasn't been initialized yet
    if (!mapInitialized) {
        map = new google.maps.Map(document.getElementById('map'), {
            zoom: 2,
            center: { lat: 20, lng: 0 },
            mapTypeId: 'terrain'
        });
        mapInitialized = true;
    }
    
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    
    // Create bounds object to auto-zoom the map
    const bounds = new google.maps.LatLngBounds();
    
    // Add markers for each team with valid coordinates
    teams.forEach(team => {
        if (team.lat && team.lng) {
            const marker = new google.maps.Marker({
                position: { lat: team.lat, lng: team.lng },
                map: map,
                title: team.teamName
            });
            
            // Add info window with team information
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
    
    // Fit the map to the markers if there are any
    if (markers.length > 0) {
        map.fitBounds(bounds);
        
        // Don't zoom in too far on small datasets
        const listener = google.maps.event.addListener(map, 'idle', function() {
            if (map.getZoom() > 16) {
                map.setZoom(16);
            }
            google.maps.event.removeListener(listener);
        });
    }
    
    // Set the map title
    resultTitle.textContent = mapTitle;
}

function updateResultsUI(teams, mapTitle) {
    // Update the map title
    resultTitle.textContent = mapTitle;
    
    // Clear the team table
    teamTableBody.innerHTML = '';
    
    // Add rows for each team
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
    // Create a shareable URL with the form ID and map title
    const url = new URL(window.location.href);
    url.searchParams.set('formId', formId);
    url.searchParams.set('title', encodeURIComponent(mapTitle));
    
    // Set the share URL in the input field
    shareUrlInput.value = url.toString();
}

function copyShareLink() {
    // Copy the share URL to the clipboard
    shareUrlInput.select();
    document.execCommand('copy');
    
    // Change button text temporarily to indicate success
    copyLinkBtn.textContent = 'Copied!';
    setTimeout(() => {
        copyLinkBtn.textContent = 'Copy Link';
    }, 2000);
}

function downloadMapImage() {
    // Use html2canvas to capture the map as an image
    html2canvas(document.getElementById('map')).then(canvas => {
        // Create a download link
        const link = document.createElement('a');
        link.download = `${resultTitle.textContent.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

function showError(message) {
    // Display an error message to the user
    alert(message);
}

// Check for URL parameters on page load to handle shared maps
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get('formId');
    const mapTitle = urlParams.get('title') ? decodeURIComponent(urlParams.get('title')) : 'Team Locations';
    
    if (formId) {
        // Populate the form fields
        formUrlInput.value = `https://docs.google.com/forms/d/${formId}`;
        mapTitleInput.value = mapTitle;
        
        // Wait for Google API to initialize
        const waitForGapi = setInterval(() => {
            if (gapi.auth2 && gapi.auth2.getAuthInstance()) {
                clearInterval(waitForGapi);
                
                // Submit the form if the user is already signed in
                if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
                    mapForm.dispatchEvent(new Event('submit'));
                }
            }
        }, 100);
    }
};