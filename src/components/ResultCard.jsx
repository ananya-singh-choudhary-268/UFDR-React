import PropTypes from 'prop-types';

/**
 * ResultCard - Displays a structured result card within AI messages
 */
const ResultCard = ({ title, description, attachment, listItems }) => {
  return (
    <div className="mt-4 p-4 bg-accent-dark/50 rounded-lg border border-gray-700">
      {title && (
        <h4 className="text-white font-semibold mb-2">{title}</h4>
      )}
      {description && (
        <p className="text-gray-300 text-sm mb-2">{description}</p>
      )}
      {attachment && (
        <div className="mb-2">
          <a
            href={attachment}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 text-sm underline"
          >
            View Attachment
          </a>
        </div>
      )}
      {listItems && listItems.length > 0 && (
        <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
          {listItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

ResultCard.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  attachment: PropTypes.string,
  listItems: PropTypes.arrayOf(PropTypes.string),
};

export default ResultCard;