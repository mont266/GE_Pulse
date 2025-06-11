
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PortfolioEntry } from '../../src/types';
import { UploadIcon, PasteIcon } from '../Icons'; // Assuming PasteIcon exists

// Utility function to validate portfolio data structure
const isValidPortfolioArray = (data: any): data is PortfolioEntry[] => {
  if (!Array.isArray(data)) {
    return false;
  }
  return data.every(entry => 
    typeof entry === 'object' &&
    entry !== null &&
    typeof entry.id === 'string' &&
    typeof entry.itemId === 'number' &&
    typeof entry.quantityPurchased === 'number' && entry.quantityPurchased > 0 &&
    typeof entry.purchasePricePerItem === 'number' && entry.purchasePricePerItem >= 0 &&
    typeof entry.purchaseDate === 'number' &&
    typeof entry.quantitySoldFromThisLot === 'number' && entry.quantitySoldFromThisLot >= 0 &&
    typeof entry.totalProceedsFromThisLot === 'number' && entry.totalProceedsFromThisLot >= 0 &&
    typeof entry.totalTaxPaidFromThisLot === 'number' && entry.totalTaxPaidFromThisLot >= 0 &&
    (entry.lastSaleDate === undefined || typeof entry.lastSaleDate === 'number') &&
    entry.quantityPurchased >= entry.quantitySoldFromThisLot // Basic logical check
  );
};

// Helper hook to get the previous value of a prop or state
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }); // Runs after every render
  return ref.current;
}


interface ImportPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (importedData: PortfolioEntry[]) => void;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ImportPortfolioModal: React.FC<ImportPortfolioModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport,
  addNotification,
}) => {
  const [importMethod, setImportMethod] = useState<'file' | 'code'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevIsOpen = usePrevious(isOpen);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Only reset state when the modal transitions from closed to open
      if (!prevIsOpen) {
        setFile(null);
        setCode('');
        setFileName('');
        setImportMethod('file'); 
      }
    } else {
      document.removeEventListener('keydown', handleEsc);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, prevIsOpen, onClose]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/json' || selectedFile.name.endsWith('.json')) {
        setFile(selectedFile);
        setFileName(selectedFile.name);
      } else {
        addNotification('Invalid file type. Please select a .json file.', 'error');
        setFile(null);
        setFileName('');
        if(fileInputRef.current) fileInputRef.current.value = ""; // Clear the file input
      }
    }
  };

  const handleImportFromFile = () => {
    if (!file) {
      addNotification('Please select a file to import.', 'info');
      return;
    }
    addNotification('Attempting to import from file...', 'info');
    console.log('[ImportPortfolioModal] handleImportFromFile started.');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        console.log('[ImportPortfolioModal] File read. Attempting JSON.parse...');
        addNotification('File read. Validating structure...', 'info');
        const parsedData = JSON.parse(fileContent);
        console.log('[ImportPortfolioModal] JSON.parse successful. Validating array structure...');
        if (isValidPortfolioArray(parsedData)) {
          console.log('[ImportPortfolioModal] Portfolio array from file is valid. Calling onConfirmImport.');
          addNotification('File data structure valid. Confirming import...', 'info');
          onConfirmImport(parsedData);
        } else {
          console.error('[ImportPortfolioModal] isValidPortfolioArray returned false for file data.');
          addNotification('Invalid portfolio data structure in the JSON file.', 'error');
        }
      } catch (error) {
        addNotification('Failed to parse JSON file. Ensure it is a valid GE Pulse portfolio backup.', 'error');
        console.error("Error parsing portfolio JSON file:", error);
      }
    };
    reader.onerror = () => {
        addNotification('Error reading the selected file.', 'error');
        console.error("Error reading file for import:", reader.error);
    };
    reader.readAsText(file);
  };

  const handleImportFromCode = () => {
    const trimmedCode = code.trim();
    console.log('[ImportPortfolioModal] handleImportFromCode started. Code present:', !!trimmedCode);
    addNotification('Attempting to import from code...', 'info');

    if (!trimmedCode) {
      addNotification('Please paste your backup code.', 'info');
      return;
    }

    let processedCode = trimmedCode;
    if (processedCode.startsWith('"') && processedCode.endsWith('"') && processedCode.length >= 2) {
      processedCode = processedCode.substring(1, processedCode.length - 1);
      console.log('[ImportPortfolioModal] Quotes stripped from code.');
    }

    try {
      console.log('[ImportPortfolioModal] Attempting atob...');
      const jsonString = atob(processedCode);
      console.log('[ImportPortfolioModal] atob successful. Attempting JSON.parse...');
      addNotification('Code decoded. Validating structure...', 'info');

      const parsedData = JSON.parse(jsonString);
      console.log('[ImportPortfolioModal] JSON.parse successful. Validating array structure...');

      if (isValidPortfolioArray(parsedData)) {
        console.log('[ImportPortfolioModal] Portfolio array from code is valid. Calling onConfirmImport.');
        addNotification('Data structure valid. Confirming import...', 'info');
        onConfirmImport(parsedData);
      } else {
        console.error('[ImportPortfolioModal] isValidPortfolioArray returned false for code data.');
        addNotification('Invalid portfolio data structure in the provided code.', 'error');
      }
    } catch (error) {
      console.error("[ImportPortfolioModal] Error parsing portfolio from code:", error);
      addNotification('Invalid backup code format. Ensure it is a valid Base64 encoded GE Pulse portfolio backup.', 'error');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[85] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-portfolio-modal-title"
    >
      <div
        className="bg-[var(--bg-modal)] p-6 rounded-lg shadow-xl w-full max-w-lg text-[var(--text-primary)] max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="import-portfolio-modal-title" className="text-xl font-semibold text-[var(--text-accent)]">
            Import Portfolio Data
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors"
            aria-label="Close import modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 border-b border-[var(--border-primary)]">
          <nav className="flex space-x-1" aria-label="Import methods">
            {(['file', 'code'] as const).map((method) => (
              <button
                key={method}
                onClick={() => setImportMethod(method)}
                className={`px-4 py-2 font-medium text-sm rounded-t-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-accent)]
                  ${importMethod === method
                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input-secondary)]/70'
                  }`}
                aria-current={importMethod === method ? 'page' : undefined}
              >
                {method === 'file' ? 'Upload JSON File' : 'Paste Backup Code'}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-1 space-y-4">
            <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-input-secondary)] p-2 rounded-md">
                <strong className="text-[var(--price-low)]">Warning:</strong> Importing will overwrite your current portfolio. This action cannot be undone.
            </p>
          {importMethod === 'file' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="portfolioFile" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Select Portfolio JSON File (.json)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[var(--border-secondary)] border-dashed rounded-md bg-[var(--bg-input-secondary)] hover:border-[var(--border-accent)] transition-colors">
                  <div className="space-y-1 text-center">
                    <UploadIcon className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
                    <div className="flex text-sm text-[var(--text-secondary)]">
                      <label
                        htmlFor="portfolioFile"
                        className="relative cursor-pointer rounded-md font-medium text-[var(--text-accent)] hover:text-[var(--link-text-hover)] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-[var(--bg-input-secondary)] focus-within:ring-[var(--border-accent)]"
                      >
                        <span>Upload a file</span>
                        <input id="portfolioFile" name="portfolioFile" type="file" className="sr-only" onChange={handleFileChange} accept=".json,application/json" ref={fileInputRef} />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    {fileName && <p className="text-xs text-[var(--text-primary)] pt-1">{fileName}</p>}
                    {!fileName && <p className="text-xs text-[var(--text-muted)]">JSON up to 5MB</p>}
                  </div>
                </div>
              </div>
              <button
                onClick={handleImportFromFile}
                disabled={!file}
                className="w-full flex items-center justify-center bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold py-2.5 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <UploadIcon className="w-5 h-5 mr-2" />
                Load from File
              </button>
            </div>
          )}

          {importMethod === 'code' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="portfolioCode" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Paste Backup Code
                </label>
                <textarea
                  id="portfolioCode"
                  rows={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] resize-none font-mono text-xs"
                  placeholder="Paste your Base64 encoded backup code here..."
                />
              </div>
              <button
                onClick={handleImportFromCode}
                disabled={!code.trim()}
                className="w-full flex items-center justify-center bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold py-2.5 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <PasteIcon className="w-5 h-5 mr-2" />
                Restore from Code
              </button>
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-[var(--border-primary)] text-right">
          <button
            type="button"
            onClick={onClose}
            className="bg-[var(--bg-tertiary)] hover:bg-[var(--bg-input-secondary)] text-[var(--text-secondary)] font-semibold py-2.5 px-5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-primary)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
