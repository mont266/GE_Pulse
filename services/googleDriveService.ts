import { GoogleUserProfile, TokenClient, TokenResponse, TokenClientConfig, GoogleDriveServiceConfig } from '../src/types';
import { GDRIVE_ACCESS_TOKEN_KEY } from '../constants';

// Ensure these types are available globally for gapi and google.accounts
declare const gapi: any;
declare const google: any;

let tokenClient: TokenClient | null = null;
let gapiInited = false;
let gisInited = false;
let pickerApiLoaded = false;

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
let API_KEY_INTERNAL = '';
let CLIENT_ID_INTERNAL = '';

let onAuthChangeCallbackGlobal: (isSignedIn: boolean, userProfile: GoogleUserProfile | null) => void = () => {};
let onApiReadyCallbackGlobal: () => void = () => {};
let onApiErrorCallbackGlobal: (errorMsg: string) => void = () => {};


const loadScript = (src: string, id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.id = id;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
};

const loadGisScript = () => loadScript('https://accounts.google.com/gsi/client', 'google-identity-services-script');
const loadGapiScript = () => loadScript('https://apis.google.com/js/api.js', 'google-api-client-script');


export async function init(config: GoogleDriveServiceConfig): Promise<void> {
  API_KEY_INTERNAL = config.apiKey;
  CLIENT_ID_INTERNAL = config.clientId;
  onAuthChangeCallbackGlobal = config.onAuthChange;
  onApiReadyCallbackGlobal = config.onApiReady;
  onApiErrorCallbackGlobal = config.onApiError;

  try {
    await loadGisScript();
    gisInited = true;

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID_INTERNAL,
      scope: SCOPES,
      prompt: '', // No immediate prompt, wait for signIn()
      callback: async (tokenResponse: TokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          sessionStorage.setItem(GDRIVE_ACCESS_TOKEN_KEY, tokenResponse.access_token);
          const userProfile = await fetchUserProfile(tokenResponse.access_token);
          onAuthChangeCallbackGlobal(true, userProfile);
        } else if (tokenResponse && tokenResponse.error) {
          console.error('Google Token Error:', tokenResponse.error, tokenResponse.error_description);
          onAuthChangeCallbackGlobal(false, null);
          onApiErrorCallbackGlobal(`Google Auth: ${tokenResponse.error_description || tokenResponse.error}`);
        } else {
          // This case might occur if the popup is closed before selection.
          onAuthChangeCallbackGlobal(false, null);
        }
      },
    } as TokenClientConfig); // Cast to bypass potential minor type mismatches if library is slightly different

    await loadGapiScript();
    gapiInited = true;
    
    await new Promise<void>((resolve, reject) => {
      gapi.load('client:picker', {
        callback: resolve,
        onerror: () => reject(new Error("Failed to load GAPI client or picker.")),
        timeout: 5000, // 5 seconds
        ontimeout: () => reject(new Error("Timeout loading GAPI client or picker."))
      });
    });
    pickerApiLoaded = true;

    onApiReadyCallbackGlobal();

  } catch (error: any) {
    console.error('Error initializing Google Drive Service:', error);
    onApiErrorCallbackGlobal(error.message || 'Failed to initialize Google Drive Service.');
  }
}

async function fetchUserProfile(accessToken: string): Promise<GoogleUserProfile | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`Failed to fetch user profile: ${response.statusText}`);
    const data = await response.json();
    return {
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}


export function signIn(): void {
  if (!tokenClient) {
    onApiErrorCallbackGlobal("Google Identity Service not initialized for sign-in.");
    return;
  }
  // Requesting new token. If user is already signed in and token is valid, GIS might return it without prompt.
  // 'consent' ensures they see the scopes if it's the first time or re-auth.
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

export function signOut(): void {
  const token = sessionStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);
  if (token && google && google.accounts && google.accounts.oauth2) {
    google.accounts.oauth2.revoke(token, () => {
      sessionStorage.removeItem(GDRIVE_ACCESS_TOKEN_KEY);
      onAuthChangeCallbackGlobal(false, null);
    });
  } else {
    sessionStorage.removeItem(GDRIVE_ACCESS_TOKEN_KEY); // Ensure token is cleared
    onAuthChangeCallbackGlobal(false, null);
  }
}

export function getSignedInUserProfile(): GoogleUserProfile | null {
    // This function might need to re-fetch or use a stored profile
    // For now, it's mainly to demonstrate the callback in init sets it up
    // A more robust solution would store the profile in App.tsx state
    return null; // App.tsx will manage this via onAuthChange callback
}


function getAccessToken(): string | null {
  return sessionStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);
}

export async function showSavePicker(fileContent: string, defaultFileName: string): Promise<void> {
  const accessToken = getAccessToken();
  if (!accessToken || !pickerApiLoaded) {
    throw new Error("Google API not ready or user not signed in for save.");
  }

  return new Promise((resolve, reject) => {
    const docsView = new google.picker.DocsUploadView(); // Allows specifying folder and filename
    docsView.setIncludeFolders(true); // User can select a folder
    docsView.setParent('root'); // Start in root, user can navigate

    const picker = new google.picker.PickerBuilder()
      .addView(docsView)
      .setOAuthToken(accessToken)
      .setDeveloperKey(API_KEY_INTERNAL)
      .setAppId(CLIENT_ID_INTERNAL.split('-')[0]) 
      .setCallback(async (data: any) => {
        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs[0];
          let folderId = 'root'; // Default to root if no folder picked (should not happen with DocsUploadView like this)
          if (doc.parentId) { // If a folder was selected
             folderId = doc.parentId;
          } else if (doc.id && doc.type === 'folder') { // If the picked item itself is a folder
             folderId = doc.id;
          }
          
          // If user selects existing file to overwrite, picker data might contain its ID
          const fileIdToUpdate = (data.docs && data.docs[0] && !data.docs[0].isNew) ? data.docs[0].id : null;

          const metadata = {
            name: defaultFileName, // Picker name field will override this if user types
            mimeType: 'application/json',
            parents: fileIdToUpdate ? undefined : [folderId], // Don't specify parent if updating existing
          };

          const form = new FormData();
          form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          form.append('file', new Blob([fileContent], { type: 'application/json' }));
          
          const uploadUrl = fileIdToUpdate 
            ? `https://www.googleapis.com/upload/drive/v3/files/${fileIdToUpdate}?uploadType=multipart`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
          
          const method = fileIdToUpdate ? 'PATCH' : 'POST';

          try {
            const res = await fetch(uploadUrl, {
              method: method,
              headers: new Headers({ Authorization: `Bearer ${accessToken}` }),
              body: form,
            });
            if (!res.ok) {
              const errorData = await res.json();
              console.error("Drive API Error Response:", errorData);
              throw new Error(`Failed to upload file: ${errorData.error.message}`);
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        } else if (data.action === google.picker.Action.CANCEL) {
          reject(new Error("Save cancelled by user."));
        }
      })
      .build();
    picker.setVisible(true);
  });
}


export async function showOpenPicker(): Promise<{ name: string, id: string, content: string }> {
  const accessToken = getAccessToken();
  if (!accessToken || !pickerApiLoaded) {
    throw new Error("Google API not ready or user not signed in for open.");
  }

  return new Promise((resolve, reject) => {
    const view = new google.picker.View(google.picker.ViewId.DOCS);
    view.setMimeTypes("application/json");

    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(API_KEY_INTERNAL)
      .setAppId(CLIENT_ID_INTERNAL.split('-')[0])
      .setCallback(async (data: any) => {
        if (data.action === google.picker.Action.PICKED) {
          const file = data.docs[0];
          const fileId = file.id;
          const fileName = file.name;

          try {
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
              method: 'GET',
              headers: new Headers({ Authorization: `Bearer ${accessToken}` }),
            });
            if (!res.ok) {
              const errorData = await res.json();
               console.error("Drive API Error Response:", errorData);
              throw new Error(`Failed to download file: ${errorData.error.message}`);
            }
            const content = await res.text();
            resolve({ name: fileName, id: fileId, content });
          } catch (error) {
            reject(error);
          }
        } else if (data.action === google.picker.Action.CANCEL) {
          reject(new Error("Open cancelled by user."));
        }
      })
      .build();
    picker.setVisible(true);
  });
}