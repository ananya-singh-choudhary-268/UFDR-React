import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import ResultCard from './ResultCard';

/**
 * AI logo SVG component for reuse
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
 * Markdown component configuration for consistent styling
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
 * AIMessage - Displays an AI response message
 */
const AIMessage = ({ message, resultCards }) => {
  return (
    <div className="flex items-start gap-4">
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary flex items-center justify-center">
        <AILogo />
      </div>
      <div className="flex-1 space-y-4">
        <p className="font-semibold text-primary">ForensicAnalyst AI</p>
        <div className="prose prose-invert prose-sm max-w-none text-gray-300">
          <ReactMarkdown components={markdownComponents}>
            {message}
          </ReactMarkdown>

          {resultCards && resultCards.map((card, index) => (
            <ResultCard
              key={index}
              title={card.title}
              description={card.description}
              attachment={card.attachment}
              listItems={card.listItems}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

AIMessage.propTypes = {
  message: PropTypes.string.isRequired,
  resultCards: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string,
      description: PropTypes.string,
      attachment: PropTypes.string,
      listItems: PropTypes.arrayOf(PropTypes.string),
    })
  ),
};

export default AIMessage;