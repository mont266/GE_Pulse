
import { GoogleUserProfile, GoogleDriveServiceConfig } from '../src/types';
import { GDRIVE_SCOPES, GDRIVE_DISCOVERY_DOCS, GDRIVE_ACCESS_TOKEN_KEY } from '../constants';

// The global Window interface augmentation with gapi, google, tokenClient, etc.
// is now expected to be in a central types file (e.g., src/types.ts) to avoid conflicts.

class GoogleDriveService {
  private apiKey: string | undefined;
  private clientId: string | undefined;
  private onAuthStatusChangedCallback: (isSignedIn: boolean, user: GoogleUserProfile | null, error: string | null) => void = () => {};
  private onGisLoadedCallback: () => void = () => {};
  
  private gapiLoaded: boolean = false;
  private gisLoaded: boolean = false;
  private pickerApiLoaded: boolean = false;
  private tokenClient: any = null;

  constructor() {
    this.loadGisClient = this.loadGisClient.bind(this);
    this.loadGapiClient = this.loadGapiClient.bind(this);
  }

  init(config: GoogleDriveServiceConfig): void {
    this.onGisLoadedCallback = config.onGisLoaded;
    this.onAuthStatusChangedCallback = config.onAuthStatusChanged;

    this.apiKey = window.GOOGLE_API_KEY;
    this.clientId = window.GOOGLE_CLIENT_ID;

    if (!this.apiKey || !this.clientId) {
      console.error("GoogleDriveService: API Key or Client ID is missing from window object.");
      this.onAuthStatusChangedCallback(false, null, "API Key or Client ID missing.");
      return;
    }
    
    this.loadGisClient();
  }

  private loadGapiClient(): void {
    if (window.gapi) {
      window.gapi.load('client:picker', () => {
        console.log('GAPI client and picker loaded.');
        this.gapiLoaded = true;
        this.initializeGapiClient();
      });
    } else {
        // This case should ideally not be hit if index.html script loads correctly
        console.error('GAPI script not loaded yet.');
         setTimeout(this.loadGapiClient, 100); 
    }
  }

  private initializeGapiClient(): void {
    if (!this.apiKey) {
      this.onAuthStatusChangedCallback(false, null, 'API Key is missing for GAPI init.');
      return;
    }
    window.gapi.client.init({
      apiKey: this.apiKey,
      discoveryDocs: GDRIVE_DISCOVERY_DOCS,
    })
    .then(() => {
      console.log('GAPI client initialized for Drive API.');
      this.pickerApiLoaded = true;
      // Check if already signed in via GIS token
      const token = sessionStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);
      if (token) {
        window.gapi.client.setToken({ access_token: token });
        this.onAuthStatusChangedCallback(true, this.getSignedInUserProfile(), null);
      }
    })
    .catch((error: any) => {
      console.error('Error initializing GAPI client:', error);
      this.onAuthStatusChangedCallback(false, null, `GAPI init error: ${error.message || 'Unknown error'}`);
    });
  }
  
  private loadGisClient(): void {
    if (window.google && window.google.accounts) {
      console.log('GIS script loaded.');
      this.gisLoaded = true;
      this.onGisLoadedCallback(); // Notify App.tsx GIS is ready
      // GAPI client init will be triggered by App.tsx after GIS is loaded and keys checked
    } else {
      // This case should ideally not be hit if index.html script loads correctly
      console.error('GIS script not loaded yet.');
      setTimeout(this.loadGisClient, 100); 
    }
  }

  // This method is called by App.tsx *after* GIS is loaded and API keys are confirmed.
  public initGapiClient(gapiInitSuccess: () => void, gapiInitError: (error: any) => void): void {
    if (!this.apiKey) {
        gapiInitError(new Error("API Key is missing for GAPI initialization"));
        return;
    }
    if (window.gapi) {
        window.gapi.load('client:picker', () => {
            window.gapi.client.init({
                apiKey: this.apiKey,
                discoveryDocs: GDRIVE_DISCOVERY_DOCS,
            })
            .then(() => {
                this.gapiLoaded = true;
                this.pickerApiLoaded = true;
                gapiInitSuccess();
            })
            .catch((error: any) => {
                gapiInitError(error);
            });
        });
    } else {
        // This case implies gapi script in index.html hasn't loaded yet, which is an issue.
        gapiInitError(new Error("GAPI script not available on window."));
    }
  }


  private initializeTokenClient(): void {
    if (!this.clientId) {
        this.onAuthStatusChangedCallback(false, null, 'Client ID is missing for Token Client init.');
        return;
    }
    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: GDRIVE_SCOPES.join(' '),
      callback: (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          sessionStorage.setItem(GDRIVE_ACCESS_TOKEN_KEY, tokenResponse.access_token);
          window.gapi.client.setToken(tokenResponse);
          this.onAuthStatusChangedCallback(true, this.getSignedInUserProfile(), null);
        } else {
          const errorMsg = tokenResponse?.error || 'Token response missing access_token.';
          console.error('Token response error:', tokenResponse);
          this.onAuthStatusChangedCallback(false, null, `Auth error: ${errorMsg}`);
        }
      },
      error_callback: (error: any) => {
        console.error('Token client error_callback:', error);
        this.onAuthStatusChangedCallback(false, null, `Auth error: ${error.message || 'Token client error'}`);
      }
    });
  }

  public getToken(): string | null {
    return sessionStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);
  }

  public signIn(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!this.gisLoaded || !this.gapiLoaded) {
            reject(new Error('Google APIs not fully loaded.'));
            return;
        }
        if (!this.tokenClient) {
            this.initializeTokenClient();
        }

        const currentToken = this.getToken();
        if (currentToken && window.gapi?.client?.getToken()?.access_token === currentToken) {
             // If GAPI already has a valid token (potentially from a previous session that GIS restored)
            this.onAuthStatusChangedCallback(true, this.getSignedInUserProfile(), null);
            resolve();
            return;
        }

        this.tokenClient.requestAccessToken({ prompt: 'consent' });
        // The callback in initTokenClient will handle success/failure.
        // For simplicity, this promise resolves once the request is made.
        // Actual sign-in state is managed via onAuthStatusChangedCallback.
        resolve(); 
    });
  }

  public signOut(): Promise<void> {
    return new Promise((resolve) => {
      const token = sessionStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);
      if (token) {
        window.google.accounts.oauth2.revoke(token, () => {
          sessionStorage.removeItem(GDRIVE_ACCESS_TOKEN_KEY);
          window.gapi.client.setToken(null);
          this.onAuthStatusChangedCallback(false, null, null);
          resolve();
        });
      } else {
        this.onAuthStatusChangedCallback(false, null, null);
        resolve();
      }
    });
  }

  public getSignedInUserProfile(): GoogleUserProfile | null {
    const token = this.getToken(); 
    if (token && window.gapi?.client?.getToken()?.access_token === token) {
      const idToken = window.gapi.client.getToken().id_token;
      if (idToken) {
          try {
            const payload = JSON.parse(atob(idToken.split('.')[1]));
            return { email: payload.email || "User (Email not in token)", name: payload.name, picture: payload.picture };
          } catch (e) {
            console.error("Error decoding ID token:", e);
            return { email: "User (Email parsing error)" };
          }
      }
      return { email: "User (Email not fetched)" }; 
    }
    return null;
  }

  public showSavePicker(fileContent: string, defaultFileName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.pickerApiLoaded || !this.gapiLoaded || !this.getToken()) {
        reject(new Error('Google Picker or Auth not ready.'));
        return;
      }

      const docsView = new window.google.picker.View(window.google.picker.ViewId.DOCS);
      docsView.setIncludeFolders(true); // Display folders
      docsView.setSelectFolderEnabled(true); // Allow selecting a folder
      docsView.setParent('root'); // Start at root

      const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .setOAuthToken(this.getToken()!)
        .addView(docsView)
        .setTitle('Select Folder to Save Portfolio')
        .setCallback((data: any) => {
          if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
            const selectedItem = data[window.google.picker.Response.DOCUMENTS][0];
            
            // Ensure a folder was selected
            if (selectedItem.mimeType !== "application/vnd.google-apps.folder") {
                console.error('Google Picker: Selected item is not a folder.', selectedItem);
                reject(new Error('Please select a folder as the destination.'));
                return;
            }
            const folderId = selectedItem.id;
            
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

            const metadata = {
              name: defaultFileName,
              mimeType: 'application/json',
              parents: [folderId] 
            };

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                fileContent +
                close_delim;
            
            window.gapi.client.request({
                path: '/upload/drive/v3/files',
                method: 'POST',
                params: {uploadType: 'multipart'},
                headers: {'Content-Type': 'multipart/related; boundary="' + boundary + '"'},
                body: multipartRequestBody
            }).then((response: any) => {
                console.log('File saved to Drive:', response.result);
                resolve();
            }).catch((error: any) => {
                console.error('Error saving file to Drive:', error);
                reject(new Error(error.result?.error?.message || 'Failed to save file.'));
            });

          } else if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.CANCEL) {
            console.log('Google Picker: Save cancelled by user.');
            reject(new Error('picker_closed:Save cancelled by user.'));
          }
        })
        .build();
      picker.setVisible(true);
    });
  }

  public showOpenPicker(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!this.pickerApiLoaded || !this.gapiLoaded || !this.getToken()) {
        reject(new Error('Google Picker or Auth not ready.'));
        return;
      }
      const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
      view.setMimeTypes('application/json'); 
      view.setParent('root'); 
      
      const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .setOAuthToken(this.getToken()!)
        .addView(view)
        .setTitle('Load Portfolio from Google Drive')
        .setCallback((data: any) => {
          if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
            const doc = data[window.google.picker.Response.DOCUMENTS][0];
            const fileId = doc.id;
            window.gapi.client.drive.files.get({
              fileId: fileId,
              alt: 'media'
            }).then((response: any) => {
              resolve(response.body); 
            }).catch((error: any) => {
              console.error('Error fetching file content from Drive:', error);
              reject(new Error(error.result?.error?.message || 'Failed to load file content.'));
            });
          } else if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.CANCEL) {
            console.log('Google Picker: Open cancelled by user.');
            reject(new Error('picker_closed:Open cancelled by user.'));
          }
        })
        .build();
      picker.setVisible(true);
    });
  }
}

export const googleDriveService = new GoogleDriveService();
