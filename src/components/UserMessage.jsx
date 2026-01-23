import PropTypes from 'prop-types';
import { useUser } from '../context/UserContext';

/**
 * UserMessage - Displays a user's message in the chat
 */
const UserMessage = ({ message, timestamp }) => {
  const { user } = useUser();
  
  // Get user initials for avatar
  const getInitials = () => {
    if (user?.name) {
      const names = user.name.split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
      }
      return user.name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="flex items-start gap-4">
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-accent-dark flex items-center justify-center">
        {user?.picture ? (
          <img 
            src={user.picture} 
            alt={user.name || 'User'} 
            className="h-full w-full rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="font-semibold text-white">{getInitials()}</span>
        )}
      </div>
      <div className="flex-1 rounded-lg bg-accent-dark p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-white">{user?.name || 'User'}</p>
          {timestamp && (
            <span className="text-xs text-gray-500">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className="text-gray-300">
          {message}
        </p>
      </div>
    </div>
  );
};

UserMessage.propTypes = {
  message: PropTypes.string.isRequired,
  timestamp: PropTypes.string,
};

export default UserMessage;