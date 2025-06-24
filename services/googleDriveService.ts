
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
  private gapiDriveInitialized: boolean = false;
  private tokenClientInitialized: boolean = false;
  
  private gisScriptLoading: boolean = false;
  private gapiClientScriptLoading: boolean = false;
  private gapiPickerLoading: boolean = false;
  private isSilentAuthAttemptedThisLoad: boolean = false;
  private explicitSignInSource: 'signInButton' | null = null;

  private tokenClient: any = null;
  private accessToken: string | null = null;
  private signedInUser: GoogleUserProfile | null = null;

  constructor() {
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
      const errorMsg = "[GDS] API Key or Client ID is missing.";
      console.error(errorMsg);
      this.updateAuthStatus(false, null, "API Key or Client ID missing.");
      return;
    }
    
    if (this.gisLoaded) {
      if (this.onGisLoadedCallback) this.onGisLoadedCallback();
      return;
    }
    if (this.gisScriptLoading) return;

    this.gisScriptLoading = true;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = this.handleGisScriptLoad;
    script.onerror = () => {
        this.gisScriptLoading = false;
        this.updateAuthStatus(false, null, "Failed to load Google Identity Services.");
    };
    document.body.appendChild(script);
  }

  private handleGisScriptLoad(): void {
    this.gisLoaded = true; 
    this.gisScriptLoading = false;
    if (this.onGisLoadedCallback) this.onGisLoadedCallback();
  }
  
  public initGapiClient(gapiInitSuccess: () => void, gapiInitError: (error: any) => void): void {
    if (!this.gisLoaded) {
        const errMsg = "[GDS] initGapiClient called before GIS fully loaded.";
        console.error(errMsg);
        gapiInitError(new Error(errMsg));
        return;
    }

    if (this.gapiLoaded && this.pickerApiLoaded && this.gapiDriveInitialized && this.tokenClientInitialized) {
        gapiInitSuccess();
        this.attemptSilentSignIn(); 
        return;
    }

    if (!this.gapiLoaded) {
        if (this.gapiClientScriptLoading) return;
        this.gapiClientScriptLoading = true;
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => this.handleGapiClientScriptLoad(gapiInitSuccess, gapiInitError);
        script.onerror = (err) => {
            this.gapiClientScriptLoading = false;
            gapiInitError(new Error("Failed to load GAPI client script (api.js)."));
        };
        document.body.appendChild(script);
    } else {
        this.loadPickerApiThenInitialize(gapiInitSuccess, gapiInitError);
    }
  }
  
  private handleGapiClientScriptLoad(gapiInitSuccess: () => void, gapiInitError: (error: any) => void): void {
    this.gapiLoaded = true;
    this.gapiClientScriptLoading = false;
    this.loadPickerApiThenInitialize(gapiInitSuccess, gapiInitError);
  }

  private loadPickerApiThenInitialize(gapiInitSuccess: () => void, gapiInitError: (error: any) => void): void {
    if (this.pickerApiLoaded) {
        this.initializeDriveAndTokenClientLogic(gapiInitSuccess, gapiInitError);
        return;
    }
    if (this.gapiPickerLoading) return;
    this.gapiPickerLoading = true;
    window.gapi.load('client:picker', {
      callback: () => {
        this.pickerApiLoaded = true;
        this.gapiPickerLoading = false;
        this.initializeDriveAndTokenClientLogic(gapiInitSuccess, gapiInitError);
      },
      onerror: (err: any) => {
        this.gapiPickerLoading = false;
        gapiInitError(err);
      },
      timeout: 5000,
      ontimeout: () => {
        this.gapiPickerLoading = false;
        gapiInitError(new Error('Timeout loading GAPI Picker API.'));
      }
    });
  }
  
  private initializeDriveAndTokenClientLogic(gapiInitSuccess: () => void, gapiInitError: (error: any) => void): void {
    const initDriveIfNeeded = () => {
        if (this.gapiDriveInitialized) return Promise.resolve();
        console.log('[GDS] Initializing GAPI client for Drive API.');
        return window.gapi.client.init({
          apiKey: this.apiKey,
          discoveryDocs: GDRIVE_DISCOVERY_DOCS,
        }).then(() => { this.gapiDriveInitialized = true; console.log('[GDS] GAPI client for Drive API initialized.'); })
         .catch(err => {
            console.error("[GDS] GAPI Drive client.init failed:", err);
            throw err;
         });
    };

    const initTokenClientIfNeeded = () => {
        if (this.tokenClientInitialized) return;
        this.internalGisTokenClientInit(); 
        if(!this.tokenClientInitialized) {
            const errMsg = "Token client initialization failed during initializeDriveAndTokenClientLogic.";
            console.error(`[GDS] ${errMsg}`);
            throw new Error(errMsg);
        }
    };

    Promise.resolve()
      .then(initDriveIfNeeded)
      .then(initTokenClientIfNeeded)
      .then(() => {
        console.log('[GDS] Drive and Token Client logic complete. Calling gapiInitSuccess.');
        gapiInitSuccess();
        this.attemptSilentSignIn();
      })
      .catch((error: any) => {
        console.error('[GDS] Error in initializeDriveAndTokenClientLogic chain:', error);
        gapiInitError(error);
      });
  }

  private attemptSilentSignIn(): void {
    if (this.isSilentAuthAttemptedThisLoad) {
        console.log('[GDS] Silent auth already attempted this load cycle.');
        if (!localStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY)) {
            this.updateAuthStatus(false, null, null);
        }
        return;
    }
     if (!this.tokenClientInitialized || !this.tokenClient) {
        console.log('[GDS] Token client not ready for silent sign-in attempt.');
        // If token client isn't ready and there's no stored token, assume signed out.
        // If there IS a stored token, it implies a complex state we might not want to override yet.
        // However, for initial load, if token client isn't ready, silent sign-in isn't possible.
        if (!localStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY)) {
            this.updateAuthStatus(false, null, null);
        }
        return;
    }
    
    this.isSilentAuthAttemptedThisLoad = true;
    const storedToken = localStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);

    if (storedToken) {
      console.log('[GDS] Stored token found. Attempting silent token request (prompt: none).');
      this.explicitSignInSource = null; // Ensure it's null for silent attempt
      this.tokenClient.requestAccessToken({ prompt: 'none' });
    } else {
      console.log('[GDS] No stored token, user is signed out.');
      this.updateAuthStatus(false, null, null);
    }
  }

  private internalGisTokenClientInit(): void {
    if (this.tokenClientInitialized && this.tokenClient) {
        console.log('[GDS] Token Client already initialized.');
        return;
    }
    if (!this.clientId) {
        const errMsg = "Client ID missing for GIS Token Client initialization.";
        console.error(`[GDS] ${errMsg}`);
        this.updateAuthStatus(false, null, errMsg);
        return;
    }
    try {
      console.log('[GDS] Initializing GIS Token Client.');
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: GDRIVE_SCOPES.join(' '),
        callback: (tokenResponse: any) => {
          console.log('[GDS] Token Client Callback. Response:', tokenResponse, 'Explicit source:', this.explicitSignInSource);
          if (tokenResponse && tokenResponse.access_token) {
            this.accessToken = tokenResponse.access_token;
            localStorage.setItem(GDRIVE_ACCESS_TOKEN_KEY, this.accessToken!);
            console.log('[GDS] Access token acquired and stored.');
            this.fetchUserProfileAndUpdateStatus();
          } else { // Token acquisition failed or error in response
            this.clearTokenAndUser(); // Essential: clear bad/old token
            let userVisibleError: string | null = null;
            if (tokenResponse?.error) {
              console.log(`[GDS] Token response error: ${tokenResponse.error}, Description: ${tokenResponse.error_description}, URI: ${tokenResponse.error_uri}`);
              if (this.explicitSignInSource) { // Error came from an explicit user action
                if (tokenResponse.error === "popup_closed_by_user" || tokenResponse.error === "user_cancel") {
                    userVisibleError = "Sign-in cancelled.";
                } else if (tokenResponse.error === "access_denied") {
                    userVisibleError = "Access denied by user or admin.";
                } else {
                    userVisibleError = tokenResponse.error_description || tokenResponse.error || "Sign-in error.";
                }
              } else { // Silent attempt failed
                // No user-visible error message for silent failures.
                // Log the specific error for debugging.
                console.warn(`[GDS] Silent token acquisition failed. Error: ${tokenResponse.error}, Details: ${tokenResponse.error_description || 'N/A'}`);
                userVisibleError = null; 
              }
            } else {
                 // No token and no specific error from Google, treat as sign-out.
                 // This can happen if prompt:none doesn't find a session and doesn't error out, but simply doesn't return a token.
                console.warn('[GDS] Token acquisition failed without specific error in tokenResponse.');
                userVisibleError = this.explicitSignInSource ? "Sign-in failed: No token received." : null;
            }
            this.updateAuthStatus(false, null, userVisibleError);
          }
          this.explicitSignInSource = null; // Reset source after handling
        },
        error_callback: (error: any) => { // This callback is for GSI library errors, not API errors.
          console.error('[GDS] GIS Token Client Library error_callback:', error);
          this.clearTokenAndUser();
          const errorReason = error?.message || error?.type || 'GIS token client library error.';
          this.updateAuthStatus(false, null, this.explicitSignInSource ? errorReason : null);
          this.explicitSignInSource = null;
        }
      });
      this.tokenClientInitialized = true;
      console.log('[GDS] GIS Token Client initialized successfully.');
    } catch (e: any) {
       console.error('[GDS] Exception during GIS Token Client initialization:', e);
       this.tokenClientInitialized = false;
       this.updateAuthStatus(false, null, `GIS Token Client init exception: ${e.message || 'Unknown error'}`);
    }
  }

  private async fetchUserProfileAndUpdateStatus(): Promise<void> {
    if (!this.accessToken) {
      console.warn('[GDS] fetchUserProfileAndUpdateStatus called without access token.');
      this.updateAuthStatus(false, null, "Access token missing before fetching profile.");
      return;
    }
    if (!this.gapiDriveInitialized || !window.gapi?.client?.drive?.about) {
        console.error('[GDS] GAPI Drive client or "about" service not ready for fetching user profile.');
        this.updateAuthStatus(true, { email: 'Profile fetch error (GAPI not ready)' }, 'Drive API not ready for profile.');
        return;
    }
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
      this.updateAuthStatus(true, this.signedInUser, null);
    } catch (error: any) {
      console.error('[GDS] Error fetching user profile:', error);
      this.updateAuthStatus(true, { email: 'Error fetching email' }, 'Failed to fetch user profile.');
    }
  }
  
  private clearTokenAndUser(): void {
    console.log('[GDS] Clearing local token and user info.');
    this.accessToken = null;
    this.signedInUser = null;
    localStorage.removeItem(GDRIVE_ACCESS_TOKEN_KEY);
  }

  private updateAuthStatus(isSignedIn: boolean, user: GoogleUserProfile | null, error: string | null): void {
    this.signedInUser = isSignedIn ? user : null;
    if (!isSignedIn) { 
        this.accessToken = null; // Ensure in-memory token is also cleared if not signed in
    } else if (isSignedIn && !this.accessToken) { 
        this.accessToken = localStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);
    }
    
    console.log(`[GDS] Updating auth status: isSignedIn=${isSignedIn}, userEmail=${user?.email}, error=${error}`);
    this.onAuthStatusChangedCallback(isSignedIn, user, error);
  }

  public async signIn(): Promise<void> {
    console.log('[GDS] signIn (explicit) called.');
    if (!this.tokenClientInitialized || !this.tokenClient) {
      this.internalGisTokenClientInit();
      if (!this.tokenClientInitialized || !this.tokenClient) {
        const errMsg = 'GIS Token Client failed to initialize for sign-in.';
        console.error(`[GDS] ${errMsg}`);
        this.updateAuthStatus(false, null, errMsg);
        throw new Error(errMsg);
      }
    }
    this.explicitSignInSource = 'signInButton';
    console.log('[GDS] Requesting access token with interactive prompt.');
    this.tokenClient.requestAccessToken({ prompt: '' }); 
  }

  public async signOut(): Promise<void> {
    console.log('[GDS] signOut called.');
    const tokenToRevoke = this.accessToken || localStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);
    
    this.clearTokenAndUser(); 

    if (tokenToRevoke && window.google && window.google.accounts && window.google.accounts.oauth2) {
      console.log('[GDS] Revoking Google access token.');
      try {
        window.google.accounts.oauth2.revoke(tokenToRevoke, () => {
          console.log('[GDS] Access token revoked successfully (Google callback).');
          // Callback ensures status update after revocation completes or fails.
          this.updateAuthStatus(false, null, null); 
        });
      } catch (e) {
        console.warn('[GDS] Error during google.accounts.oauth2.revoke call, forcing sign-out state.', e);
        this.updateAuthStatus(false, null, null);
      }
    } else {
        console.log('[GDS] No token to revoke or Google API not ready, just updating local state.');
        this.updateAuthStatus(false, null, null);
    }
    this.isSilentAuthAttemptedThisLoad = false; 
    this.explicitSignInSource = null;
  }
  
  public getToken(): string | null {
    if (this.accessToken) return this.accessToken;
    this.accessToken = localStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);
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
      if (data.action === window.google.picker.Action.PICKED) {
        if (!data.docs || data.docs.length === 0) {
            reject(new Error('No folder selected from picker.'));
            return;
        }
        const folderId = data.docs[0].id;
        const currentTokenForUpload = this.getToken();
        if (!currentTokenForUpload) {
            reject(new Error('User signed out before upload could start.'));
            return;
        }
        this.uploadFile(fileContent, fileName, folderId, currentTokenForUpload)
          .then(resolve)
          .catch(reject);
      } else if (data.action === window.google.picker.Action.CANCEL) {
        reject(new Error('picker_closed'));
      }
    };
  }

  public showSavePicker(fileContent: string, fileName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const currentToken = this.getToken();
      if (!this.gapiLoaded || !this.pickerApiLoaded || !this.tokenClientInitialized || !currentToken) {
        reject(new Error('[GDS] Google API components, Picker not ready, or user not signed in for save.'));
        return;
      }
      
      const view = new window.google.picker.DocsView();
      view.setParent('root'); 
      view.setIncludeFolders(true);
      view.setSelectFolderEnabled(true);
      view.setMode(window.google.picker.DocsViewMode.LIST);

      const pickerBuilder = new window.google.picker.PickerBuilder()
        .setOAuthToken(currentToken)
        .addView(view)
        .setTitle(`Select a folder to save "${fileName}"`)
        .setCallback(this.createPickerCallback(fileContent, fileName, resolve, reject));
      
      const picker = pickerBuilder.build();
      picker.setVisible(true);
    });
  }

  private async uploadFile(fileContent: string, fileName: string, folderId: string, token: string): Promise<void> {
    if (!this.gapiDriveInitialized) { 
      throw new Error('[GDS] Drive API client not loaded for uploadFile.');
    }
    window.gapi.client.setToken({ access_token: token });

    const metadata = { name: fileName, mimeType: 'application/json', parents: [folderId] };
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;
    const multipartRequestBody =
      delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) +
      delimiter + 'Content-Type: application/json\r\n\r\n' + fileContent + close_delim;
    
    try {
      const request = window.gapi.client.request({
        path: '/upload/drive/v3/files', method: 'POST', params: { uploadType: 'multipart' },
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}`},
        body: multipartRequestBody,
      });
      await request;
    } catch (error: any) {
      const errorMessage = error.result?.error?.message || error.message || 'Unknown Drive API error during upload.';
      throw new Error(`Drive API upload error: ${errorMessage}`);
    }
  }
  
  public showOpenPicker(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const currentToken = this.getToken();
      if (!this.gapiLoaded || !this.pickerApiLoaded || !this.tokenClientInitialized || !currentToken) {
        reject(new Error('[GDS] Google API components, Picker not ready, or user not signed in for open.'));
        return;
      }

      const view = new window.google.picker.DocsView().setParent('root').setMimeTypes('application/json').setIncludeFolders(true).setSelectFolderEnabled(false);
      const pickerBuilder = new window.google.picker.PickerBuilder()
        .setOAuthToken(currentToken)
        .addView(view)
        .setTitle('Select a portfolio JSON file')
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            if (!data.docs || data.docs.length === 0) { resolve(null); return; }
            const fileId = data.docs[0].id;
            const tokenForFetch = this.getToken();
            if (!tokenForFetch) { reject(new Error('User signed out before file content fetch.')); return; }
            window.gapi.client.setToken({ access_token: tokenForFetch });
            try {
              const response = await window.gapi.client.drive.files.get({ fileId: fileId, alt: 'media' });
              resolve(response.body); 
            } catch (error: any) {
              const errorMessage = error.result?.error?.message || error.message || 'Unknown error';
              reject(new Error(`Failed to open file: ${errorMessage}`));
            }
          } else if (data.action === window.google.picker.Action.CANCEL) {
            reject(new Error('picker_closed'));
          }
        });
      const picker = pickerBuilder.build();
      picker.setVisible(true);
    });
  }
}

export const googleDriveService = new GoogleDriveService();
