

import { GoogleUserProfile, GoogleDriveServiceConfig } from '../src/types';
import { GDRIVE_SCOPES, GDRIVE_DISCOVERY_DOCS, GDRIVE_ACCESS_TOKEN_KEY } from '../constants';

class GoogleDriveService {
  private apiKey: string | undefined;
  private clientId: string | undefined;
  private onAuthStatusChangedCallback: (isSignedIn: boolean, user: GoogleUserProfile | null, error: string | null) => void = () => {};
  private onGisLoadedCallback: () => void = () => {};
  
  private gapiLoaded: boolean = false;
  private gisLoaded: boolean = false;
  private pickerApiLoaded: boolean = false; 
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private signedInUser: GoogleUserProfile | null = null;


  constructor() {
    this.loadGisClient = this.loadGisClient.bind(this);
    this.loadGapiClient = this.loadGapiClient.bind(this);
    this.initializeGapiClient = this.initializeGapiClient.bind(this);
    this.gisTokenClientInit = this.gisTokenClientInit.bind(this);
  }

  init(config: GoogleDriveServiceConfig): void {
    console.log('[GDS] init called');
    this.onGisLoadedCallback = config.onGisLoaded;
    this.onAuthStatusChangedCallback = config.onAuthStatusChanged;
    
    this.apiKey = window.GOOGLE_API_KEY;
    this.clientId = window.GOOGLE_CLIENT_ID;

    if (!this.apiKey || !this.clientId) {
      const errorMsg = "[GDS] API Key or Client ID is missing from window object.";
      console.error(errorMsg);
      this.onAuthStatusChangedCallback(false, null, "API Key or Client ID missing.");
      return;
    }
    console.log('[GDS] API Key and Client ID found.');
    
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = this.loadGisClient;
    document.body.appendChild(script);
    console.log('[GDS] GIS script appended to body.');
  }

  private loadGisClient(): void {
    console.log('[GDS] GIS script loaded (onload event).');
    this.gisLoaded = true;
    if (this.onGisLoadedCallback) {
      console.log('[GDS] Calling onGisLoadedCallback.');
      this.onGisLoadedCallback(); 
    }
  }

  public initGapiClient(gapiInitSuccess: () => void, gapiInitError: (error: any) => void): void {
    console.log('[GDS] initGapiClient called.');
    if (!this.apiKey || !this.clientId) {
        const errMsg = "[GDS] Cannot initialize GAPI client without API Key or Client ID.";
        console.error(errMsg);
        gapiInitError(new Error(errMsg));
        return;
    }
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('[GDS] GAPI script loaded (api.js). Proceeding to load client:picker.');
      this.loadGapiClient(gapiInitSuccess, gapiInitError);
    };
    script.onerror = (err) => {
      console.error("[GDS] Failed to load GAPI script (api.js):", err);
      gapiInitError(new Error("Failed to load GAPI script (api.js)."));
    };
    document.body.appendChild(script);
    console.log('[GDS] GAPI script (api.js) appended to body.');
  }


  private loadGapiClient(gapiInitSuccess: () => void, gapiInitError: (error: any) => void): void {
    console.log('[GDS] loadGapiClient (for client:picker) called.');
    if (window.gapi) {
      window.gapi.load('client:picker', {
        callback: () => {
          console.log('[GDS] GAPI client:picker API loaded.');
          this.gapiLoaded = true;
          this.initializeGapiClient(gapiInitSuccess, gapiInitError); 
        },
        onerror: (err: any) => {
            console.error('[GDS] Error loading GAPI client:picker:', err);
            gapiInitError(new Error('Error loading GAPI client:picker.'));
        },
        timeout: 5000, 
        ontimeout: () => {
            console.error('[GDS] Timeout loading GAPI client:picker.');
            gapiInitError(new Error('Timeout loading GAPI client:picker.'));
        }
      });
    } else {
      const errMsg = '[GDS] GAPI script (api.js) not available on window when trying to load client:picker.';
      console.error(errMsg);
      gapiInitError(new Error(errMsg));
    }
  }
  
  private initializeGapiClient(gapiInitSuccess: () => void, gapiInitError: (error: any) => void): void {
    console.log('[GDS] initializeGapiClient (for Drive API) called.');
    if (!this.apiKey) {
      const errMsg = '[GDS] API Key is missing for GAPI client (Drive API) init.';
      console.error(errMsg);
      this.onAuthStatusChangedCallback(false, null, 'API Key is missing for GAPI init.');
      gapiInitError(new Error(errMsg));
      return;
    }
    window.gapi.client.init({
      apiKey: this.apiKey,
      discoveryDocs: GDRIVE_DISCOVERY_DOCS,
    }).then(async () => { // Made async
      console.log('[GDS] GAPI client initialized for Drive API.');
      this.pickerApiLoaded = true;
      this.gisTokenClientInit(); // Initializes this.tokenClient

      // Notify App.tsx that GAPI part is ready (for API calls)
      // App.tsx might optimistically set isGoogleUserSignedIn if localStorage token exists
      gapiInitSuccess();

      // After tokenClient is initialized, check for stored token and try silent re-auth
      const storedToken = localStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);
      if (storedToken && this.tokenClient) {
        console.log('[GDS] Found stored token. Attempting silent token request to restore session.');
        // This should trigger the tokenClient's callback (success or error)
        // which will then call onAuthStatusChanged with profile or error.
        this.tokenClient.requestAccessToken({ prompt: 'none' });
      } else if (this.tokenClient && !storedToken) {
        // No stored token, ensure user is marked as signed out if they were previously.
        // This path is important if localStorage was cleared but the service instance still exists.
        // However, on page refresh, if no token, they are effectively signed out anyway.
        // The onAuthStatusChanged should reflect this.
        console.log('[GDS] No stored token found. Ensuring signed-out state if not already handled.');
        if(this.signedInUser) { // If service instance thought user was signed in but token is gone
             this.accessToken = null;
             this.signedInUser = null;
            // onAuthStatusChanged will be called by error_callback of requestAccessToken if it fails,
            // or if no token -> no request -> onAuthStatusChanged might not fire to confirm signed-out.
            // This is complex, rely on requestAccessToken({prompt:'none'}) error path or explicit sign out.
            // For now, if no stored token, the user is effectively signed out until they sign in.
        }
      }

    }).catch((error: any) => {
      console.error('[GDS] Error initializing GAPI client for Drive API:', error);
      this.onAuthStatusChangedCallback(false, null, `GAPI client init error: ${error.message || 'Unknown error'}`);
      gapiInitError(error);
    });
  }

  private gisTokenClientInit() {
    console.log('[GDS] gisTokenClientInit called.');
    if (!this.clientId) {
        const errMsg = "[GDS] Cannot initialize GIS Token Client without Client ID.";
        console.error(errMsg);
        this.onAuthStatusChangedCallback(false, null, "Client ID missing for GIS Token Client.");
        return;
    }
    try {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: GDRIVE_SCOPES.join(' '),
        callback: async (tokenResponse: any) => {
          console.log('[GDS] GIS Token Client callback invoked. TokenResponse:', tokenResponse);
          if (tokenResponse && tokenResponse.access_token) {
            this.accessToken = tokenResponse.access_token;
            localStorage.setItem(GDRIVE_ACCESS_TOKEN_KEY, this.accessToken!);
            console.log('[GDS] Access token acquired and stored.');
            try {
              console.log('[GDS] Fetching user profile...');
              window.gapi.client.setToken({ access_token: this.accessToken });
              const profileResponse = await window.gapi.client.drive.about.get({ fields: "user" });
              this.signedInUser = {
                  email: profileResponse.result.user.emailAddress,
                  name: profileResponse.result.user.displayName,
                  picture: profileResponse.result.user.photoLink,
              };
              console.log('[GDS] User profile fetched:', this.signedInUser);
              this.onAuthStatusChangedCallback(true, this.signedInUser, null);
            } catch (error: any) {
              console.error('[GDS] Error fetching user profile:', error);
              // Still signed in with token, but profile fetch failed.
              this.onAuthStatusChangedCallback(true, { email: 'Error fetching email' }, 'Failed to fetch user profile.');
            }
          } else {
            console.error('[GDS] Token response error or access token missing:', tokenResponse);
            this.accessToken = null;
            this.signedInUser = null;
            localStorage.removeItem(GDRIVE_ACCESS_TOKEN_KEY);
            const errorReason = tokenResponse?.error_description || tokenResponse?.error || 'Token acquisition failed.';
            this.onAuthStatusChangedCallback(false, null, errorReason);
          }
        },
        error_callback: (error: any) => {
          console.error('[GDS] GIS Token Client error_callback:', error);
          this.accessToken = null;
          this.signedInUser = null;
          localStorage.removeItem(GDRIVE_ACCESS_TOKEN_KEY);
          const errorReason = error?.message || error?.type || 'GIS token client error.';
          this.onAuthStatusChangedCallback(false, null, errorReason);
        }
      });
      console.log('[GDS] GIS Token Client initialized successfully.');
    } catch (e: any) {
       console.error('[GDS] Exception during GIS Token Client initialization:', e);
       this.onAuthStatusChangedCallback(false, null, `GIS Token Client init exception: ${e.message}`);
    }
  }

  public async signIn(): Promise<void> {
    console.log('[GDS] signIn called.');
    if (!this.tokenClient) {
      const errMsg = '[GDS] GIS Token Client not initialized during signIn.';
      console.error(errMsg);
      this.onAuthStatusChangedCallback(false, null, 'GIS Token Client not initialized.');
      throw new Error(errMsg);
    }
    console.log('[GDS] Requesting access token (interactive prompt may appear)...');
    // For explicit sign-in, use prompt: '' or 'consent' if re-prompting for scopes is needed
    this.tokenClient.requestAccessToken({ prompt: '' }); 
  }

  public async signOut(): Promise<void> {
    console.log('[GDS] signOut called.');
    const tokenToRevoke = this.accessToken || localStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);
    if (tokenToRevoke) {
      console.log('[GDS] Revoking access token:', tokenToRevoke.substring(0, 10) + "...");
      window.google.accounts.oauth2.revoke(tokenToRevoke, () => {
        console.log('[GDS] Access token revoked successfully callback.');
        this.accessToken = null;
        this.signedInUser = null;
        localStorage.removeItem(GDRIVE_ACCESS_TOKEN_KEY);
        this.onAuthStatusChangedCallback(false, null, null);
      });
    } else {
        console.log('[GDS] No access token to revoke, just updating state.');
        this.signedInUser = null; 
        this.onAuthStatusChangedCallback(false, null, null);
    }
  }
  
  public getToken(): string | null {
    // Ensure this.accessToken is loaded from localStorage if not already in memory.
    if (!this.accessToken) {
        this.accessToken = localStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);
    }
    return this.accessToken;
  }

  public getSignedInUserProfile(): GoogleUserProfile | null {
    // This method directly returns the current state of signedInUser.
    // App.tsx should rely on onAuthStatusChanged for updates.
    return this.signedInUser; 
  }

  private createPickerCallback(
    fileContent: string,
    fileName: string,
    resolve: () => void,
    reject: (reason?: any) => void
  ) {
    return (data: any) => {
      console.log('[GDS] Picker Callback Data:', JSON.stringify(data, null, 2));
      if (data.action === window.google.picker.Action.PICKED) {
        if (!data.docs || data.docs.length === 0) {
            console.error('[GDS] Picker returned no documents.');
            reject(new Error('No folder selected from picker.'));
            return;
        }
        const folderId = data.docs[0].id;
        const folderName = data.docs[0].name;
        console.log(`[GDS] Selected folder: ${folderName} (ID: ${folderId})`);
        
        if (!folderId) {
            console.error('[GDS] Selected item (folder) has no ID.');
            reject(new Error('Selected folder has no ID.'));
            return;
        }

        this.uploadFile(fileContent, fileName, folderId)
          .then(() => {
            console.log('[GDS] File upload process completed successfully.');
            resolve();
          })
          .catch((error: any) => {
            console.error('[GDS] Error during uploadFile call:', error);
            reject(new Error(`Failed to upload to folder: ${error.message || 'Unknown error'}`));
          });
      } else if (data.action === window.google.picker.Action.CANCEL) {
        console.log('[GDS] Picker cancelled by user.');
        reject(new Error('picker_closed'));
      } else {
        console.warn('[GDS] Picker returned unhandled action:', data.action);
      }
    };
  }

  public showSavePicker(fileContent: string, fileName: string): Promise<void> {
    console.log('[GDS] showSavePicker called for:', fileName);
    return new Promise((resolve, reject) => {
      if (!this.gapiLoaded || !this.gisLoaded || !this.pickerApiLoaded || !this.tokenClient || !this.accessToken) {
        const message = '[GDS] Google API components or Picker not ready for saving.';
        console.error(message, { 
            gapiLoaded: this.gapiLoaded, 
            gisLoaded: this.gisLoaded, 
            pickerApiLoaded: this.pickerApiLoaded, 
            tokenClientReady: !!this.tokenClient, 
            accessTokenPresent: !!this.accessToken 
        });
        reject(new Error(message));
        return;
      }
      console.log('[GDS] All components ready for save picker.');

      const view = new window.google.picker.DocsView();
      view.setParent('root'); 
      console.log('[GDS] Save Picker view.setParent("root") called.');
      view.setIncludeFolders(true);
      console.log('[GDS] Save Picker view.setIncludeFolders(true) called.');
      view.setSelectFolderEnabled(true);
      console.log('[GDS] Save Picker view.setSelectFolderEnabled(true) called.');
      view.setMode(window.google.picker.DocsViewMode.LIST);
      console.log('[GDS] Save Picker view.setMode(LIST) called.');
      console.log('[GDS] Save Picker DocsView configured:', view);


      const pickerBuilder = new window.google.picker.PickerBuilder()
        .setOAuthToken(this.accessToken)
        .addView(view)
        .setTitle(`Select a folder to save "${fileName}"`)
        .setCallback(this.createPickerCallback(fileContent, fileName, resolve, reject));
      
      console.log('[GDS] PickerBuilder configured:', pickerBuilder);
      const picker = pickerBuilder.build();
      console.log('[GDS] Picker built. Setting visible.');
      picker.setVisible(true);
    });
  }

  private async uploadFile(fileContent: string, fileName: string, folderId: string): Promise<void> {
    console.log(`[GDS] uploadFile called. fileName: ${fileName}, folderId: ${folderId}`);
    if (!this.pickerApiLoaded || !this.accessToken) { 
      const errMsg = '[GDS] Drive API client not loaded or access token missing for uploadFile.';
      console.error(errMsg);
      throw new Error(errMsg);
    }
    window.gapi.client.setToken({ access_token: this.accessToken });
    console.log('[GDS] UploadFile: gapi.client token explicitly set.');


    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: [folderId],
    };
    console.log('[GDS] Upload file metadata:', metadata);

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' + 
      fileContent +
      close_delim;
    
    console.log('[GDS] Multipart request body constructed (content omitted for brevity).');

    try {
      console.log('[GDS] Attempting gapi.client.request for upload...');
      const request = window.gapi.client.request({
        path: '/upload/drive/v3/files',
        method: 'POST',
        params: { uploadType: 'multipart' },
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      const response = await request;
      console.log('[GDS] Upload successful:', response.result);
    } catch (error: any) {
      console.error('[GDS] Error uploading file:', error);
      const errorMessage = error.result?.error?.message || error.message || 'Unknown Drive API error during upload.';
      throw new Error(`Drive API upload error: ${errorMessage}`);
    }
  }
  
  public showOpenPicker(): Promise<string | null> {
    console.log('[GDS] showOpenPicker called.');
    return new Promise((resolve, reject) => {
      if (!this.gapiLoaded || !this.gisLoaded || !this.pickerApiLoaded || !this.tokenClient || !this.accessToken) {
        const message = '[GDS] Google API or Picker not ready for opening.';
        console.error(message, {
             gapiLoaded: this.gapiLoaded, 
            gisLoaded: this.gisLoaded, 
            pickerApiLoaded: this.pickerApiLoaded, 
            tokenClientReady: !!this.tokenClient, 
            accessTokenPresent: !!this.accessToken 
        });
        reject(new Error(message));
        return;
      }
      console.log('[GDS] All components ready for open picker.');

      const view = new window.google.picker.DocsView()
        .setParent('root') 
        .setMimeTypes('application/json') 
        .setIncludeFolders(true) 
        .setSelectFolderEnabled(false); 
      console.log('[GDS] Open Picker DocsView configured (parent=root, mimeTypes=json, includeFolders=true, selectFolderEnabled=false):', view);


      const pickerBuilder = new window.google.picker.PickerBuilder()
        .setOAuthToken(this.accessToken)
        .addView(view)
        .setTitle('Select a portfolio JSON file')
        .setCallback(async (data: any) => {
          console.log('[GDS] Open Picker Callback Data:', JSON.stringify(data, null, 2));
          if (data.action === window.google.picker.Action.PICKED) {
            if (!data.docs || data.docs.length === 0) {
              console.warn('[GDS] OpenPicker: No document selected.');
              resolve(null); 
              return;
            }
            const fileId = data.docs[0].id;
            console.log(`[GDS] File picked. ID: ${fileId}. Name: ${data.docs[0].name}`);
            
            if (!this.accessToken) {
              console.error('[GDS] Open Picker: Access token is null before fetching file content. This should not happen.');
              reject(new Error('Authentication error: Access token missing for file fetch.'));
              return;
            }
            window.gapi.client.setToken({ access_token: this.accessToken });
            console.log('[GDS] Open Picker: gapi.client token explicitly set before fetching file content.');

            try {
              console.log(`[GDS] Fetching content for file ID: ${fileId}`);
              const response = await window.gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media',
              });
              console.log('[GDS] File content fetched successfully.');
              resolve(response.body); 
            } catch (error: any) {
              console.error('[GDS] Error fetching file content:', error);
              const errorMessage = error.result?.error?.message || error.message || 'Unknown error';
              reject(new Error(`Failed to open file: ${errorMessage}`));
            }
          } else if (data.action === window.google.picker.Action.CANCEL) {
            console.log('[GDS] OpenPicker cancelled by user.');
            reject(new Error('picker_closed'));
          } else {
             console.warn('[GDS] Open Picker returned unhandled action:', data.action);
          }
        });
      
      console.log('[GDS] Open PickerBuilder configured:', pickerBuilder);
      const picker = pickerBuilder.build();
      console.log('[GDS] Open Picker built. Setting visible.');
      picker.setVisible(true);
    });
  }
}

export const googleDriveService = new GoogleDriveService();
