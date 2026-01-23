import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import { CHAT_CONFIG } from '../constants';

/**
 * AI logo SVG component
 */
const AILogo = () => (
  <svg 
    className="h-6 w-6 text-white" 
    fill="none" 
    viewBox="0 0 48 48" 
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M6 6H42L36 24L42 42H6L12 24L6 6Z" fill="currentColor"></path>
  </svg>
);

/**
 * Markdown component configuration
 */
const markdownComponents = {
  h1: ({ children }) => <h1 className="text-xl font-bold text-white mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-semibold text-white mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold text-white mb-2">{children}</h3>,
  p: ({ children }) => <p className="text-gray-300 mb-2">{children}</p>,
  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-gray-300">{children}</ul>,
  li: ({ children }) => <li className="text-gray-300">{children}</li>,
  code: ({ children }) => <code className="bg-accent-dark px-2 py-1 rounded text-primary">{children}</code>,
};

/**
 * AIMessageWithTyping - Displays an AI response with typing animation
 */
const AIMessageWithTyping = ({ fullContent }) => {
  const [displayedContent, setDisplayedContent] = useState('');

  useEffect(() => {
    if (fullContent) {
      let i = 0;
      const intervalId = setInterval(() => {
        setDisplayedContent(fullContent.slice(0, i));
        i++;
        if (i > fullContent.length) {
          clearInterval(intervalId);
        }
      }, CHAT_CONFIG.TYPING_SPEED_MS);

      return () => clearInterval(intervalId);
    }
  }, [fullContent]);

  const isTyping = displayedContent && displayedContent.length < fullContent.length;

  return (
    <div className="flex items-start gap-4">
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary flex items-center justify-center">
        <AILogo />
      </div>
      <div className="flex-1 space-y-4">
        <p className="font-semibold text-primary">ForensicAnalyst AI</p>
        <div className="prose prose-invert prose-sm max-w-none text-gray-300">
          <ReactMarkdown components={markdownComponents}>
            {displayedContent}
          </ReactMarkdown>
          {isTyping && (
            <span 
              className="inline-block w-2 h-4 bg-primary animate-pulse ml-1"
              aria-label="Typing..."
            ></span>
          )}
        </div>
      </div>
    </div>
  );
};

AIMessageWithTyping.propTypes = {
  fullContent: PropTypes.string.isRequired,
};

export default AIMessageWithTyping;