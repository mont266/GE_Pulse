
// Ensure gapi and google types are available globally after scripts load

// Helper to get values from window object, falling back to undefined
// Also checks if Netlify's placeholder syntax is present, indicating an injection issue.
const getWindowVariable = (key: string): string | undefined => {
  if (typeof window !== 'undefined' && (window as any)[key]) {
    const value = (window as any)[key];
    if (typeof value === 'string' && value.startsWith("{{") && value.endsWith("}}")) {
      console.warn(`Google Drive Service: Environment variable ${key} appears to be an unreplaced Netlify placeholder: ${value}. Ensure the variable is set in Netlify's build environment.`);
      return undefined;
    }
    if (value === "undefined") {
        console.warn(`Google Drive Service: Environment variable ${key} was resolved to the string "undefined". Ensure the variable is correctly set in Netlify.`);
        return undefined;
    }
    return value;
  }
  console.warn(`Google Drive Service: window.${key} is not defined.`);
  return undefined;
};

const API_KEY = getWindowVariable('GOOGLE_API_KEY');
const CLIENT_ID = getWindowVariable('GOOGLE_CLIENT_ID');

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const PORTFOLIO_FILENAME = 'gepulse_portfolio.json';
const PORTFOLIO_MIME_TYPE = 'application/json';

let gapiClientInitialized = false;
let tokenClient: any = null;

interface GDriveFile {
  id: string;
  name: string;
  mimeType: string;
}

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
    script.onerror = (e) => reject(new Error(`Failed to load script ${src}: ${e}`));
    document.head.appendChild(script);
  });
};

export const initGoogleDriveService = async (): Promise<boolean> => {
  console.log("Google Drive Service: Attempting initialization...");
  if (gapiClientInitialized && tokenClient) {
    console.log("Google Drive Service: Already initialized.");
    return true;
  }

  if (!API_KEY) {
    console.error("Google Drive Service: API_KEY is missing. Drive functionality will be disabled.");
    return false;
  }
  if (!CLIENT_ID) {
    console.error("Google Drive Service: CLIENT_ID is missing. Drive functionality will be disabled.");
    return false;
  }
  console.log("Google Drive Service: API_KEY and CLIENT_ID seem present.");

  try {
    console.log("Google Drive Service: Loading GAPI script if not present...");
    if (!window.gapi) {
        await loadScript('https://apis.google.com/js/api.js', 'gapi-script');
    }
    console.log("Google Drive Service: Waiting for window.gapi.load...");
    await new Promise<void>((resolve, reject) => {
        const interval = setInterval(() => {
            if (window.gapi && window.gapi.load) {
                clearInterval(interval);
                console.log("Google Drive Service: window.gapi.load is available.");
                resolve();
            }
        }, 100);
        setTimeout(() => {
            clearInterval(interval);
            if (!window.gapi || !window.gapi.load) {
                console.error("Google Drive Service: Timeout waiting for window.gapi.load.");
                reject(new Error("GAPI script failed to load or initialize window.gapi.load"));
            }
        }, 5000);
    });
    
    console.log("Google Drive Service: Loading GAPI client library...");
    await new Promise<void>((resolve) => window.gapi.load('client', resolve));
    console.log("Google Drive Service: GAPI client library loaded.");
    
    console.log("Google Drive Service: Initializing GAPI client with API Key and Discovery Docs...");
    await window.gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: DISCOVERY_DOCS,
    });
    gapiClientInitialized = true;
    console.log("Google Drive Service: GAPI client initialized.");

    console.log("Google Drive Service: Loading GIS script if not present...");
    if (!(window.google && window.google.accounts && window.google.accounts.oauth2)) {
      await loadScript('https://accounts.google.com/gsi/client', 'gis-script');
    }
    console.log("Google Drive Service: Waiting for GIS token client initialization function...");
     await new Promise<void>((resolve, reject) => {
        const interval = setInterval(() => {
            if (window.google && window.google.accounts && window.google.accounts.oauth2 && window.google.accounts.oauth2.initTokenClient) {
                clearInterval(interval);
                console.log("Google Drive Service: GIS token client function is available.");
                resolve();
            }
        }, 100);
         setTimeout(() => {
            clearInterval(interval);
            if (!(window.google && window.google.accounts && window.google.accounts.oauth2 && window.google.accounts.oauth2.initTokenClient)) {
                 console.error("Google Drive Service: Timeout waiting for GIS token client function.");
                 reject(new Error("Google Identity Services (GIS) script failed to load or initialize window.google.accounts.oauth2.initTokenClient"));
            }
        }, 5000);
    });

    console.log("Google Drive Service: Initializing GIS token client...");
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: '', // Callback is handled by the promise in requestAccessToken
    });
    console.log("Google Drive Service: GIS token client initialized.");
    console.log("Google Drive Service: Initialization successful.");
    return true;
  } catch (error) {
    console.error("Google Drive Service: Error during initialization:", error);
    gapiClientInitialized = false;
    tokenClient = null;
    return false;
  }
};

export const requestAccessToken = (): Promise<string> => {
  console.log("Google Drive Service: Requesting access token...");
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      console.error("Google Drive Service: Token Client not initialized during access token request.");
      reject(new Error("Google Token Client not initialized."));
      return;
    }
    if (!gapiClientInitialized) {
      console.error("Google Drive Service: GAPI Client not initialized during access token request.");
      reject(new Error("GAPI Client not initialized."));
      return;
    }

    const currentToken = window.gapi.client.getToken();
    if (currentToken && currentToken.access_token) {
       console.log("Google Drive Service: Using existing access token.");
       resolve(currentToken.access_token);
       return;
    }
    
    console.log("Google Drive Service: No existing token, requesting new one...");
    tokenClient.callback = (resp: any) => {
      if (resp.error) {
        console.error("Google Drive Service: Google Access Token Error in callback:", resp.error, resp);
        reject(new Error(`Google Auth Error: ${resp.error.toString()}`));
      } else {
        console.log("Google Drive Service: Access token obtained successfully from callback.");
        window.gapi.client.setToken(resp); 
        resolve(resp.access_token);
      }
    };
    tokenClient.requestAccessToken({ prompt: 'select_account' }); // Changed to select_account for less intrusive re-auth if needed
  });
};

const findPortfolioFile = async (): Promise<string | null> => {
  console.log("Google Drive Service: Finding portfolio file...");
  if (!gapiClientInitialized) throw new Error("GAPI Client not initialized for findPortfolioFile.");
  try {
    const response = await window.gapi.client.drive.files.list({
      q: `name='${PORTFOLIO_FILENAME}' and mimeType='${PORTFOLIO_MIME_TYPE}' and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name)',
    });
    const files = response.result.files;
    if (files && files.length > 0) {
      console.log(`Google Drive Service: Portfolio file found with ID: ${files[0].id}`);
      return files[0].id;
    }
    console.log("Google Drive Service: Portfolio file not found.");
    return null;
  } catch (error) {
    console.error("Google Drive Service: Error finding portfolio file:", error);
    throw error; // Re-throw to be caught by caller
  }
};

export const savePortfolioToDrive = async (portfolioDataJson: string): Promise<void> => {
  console.log("Google Drive Service: Attempting to save portfolio to Drive...");
  if (!gapiClientInitialized) throw new Error("GAPI Client not initialized for savePortfolioToDrive.");

  const fileMetadata: Partial<GDriveFile> = {
    name: PORTFOLIO_FILENAME,
    mimeType: PORTFOLIO_MIME_TYPE,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(fileMetadata) +
    delimiter +
    'Content-Type: ' + PORTFOLIO_MIME_TYPE + '\r\n\r\n' +
    portfolioDataJson +
    close_delim;

  const fileId = await findPortfolioFile();

  let requestPath: string;
  let method: 'POST' | 'PATCH';

  if (fileId) {
    console.log(`Google Drive Service: Updating existing file ID: ${fileId}`);
    requestPath = `/upload/drive/v3/files/${fileId}?uploadType=multipart`;
    method = 'PATCH';
  } else {
    console.log("Google Drive Service: Creating new file.");
    requestPath = '/upload/drive/v3/files?uploadType=multipart';
    method = 'POST';
  }
  
  try {
    console.log(`Google Drive Service: Making ${method} request to ${requestPath}`);
    const response = await window.gapi.client.request({
      path: requestPath,
      method: method,
      params: { uploadType: 'multipart' },
      headers: {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
      },
      body: multipartRequestBody
    });
    if (response.status < 200 || response.status >=300) {
        console.error(`Google Drive Service: API error during save - Status: ${response.status}`, response.body);
        throw new Error(`Google Drive API error: ${response.status} ${response.body || 'No additional error info'}`);
    }
    console.log("Google Drive Service: Portfolio saved successfully.");
  } catch (error) {
    console.error(`Google Drive Service: Error ${fileId ? 'updating' : 'creating'} portfolio file:`, error);
    throw error; // Re-throw
  }
};

export const loadPortfolioFromDrive = async (): Promise<string | null> => {
  console.log("Google Drive Service: Attempting to load portfolio from Drive...");
  if (!gapiClientInitialized) throw new Error("GAPI Client not initialized for loadPortfolioFromDrive.");
  
  const fileId = await findPortfolioFile();
  if (!fileId) {
    console.log("Google Drive Service: No portfolio file found on Drive to load.");
    return null; 
  }

  try {
    console.log(`Google Drive Service: Getting file content for ID: ${fileId}`);
    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });
    console.log("Google Drive Service: Portfolio loaded successfully from Drive.");
    return response.body; 
  } catch (error) {
    console.error("Google Drive Service: Error loading portfolio file content from Drive:", error);
    throw error; // Re-throw
  }
};

export const googleDriveService = {
  initGoogleDriveService,
  requestAccessToken,
  savePortfolioToDrive,
  loadPortfolioFromDrive,
};
