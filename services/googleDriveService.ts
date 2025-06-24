
// Ensure gapi and google types are available globally after scripts load

const SAFE_PROCESS_ENV = typeof process !== 'undefined' && process.env ? process.env : ({} as Record<string, string | undefined>);

const API_KEY = SAFE_PROCESS_ENV.GOOGLE_API_KEY;
const CLIENT_ID = SAFE_PROCESS_ENV.GOOGLE_CLIENT_ID;

const SCOPES = 'https://www.googleapis.com/auth/drive.file'; // Scope for files created or opened by the app
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const PORTFOLIO_FILENAME = 'gepulse_portfolio.json';
const PORTFOLIO_MIME_TYPE = 'application/json';

let gapiClientInitialized = false;
let tokenClient: any = null; // Will hold google.accounts.oauth2.TokenClient

interface GDriveFile {
  id: string;
  name: string;
  mimeType: string;
}

// Helper to load external scripts
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
  if (gapiClientInitialized && tokenClient) return true;

  if (!API_KEY || !CLIENT_ID) {
    console.warn("Google Drive Service: API_KEY or CLIENT_ID is missing. Drive functionality will be disabled.");
    return false;
  }

  try {
    // GAPI script is loaded via index.html, ensure it's ready
    if (!window.gapi) {
        await loadScript('https://apis.google.com/js/api.js', 'gapi-script');
    }
    await new Promise<void>((resolve, reject) => {
        const interval = setInterval(() => {
            if (window.gapi && window.gapi.load) {
                clearInterval(interval);
                resolve();
            }
        }, 100);
        setTimeout(() => { // Timeout to prevent infinite loop
            clearInterval(interval);
            if (!window.gapi || !window.gapi.load) {
                reject(new Error("GAPI script failed to load or initialize window.gapi.load"));
            }
        }, 5000); // 5 second timeout
    });
    
    await new Promise<void>((resolve) => window.gapi.load('client', resolve));
    
    await window.gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: DISCOVERY_DOCS,
    });
    gapiClientInitialized = true;

    // GIS script is loaded via index.html, ensure it's ready
    if (!(window.google && window.google.accounts && window.google.accounts.oauth2)) {
      await loadScript('https://accounts.google.com/gsi/client', 'gis-script');
    }
     await new Promise<void>((resolve, reject) => {
        const interval = setInterval(() => {
            if (window.google && window.google.accounts && window.google.accounts.oauth2 && window.google.accounts.oauth2.initTokenClient) {
                clearInterval(interval);
                resolve();
            }
        }, 100);
         setTimeout(() => { // Timeout
            clearInterval(interval);
            if (!(window.google && window.google.accounts && window.google.accounts.oauth2 && window.google.accounts.oauth2.initTokenClient)) {
                 reject(new Error("Google Identity Services (GIS) script failed to load or initialize window.google.accounts.oauth2.initTokenClient"));
            }
        }, 5000); // 5 second timeout
    });

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: '', // Callback is handled by the promise in requestAccessToken
    });
    return true;
  } catch (error) {
    console.error("Error initializing Google Drive Service:", error);
    gapiClientInitialized = false;
    tokenClient = null;
    return false;
  }
};

export const requestAccessToken = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("Google Token Client not initialized."));
      return;
    }
    if (!gapiClientInitialized) {
      reject(new Error("GAPI Client not initialized."));
      return;
    }

    const currentToken = window.gapi.client.getToken();
    if (currentToken && currentToken.access_token) {
       resolve(currentToken.access_token);
       return;
    }
    
    tokenClient.callback = (resp: any) => {
      if (resp.error) {
        console.error("Google Access Token Error:", resp.error, resp);
        reject(new Error(resp.error.toString()));
      } else {
        window.gapi.client.setToken(resp); 
        resolve(resp.access_token);
      }
    };
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

const findPortfolioFile = async (): Promise<string | null> => {
  if (!gapiClientInitialized) throw new Error("GAPI Client not initialized.");
  try {
    const response = await window.gapi.client.drive.files.list({
      q: `name='${PORTFOLIO_FILENAME}' and mimeType='${PORTFOLIO_MIME_TYPE}' and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name)',
    });
    const files = response.result.files;
    if (files && files.length > 0) {
      return files[0].id;
    }
    return null;
  } catch (error) {
    console.error("Error finding portfolio file:", error);
    throw error;
  }
};

export const savePortfolioToDrive = async (portfolioDataJson: string): Promise<void> => {
  if (!gapiClientInitialized) throw new Error("GAPI Client not initialized.");

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
    requestPath = `/upload/drive/v3/files/${fileId}?uploadType=multipart`;
    method = 'PATCH';
  } else {
    requestPath = '/upload/drive/v3/files?uploadType=multipart';
    method = 'POST';
  }
  
  try {
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
        throw new Error(`Google Drive API error: ${response.status} ${response.body}`);
    }
  } catch (error) {
    console.error(`Error ${fileId ? 'updating' : 'creating'} portfolio file:`, error);
    throw error;
  }
};

export const loadPortfolioFromDrive = async (): Promise<string | null> => {
  if (!gapiClientInitialized) throw new Error("GAPI Client not initialized.");
  
  const fileId = await findPortfolioFile();
  if (!fileId) {
    return null; // File not found
  }

  try {
    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });
    return response.body; // JSON string content
  } catch (error) {
    console.error("Error loading portfolio file from Drive:", error);
    throw error;
  }
};

export const googleDriveService = {
  initGoogleDriveService,
  requestAccessToken,
  savePortfolioToDrive,
  loadPortfolioFromDrive,
};
