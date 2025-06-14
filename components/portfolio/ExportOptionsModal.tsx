
import React, { useEffect } from 'react';
import { PortfolioEntry } from '../../src/types';
import { DownloadIcon, CodeIcon } from '../Icons'; // Assuming CodeIcon exists or will be added

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioEntries: PortfolioEntry[];
  onShowCodeModalRequest: () => void;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ExportOptionsModal: React.FC<ExportOptionsModalProps> = ({
  isOpen,
  onClose,
  portfolioEntries,
  onShowCodeModalRequest,
  addNotification,
}) => {
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

  const handleDownloadJson = () => {
    if (portfolioEntries.length === 0) {
      addNotification("No portfolio data to export.", "info");
      return;
    }
    try {
      const jsonString = JSON.stringify(portfolioEntries, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "gepulse_portfolio_backup.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addNotification("Portfolio exported to JSON file successfully!", "success");
      onClose();
    } catch (error) {
      console.error("Error exporting portfolio to JSON:", error);
      addNotification("Failed to export portfolio as JSON.", "error");
    }
  };

  const handleShowCopyableCode = () => {
    if (portfolioEntries.length === 0) {
      addNotification("No portfolio data to export.", "info");
      return;
    }
    onShowCodeModalRequest();
    onClose(); // Close this modal, PortfolioModal will open DisplayCodeModal
  };

  const noData = portfolioEntries.length === 0;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[85] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-options-modal-title"
    >
      <div
        className="bg-[var(--bg-modal)] p-6 rounded-lg shadow-xl w-full max-w-sm text-[var(--text-primary)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="export-options-modal-title" className="text-xl font-semibold text-[var(--text-accent)]">
            Export Portfolio Data
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors"
            aria-label="Close export options"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {noData ? (
            <p className="text-center text-[var(--text-secondary)] mb-6">You have no portfolio data to export.</p>
        ) : (
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Choose your preferred export method. Keep your backup safe!
            </p>
        )}

        <div className="space-y-3">
          <button
            onClick={handleDownloadJson}
            disabled={noData}
            className="w-full flex items-center justify-center bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <DownloadIcon className="w-5 h-5 mr-2" />
            Download JSON File
          </button>
          <button
            onClick={handleShowCopyableCode}
            disabled={noData}
            className="w-full flex items-center justify-center bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <CodeIcon className="w-5 h-5 mr-2" />
            Get Copyable Code
          </button>
        </div>

        <div className="mt-6 text-right">
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
