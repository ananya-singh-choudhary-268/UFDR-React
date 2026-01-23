import { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';

/**
 * Sidebar - Navigation sidebar with chat history
 */
const Sidebar = ({ activeSessionId }) => {
  const navigate = useNavigate();
  const { chats, createNewChat, deleteChat, setSession } = useChat();
  const [hoveredChatId, setHoveredChatId] = useState(null);

  const handleLogoClick = () => {
    navigate('/landing');
  };

  const handleNewChat = () => {
    const sessionId = createNewChat();
    setSession(sessionId);
    navigate(`/chat/${sessionId}`);
  };

  const handleChatClick = (sessionId) => {
    setSession(sessionId);
    navigate(`/chat/${sessionId}`);
  };

  const handleDeleteChat = (e, sessionId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat?')) {
      deleteChat(sessionId);
      if (activeSessionId === sessionId) {
        navigate('/new-chat');
      }
    }
  };

  return (
    <aside className="w-72 flex-shrink-0 bg-background-dark p-4 flex flex-col justify-between border-r border-gray-800">
      <div>
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-3 px-3 py-2 hover:bg-surface-dark/30 rounded-lg transition-colors w-full text-left"
          aria-label="Go to home"
        >
          <svg 
            className="h-6 w-6 text-primary" 
            fill="none" 
            viewBox="0 0 48 48" 
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M6 6H42L36 24L42 42H6L12 24L6 6Z" fill="currentColor"></path>
          </svg>
          <h2 className="text-xl font-bold text-white">ForensicAnalyst AI</h2>
        </button>
        <div className="mt-8">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-base font-semibold text-white transition-all hover:bg-primary/90"
            aria-label="Start a new chat"
          >
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
            New Chat
          </button>
        </div>
        <nav className="mt-8 space-y-2" aria-label="Chat history">
          <h3 className="px-3 text-xs font-semibold uppercase text-gray-500">
            Recent Chats
          </h3>
          {chats.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500 italic">No chats yet</p>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.sessionId}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-colors ${
                  activeSessionId === chat.sessionId
                    ? 'bg-surface-dark text-white'
                    : 'text-gray-400 hover:bg-surface-dark/50'
                }`}
                onClick={() => handleChatClick(chat.sessionId)}
                onMouseEnter={() => setHoveredChatId(chat.sessionId)}
                onMouseLeave={() => setHoveredChatId(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleChatClick(chat.sessionId);
                  }
                }}
                aria-current={activeSessionId === chat.sessionId ? 'page' : undefined}
              >
                <span className="truncate flex-1">{chat.title}</span>
                {hoveredChatId === chat.sessionId && (
                  <button
                    onClick={(e) => handleDeleteChat(e, chat.sessionId)}
                    className="material-symbols-outlined text-gray-500 text-base hover:text-red-400 transition-colors"
                    title="Delete chat"
                    aria-label={`Delete chat: ${chat.title}`}
                  >
                    delete
                  </button>
                )}
              </div>
            ))
          )}
        </nav>
      </div>
      <div className="border-t border-gray-800 pt-4">
      </div>
    </aside>
  );
};

Sidebar.propTypes = {
  activeSessionId: PropTypes.string,
};

export default Sidebar;