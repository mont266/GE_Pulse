
import React, { useState, useEffect, useMemo } from 'react';
import { PortfolioEntry } from '../../src/types';
import { CopyIcon, CheckIcon, CrossIcon } from '../Icons';

interface DisplayCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioEntries: PortfolioEntry[];
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DisplayCodeModal: React.FC<DisplayCodeModalProps> = ({
  isOpen,
  onClose,
  portfolioEntries,
  addNotification,
}) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const base64Code = useMemo(() => {
    if (!isOpen || portfolioEntries.length === 0) return '';
    try {
      const jsonString = JSON.stringify(portfolioEntries);
      return btoa(jsonString); // Base64 encode
    } catch (error) {
      console.error("Error generating Base64 code:", error);
      return "Error generating code.";
    }
  }, [isOpen, portfolioEntries]);

  // Effect to reset status when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setCopyStatus('idle');
      setCopyMessage(null);
    }
  }, [isOpen]);

  // Effect to handle timed reset of copy status and message
  useEffect(() => {
    let timerId: number | undefined;
    if (copyStatus === 'success' || copyStatus === 'error') {
      timerId = window.setTimeout(() => {
        setCopyStatus('idle');
        setCopyMessage(null);
      }, copyStatus === 'success' ? 3500 : 3000); // 3.5s for success, 3s for error
    }
    return () => {
      if (timerId) {
        window.clearTimeout(timerId);
      }
    };
  }, [copyStatus]);

  // ESC key listener
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);


  if (!isOpen) {
    return null;
  }

  const handleCopyCode = async () => {
    if (copyStatus === 'success' || !base64Code || base64Code === "Error generating code.") {
      if (base64Code === "Error generating code." || !base64Code) {
        setCopyMessage("No code to copy or code generation failed.");
        setCopyStatus('error');
        addNotification("No code to copy or code generation failed.", "error");
      }
      return;
    }
    
    try {
      await navigator.clipboard.writeText(base64Code);
      setCopyMessage("Copied!");
      setCopyStatus('success');
      addNotification("Backup code copied to clipboard!", "success"); 
    } catch (err) {
      console.error('Failed to copy code: ', err);
      setCopyMessage("Failed to copy.");
      setCopyStatus('error');
      addNotification("Failed to copy code. Please try manual selection.", "error");
    }
  };
  
  const noData = portfolioEntries.length === 0;
  const isButtonDisabled = copyStatus === 'success'; // Disable only on success during message display

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="display-code-modal-title"
    >
      <div
        className="bg-[var(--bg-modal)] p-6 rounded-lg shadow-xl w-full max-w-lg text-[var(--text-primary)] max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="display-code-modal-title" className="text-xl font-semibold text-[var(--text-accent)]">
            Portfolio Backup Code
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors"
            aria-label="Close display code modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {noData ? (
             <p className="text-center text-[var(--text-secondary)] my-6">You have no portfolio data to generate a code from.</p>
        ) : (
            <>
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                Copy the code below and save it in a secure place. You can use this code later to restore your entire portfolio.
                </p>
                <textarea
                readOnly
                value={base64Code}
                className="w-full h-40 p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md text-[var(--text-primary)] outline-none resize-none font-mono text-xs"
                aria-label="Portfolio backup code"
                />
                <button
                    onClick={handleCopyCode}
                    disabled={isButtonDisabled}
                    className={`mt-3 w-full flex items-center justify-center font-semibold py-2.5 px-4 rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-modal)]
                      ${isButtonDisabled 
                        ? 'bg-[var(--toggle-inactive-bg)] text-[var(--text-muted)] cursor-not-allowed' 
                        : 'bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] ring-[var(--border-accent)]'
                      }`}
                >
                    <CopyIcon className="w-5 h-5 mr-2" />
                    Copy Code
                </button>
                <div className="mt-2 text-sm min-h-[1.5rem] flex items-center"> {/* Message container */}
                  {copyStatus === 'success' && copyMessage && (
                    <div className="flex items-center w-full">
                      <CheckIcon className="w-5 h-5 mr-1.5 text-[var(--price-high)] flex-shrink-0" />
                      <span className="text-[var(--price-high)]">{copyMessage}</span>
                    </div>
                  )}
                  {copyStatus === 'error' && copyMessage && (
                    <div className="flex items-center w-full">
                      <CrossIcon className="w-5 h-5 mr-1.5 text-[var(--price-low)] flex-shrink-0" />
                      <span className="text-[var(--price-low)]">{copyMessage}</span>
                    </div>
                  )}
                </div>
            </>
        )}

        <div className="mt-auto pt-4 text-right"> 
          <button
            type="button"
            onClick={onClose}
            className="bg-[var(--bg-tertiary)] hover:bg-[var(--bg-input-secondary)] text-[var(--text-secondary)] font-semibold py-2.5 px-5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-primary)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
