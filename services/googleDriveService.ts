
import { GoogleUserProfile, GoogleDriveServiceConfig } from '../src/types';
import { GDRIVE_SCOPES, GDRIVE_DISCOVERY_DOCS, GDRIVE_ACCESS_TOKEN_KEY } from '../constants';

class GoogleDriveService {
  private apiKey: string | undefined;
  private clientId: string | undefined;
  private onAuthStatusChangedCallback: (isSignedIn: boolean, user: GoogleUserProfile | null, error: string | null) => void = () => {};
  private onGisLoadedCallback: () => void = () => {};
  
  private gapiLoaded: boolean = false; // For api.js script
  private gisLoaded: boolean = false;  // For GSI script and its onload
  private pickerApiLoaded: boolean = false; // For gapi.load('client:picker')
  private gapiDriveInitialized: boolean = false; // For gapi.client.init({ discoveryDocs })
  private tokenClientInitialized: boolean = false; // For google.accounts.oauth2.initTokenClient
  
  private gisScriptLoading: boolean = false;
  private gapiClientScriptLoading: boolean = false;
  private gapiPickerLoading: boolean = false;
  private isSilentAuthInProgress: boolean = false;


  private tokenClient: any = null;
  private accessToken: string | null = null;
  private signedInUser: GoogleUserProfile | null = null;


  constructor() {
    // Bind methods that might be used as callbacks directly
    this.handleGisScriptLoad = this.handleGisScriptLoad.bind(this);
    this.handleGapiClientScriptLoad = this.handleGapiClientScriptLoad.bind(this);
  }

  init(config: GoogleDriveServiceConfig): void {
    console.log('[GDS] init called.');
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
    
    if (this.gisLoaded) {
      console.log('[GDS] GIS already fully loaded, directly calling onGisLoadedCallback.');
      if (this.onGisLoadedCallback) this.onGisLoadedCallback();
      return;
    }
    if (this.gisScriptLoading) {
        console.log('[GDS] GIS script is already loading.');
        return;
    }

    this.gisScriptLoading = true;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = this.handleGisScriptLoad;
    script.onerror = () => {
        console.error('[GDS] GIS script failed to load.');
        this.gisScriptLoading = false;
        this.onAuthStatusChangedCallback(false, null, "Failed to load Google Identity Services.");
    };
    document.body.appendChild(script);
    console.log('[GDS] GIS script appended to body.');
  }

  private handleGisScriptLoad(): void {
    console.log('[GDS] GIS script.onload fired.');
    this.gisLoaded = true; 
    this.gisScriptLoading = false;
    if (this.onGisLoadedCallback) {
      console.log('[GDS] Calling onGisLoadedCallback.');
      this.onGisLoadedCallback(); 
    }
  }
  
  // Called by App.tsx after GIS is confirmed loaded
  public initGapiClient(gapiInitSuccess: () => void, gapiInitError: (error: any) => void): void {
    console.log('[GDS] initGapiClient called.');

    if (this.gapiLoaded && this.pickerApiLoaded && this.gapiDriveInitialized && this.tokenClientInitialized) {
        console.log('[GDS] All GAPI components appear to be initialized. Calling gapiInitSuccess.');
        gapiInitSuccess();
        this.checkStoredTokenAndAttemptSilentAuth();
        return;
    }

    if (!this.gapiLoaded) {
        if (this.gapiClientScriptLoading) {
            console.log('[GDS] GAPI client script (api.js) is already loading.');
            return;
        }
        console.log('[GDS] Loading GAPI client script (api.js).');
        this.gapiClientScriptLoading = true;
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => this.handleGapiClientScriptLoad(gapiInitSuccess, gapiInitError);
        script.onerror = (err) => {
            console.error("[GDS] Failed to load GAPI client script (api.js):", err);
            this.gapiClientScriptLoading = false;
            gapiInitError(new Error("Failed to load GAPI client script (api.js)."));
        };
        document.body.appendChild(script);
    } else {
        this.loadPickerApi(gapiInitSuccess, gapiInitError);
    }
  }
  
  private handleGapiClientScriptLoad(gapiInitSuccess: () => void, gapiInitError: (error: any) => void): void {
    console.log('[GDS] GAPI client script (api.js) loaded.');
    this.gapiLoaded = true;
    this.gapiClientScriptLoading = false;
    this.loadPickerApi(gapiInitSuccess, gapiInitError);
  }

  private loadPickerApi(gapiInitSuccess: () => void, gapiInitError: (error: any) => void): void {
    if (this.pickerApiLoaded) {
        this.initializeDriveAndTokenClient(gapiInitSuccess, gapiInitError);
        return;
    }
    if (this.gapiPickerLoading) {
        console.log('[GDS] GAPI Picker API is already loading.');
        return;
    }
    console.log('[GDS] Loading GAPI Picker API.');
    this.gapiPickerLoading = true;
    window.gapi.load('client:picker', {
      callback: () => {
        console.log('[GDS] GAPI Picker API loaded.');
        this.pickerApiLoaded = true;
        this.gapiPickerLoading = false;
        this.initializeDriveAndTokenClient(gapiInitSuccess, gapiInitError);
      },
      onerror: (err: any) => {
        console.error('[GDS] Error loading GAPI Picker API:', err);
        this.gapiPickerLoading = false;
        gapiInitError(err);
      },
      timeout: 5000,
      ontimeout: () => {
        console.error('[GDS] Timeout loading GAPI Picker API.');
        this.gapiPickerLoading = false;
        gapiInitError(new Error('Timeout loading GAPI Picker API.'));
      }
    });
  }
  
  private initializeDriveAndTokenClient(gapiInitSuccess: () => void, gapiInitError: (error: any) => void): void {
    if (this.gapiDriveInitialized && this.tokenClientInitialized) {
        console.log('[GDS] Drive API and Token Client already initialized.');
        gapiInitSuccess();
        this.checkStoredTokenAndAttemptSilentAuth();
        return;
    }

    const initDrive = () => {
        if (this.gapiDriveInitialized) {
            this.ensureTokenClientInitialized(gapiInitSuccess);
            return;
        }
        console.log('[GDS] Initializing GAPI client for Drive API.');
        window.gapi.client.init({
          apiKey: this.apiKey,
          discoveryDocs: GDRIVE_DISCOVERY_DOCS,
        }).then(() => {
          console.log('[GDS] GAPI client for Drive API initialized.');
          this.gapiDriveInitialized = true;
          this.ensureTokenClientInitialized(gapiInitSuccess);
        }).catch((error: any) => {
          console.error('[GDS] Error initializing GAPI client for Drive API:', error);
          gapiInitError(error);
        });
    };
    initDrive();
  }

  private ensureTokenClientInitialized(gapiInitSuccess: () => void): void {
      if (!this.tokenClientInitialized) {
          this.internalGisTokenClientInit(); 
      }
      if (this.tokenClientInitialized) { // Check again in case internalGisTokenClientInit completed synchronously
          gapiInitSuccess();
          this.checkStoredTokenAndAttemptSilentAuth();
      }
      // If internalGisTokenClientInit fails, it calls onAuthStatusChangedCallback with an error.
  }

  private checkStoredTokenAndAttemptSilentAuth(): void {
    const storedToken = localStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);
    if (storedToken && this.tokenClient && !this.isSilentAuthInProgress) {
        if (!this.signedInUser) { 
            console.log('[GDS] Stored token found, user not marked as signed in. Attempting silent token request.');
            this.isSilentAuthInProgress = true;
            this.tokenClient.requestAccessToken({ prompt: 'none' });
        } else {
            console.log('[GDS] Stored token found, user already marked as signed in. Confirming auth status.');
            this.onAuthStatusChangedCallback(true, this.signedInUser, null);
        }
    } else if (!storedToken) {
        if(this.signedInUser) { // If service thought user was signed in but token is gone
            console.log('[GDS] No stored token, but user was marked as signed in. Clearing state.');
            this.accessToken = null;
            this.signedInUser = null;
            this.onAuthStatusChangedCallback(false, null, 'Session ended or token cleared.');
        } else {
            console.log('[GDS] No stored token, user not marked as signed in. Ensuring signed-out state.');
            this.onAuthStatusChangedCallback(false, null, null);
        }
    } else if (this.isSilentAuthInProgress) {
        console.log('[GDS] Silent auth is already in progress. Skipping new attempt.');
    }
  }

  private internalGisTokenClientInit(): void {
    if (this.tokenClientInitialized && this.tokenClient) {
        console.log('[GDS] internalGisTokenClientInit: Token Client already initialized.');
        return;
    }
    console.log('[GDS] internalGisTokenClientInit: Attempting to initialize Token Client.');
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
          this.isSilentAuthInProgress = false;
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
          this.isSilentAuthInProgress = false;
          console.error('[GDS] GIS Token Client error_callback:', error);
          this.accessToken = null;
          this.signedInUser = null;
          localStorage.removeItem(GDRIVE_ACCESS_TOKEN_KEY);
          const errorReason = error?.message || error?.type || 'GIS token client error.';
          this.onAuthStatusChangedCallback(false, null, errorReason);
        }
      });
      this.tokenClientInitialized = true;
      console.log('[GDS] GIS Token Client initialized successfully.');
    } catch (e: any) {
       console.error('[GDS] Exception during GIS Token Client initialization:', e);
       this.tokenClientInitialized = false;
       this.onAuthStatusChangedCallback(false, null, `GIS Token Client init exception: ${e.message}`);
    }
  }

  public async signIn(): Promise<void> {
    console.log('[GDS] signIn called.');
    if (!this.tokenClientInitialized || !this.tokenClient) {
      const errMsg = '[GDS] GIS Token Client not initialized during signIn. Attempting to initialize now.';
      console.warn(errMsg);
      this.internalGisTokenClientInit(); // Attempt to initialize if not already
      if (!this.tokenClientInitialized || !this.tokenClient) { // Check again
        this.onAuthStatusChangedCallback(false, null, 'GIS Token Client failed to initialize for sign-in.');
        throw new Error('GIS Token Client failed to initialize for sign-in.');
      }
    }
    console.log('[GDS] Requesting access token (interactive prompt may appear)...');
    this.tokenClient.requestAccessToken({ prompt: '' }); 
  }

  public async signOut(): Promise<void> {
    console.log('[GDS] signOut called.');
    const tokenToRevoke = this.accessToken || localStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);
    
    this.accessToken = null; // Clear in-memory token first
    this.signedInUser = null;
    localStorage.removeItem(GDRIVE_ACCESS_TOKEN_KEY);

    if (tokenToRevoke && window.google && window.google.accounts && window.google.accounts.oauth2) {
      console.log('[GDS] Revoking access token:', tokenToRevoke.substring(0, 10) + "...");
      window.google.accounts.oauth2.revoke(tokenToRevoke, () => {
        console.log('[GDS] Access token revoked successfully callback.');
        this.onAuthStatusChangedCallback(false, null, null); // Notify app of signed-out state
      });
    } else {
        console.log('[GDS] No access token to revoke or Google accounts API not ready, just updating state.');
        this.onAuthStatusChangedCallback(false, null, null); // Notify app of signed-out state
    }
  }
  
  public getToken(): string | null {
    if (!this.accessToken) { // Prioritize in-memory token
        this.accessToken = localStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);
    }
    return this.accessToken;
  }

  public getSignedInUserProfile(): GoogleUserProfile | null {
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
      if (!this.gapiLoaded || !this.gisLoaded || !this.pickerApiLoaded || !this.tokenClientInitialized || !this.accessToken) {
        const message = '[GDS] Google API components or Picker not ready for saving.';
        console.error(message, { 
            gapiLoaded: this.gapiLoaded, 
            gisLoaded: this.gisLoaded, 
            pickerApiLoaded: this.pickerApiLoaded, 
            tokenClientReady: this.tokenClientInitialized, 
            accessTokenPresent: !!this.accessToken 
        });
        reject(new Error(message));
        return;
      }
      console.log('[GDS] All components ready for save picker.');

      const view = new window.google.picker.DocsView();
      view.setParent('root'); 
      view.setIncludeFolders(true);
      view.setSelectFolderEnabled(true);
      view.setMode(window.google.picker.DocsViewMode.LIST);
      console.log('[GDS] Save Picker DocsView configured.');


      const pickerBuilder = new window.google.picker.PickerBuilder()
        .setOAuthToken(this.accessToken)
        .addView(view)
        .setTitle(`Select a folder to save "${fileName}"`)
        .setCallback(this.createPickerCallback(fileContent, fileName, resolve, reject));
      
      console.log('[GDS] PickerBuilder configured.');
      const picker = pickerBuilder.build();
      console.log('[GDS] Picker built. Setting visible.');
      picker.setVisible(true);
    });
  }

  private async uploadFile(fileContent: string, fileName: string, folderId: string): Promise<void> {
    console.log(`[GDS] uploadFile called. fileName: ${fileName}, folderId: ${folderId}`);
    if (!this.gapiDriveInitialized || !this.accessToken) { 
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
    
    console.log('[GDS] Multipart request body constructed.');

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
      if (!this.gapiLoaded || !this.gisLoaded || !this.pickerApiLoaded || !this.tokenClientInitialized || !this.accessToken) {
        const message = '[GDS] Google API or Picker not ready for opening.';
        console.error(message, {
             gapiLoaded: this.gapiLoaded, 
            gisLoaded: this.gisLoaded, 
            pickerApiLoaded: this.pickerApiLoaded, 
            tokenClientReady: this.tokenClientInitialized, 
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
      console.log('[GDS] Open Picker DocsView configured.');


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
              console.error('[GDS] Open Picker: Access token is null before fetching file content.');
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
      
      console.log('[GDS] Open PickerBuilder configured.');
      const picker = pickerBuilder.build();
      console.log('[GDS] Open Picker built. Setting visible.');
      picker.setVisible(true);
    });
  }
}

export const googleDriveService = new GoogleDriveService();
      