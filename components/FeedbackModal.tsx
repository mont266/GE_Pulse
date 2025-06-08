import React, { useState, useEffect, useRef } from 'react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type FeedbackType = 'feature' | 'bug' | 'general';
type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, addNotification }) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('feature');
  const [message, setMessage] = useState<string>('');
  // const [email, setEmail] = useState<string>(''); // Removed email state
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [submitMessage, setSubmitMessage] = useState<string>('');
  const formRef = useRef<HTMLFormElement>(null);

  // Removed the faulty useEffect that was here. The one below is the corrected version.

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
    };

    if (isOpen) {
        document.addEventListener('keydown', handleEsc);
        // Reset form state only when modal opens (isOpen becomes true)
        // and not currently submitting.
        // This effect will run when isOpen changes.
        if (submitStatus !== 'submitting') {
            setFeedbackType('feature');
            setMessage('');
            setSubmitStatus('idle');
            setSubmitMessage('');
        }
    }

    return () => {
        document.removeEventListener('keydown', handleEsc);
    };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [isOpen, onClose, setFeedbackType, setMessage, setSubmitStatus, setSubmitMessage]); // submitStatus (the value) is intentionally omitted from deps for THIS reset logic
// to prevent loops. The `submitStatus !== 'submitting'` check uses the current value.
// Setters are stable.


  const encode = (data: Record<string, string>) => {
    return Object.keys(data)
      .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
      .join("&");
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message.trim()) {
      setSubmitStatus('error');
      setSubmitMessage('Message cannot be empty.');
      return;
    }

    setSubmitStatus('submitting');
    setSubmitMessage('');

    const formData = {
      'form-name': 'feedback',
      'feedback-type': feedbackType,
      'message': message,
      // 'email': email, // Removed email from formData
      // Add honeypot field if you defined one in index.html, e.g., 'bot-field': ''
    };

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encode(formData),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setSubmitMessage('Thank you! Your feedback has been submitted.');
        addNotification('Feedback submitted successfully!', 'success');
        // Reset form fields after a short delay to show the message
        setTimeout(() => {
            setFeedbackType('feature');
            setMessage('');
            // setEmail(''); // Removed email reset
            setSubmitStatus('idle'); // Ready for another submission
            onClose(); // Optionally close modal on success
        }, 2000);
      } else {
        const errorText = await response.text();
        console.error("Netlify form submission error response:", errorText);
        setSubmitStatus('error');
        setSubmitMessage(`Submission failed. Server responded with ${response.status}. Please try again.`);
        addNotification('Feedback submission failed.', 'error');
      }
    } catch (error) {
      console.error('Netlify form submission error:', error);
      setSubmitStatus('error');
      setSubmitMessage('An error occurred during submission. Please check your connection and try again.');
      addNotification('Feedback submission error.', 'error');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div
        className="bg-[var(--bg-modal)] p-6 rounded-lg shadow-xl w-full max-w-lg text-[var(--text-primary)] max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="feedback-modal-title" className="text-2xl font-semibold text-[var(--text-accent)]">Submit Feedback</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[var(--icon-button-hover-bg)] transition-colors"
            aria-label="Close feedback modal"
            disabled={submitStatus === 'submitting'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--icon-button-default-text)] hover:text-[var(--icon-button-hover-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitStatus === 'success' && submitMessage && (
          <div className="mb-4 p-3 bg-[var(--notification-success-bg)] text-[var(--notification-text)] rounded-md text-center">
            {submitMessage}
          </div>
        )}
        {submitStatus === 'error' && submitMessage && (
            <div className="mb-4 p-3 bg-[var(--notification-error-bg)] text-[var(--notification-text)] rounded-md text-center">
                {submitMessage}
            </div>
        )}

        {submitStatus !== 'success' && (
          <form
            ref={formRef}
            name="feedback"
            method="POST"
            data-netlify="true"
            data-netlify-honeypot="bot-field" // Matches index.html
            onSubmit={handleSubmit}
            className="space-y-5 overflow-y-auto pr-2 flex-grow"
          >
            {/* Netlify hidden inputs */}
            <input type="hidden" name="form-name" value="feedback" />
            <p className="hidden"> {/* Honeypot field */}
              <label>
                Don’t fill this out if you're human: <input name="bot-field" />
              </label>
            </p>

            <div>
              <label htmlFor="feedback-type" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Feedback Type
              </label>
              <select
                id="feedback-type"
                name="feedback-type"
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
                className="w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none"
                disabled={submitStatus === 'submitting'}
                required
              >
                <option value="feature">Feature Request</option>
                <option value="bug">Bug Report</option>
                <option value="general">General Feedback</option>
              </select>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                placeholder="Please provide as much detail as possible..."
                disabled={submitStatus === 'submitting'}
                required
              />
            </div>

            {/* Removed Email Field
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Your Email (Optional)
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                placeholder="So we can contact you if needed"
                disabled={submitStatus === 'submitting'}
              />
            </div>
            */}
             <div className="pt-3 flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={submitStatus === 'submitting'}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-input-secondary)] text-[var(--text-secondary)] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-primary)] disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={submitStatus === 'submitting' || !message.trim()}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-[var(--bg-interactive)] hover:bg-[var(--bg-interactive-hover)] text-[var(--text-on-interactive)] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] disabled:opacity-50"
                >
                    {submitStatus === 'submitting' ? 'Submitting...' : 'Send Feedback'}
                </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] text-center pt-2">
                This form is powered by Netlify. Your feedback helps improve GE Pulse!
            </p>
          </form>
        )}
      </div>
    </div>
  );
};