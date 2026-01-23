import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';
import { getExtractionStatus } from '../services/api';
import { CHAT_CONFIG } from '../constants';

/**
 * UfdrExtractionOverlay - Displays a loading overlay while UFDR data is being extracted
 */
const UfdrExtractionOverlay = ({ isExtracting, uploadId, onComplete }) => {
  useEffect(() => {
    if (!isExtracting || !uploadId) return;

    console.log('Starting extraction status polling for upload:', uploadId);

    // Poll the backend to check extraction status
    const pollInterval = setInterval(async () => {
      try {
        const data = await getExtractionStatus(uploadId);
        console.log('Extraction status:', data);

        // Check if all extractions are complete
        if (data.overall_status === 'completed') {
          console.log('✓ All extractions complete!');
          clearInterval(pollInterval);
          onComplete?.(data);
        } else if (data.overall_status === 'failed') {
          console.error('Extraction failed:', data.error_message);
          clearInterval(pollInterval);
          onComplete?.(data);
        }
      } catch (error) {
        console.error('Error checking extraction status:', error);
      }
    }, CHAT_CONFIG.EXTRACTION_POLL_INTERVAL_MS);

    return () => {
      console.log('Stopping extraction status polling');
      clearInterval(pollInterval);
    };
  }, [isExtracting, uploadId, onComplete]);

  if (!isExtracting) return null;

  return (
    <div 
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Extracting UFDR data"
    >
      <div className="flex flex-col items-center justify-center gap-6">
        {/* Custom Loading Spinner with Gradient */}
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 rounded-full">
            <div className="h-full w-full animate-spin rounded-full border-4 border-transparent bg-gradient-to-r from-[#6A11CB] to-[#FC5C7D] bg-clip-border">
              <div className="h-full w-full rounded-full bg-black"></div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" aria-hidden="true" />
          </div>
        </div>

        {/* Loading Text */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-white text-base text-center max-w-xs font-semibold">
            Extracting data from UFDR...
          </p>
          <p className="text-gray-400 text-sm text-center max-w-xs">
            Building databases. Please wait.
          </p>
        </div>

        {/* Animated Dots */}
        <div className="flex gap-1" aria-hidden="true">
          <div className="h-2 w-2 rounded-full bg-[#6A11CB] animate-pulse"></div>
          <div className="h-2 w-2 rounded-full bg-[#A076F9] animate-pulse delay-75"></div>
          <div className="h-2 w-2 rounded-full bg-[#FC5C7D] animate-pulse delay-150"></div>
        </div>
      </div>
    </div>
  );
};

UfdrExtractionOverlay.propTypes = {
  isExtracting: PropTypes.bool.isRequired,
  uploadId: PropTypes.string,
  onComplete: PropTypes.func,
};

export default UfdrExtractionOverlay;
