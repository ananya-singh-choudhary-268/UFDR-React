import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import UserMessage from './UserMessage';
import AIMessage from './AIMessage';
import AIMessageWithTyping from './AIMessageWithTyping';
import { useChat } from '../context/ChatContext';
import { useUser } from '../context/UserContext';
import UploadUFDR from './UploadUFDR';
import UfdrExtractionOverlay from './UfdrExtractionOverlay';
import { sendAnalyticsQuery } from '../services/api';
import { PROMPT_CARDS, CHAT_CONFIG, UI_CONFIG } from '../constants';

/**
 * WelcomeScreen component - extracted to avoid duplication
 */
const WelcomeScreen = ({ userName, promptCards, onPromptClick, showPromptHandler }) => (
  <div className="flex-1 flex flex-col items-center justify-center">
    <div className="text-center w-full max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold text-white mb-4">
        Hi, {userName || 'User'}
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
        {promptCards.map((card, index) => (
          <button
            key={index}
            onClick={() => showPromptHandler && onPromptClick(card.title)}
            className="text-left p-4 rounded-lg bg-accent-dark hover:bg-accent-dark/70 transition-colors duration-200"
          >
            <p className="font-semibold text-gray-200">{card.title}</p>
            <p className="text-sm text-gray-400">{card.description}</p>
          </button>
        ))}
      </div>
    </div>
  </div>
);

WelcomeScreen.propTypes = {
  userName: PropTypes.string,
  promptCards: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
    })
  ).isRequired,
  onPromptClick: PropTypes.func,
  showPromptHandler: PropTypes.bool,
};

/**
 * UserAvatar component - handles profile picture with safe fallback
 */
const UserAvatar = ({ user, onClick }) => {
  const [imageError, setImageError] = useState(false);

  const getInitial = () => {
    return user?.name?.charAt(0).toUpperCase() || UI_CONFIG.DEFAULT_AVATAR_TEXT;
  };

  return (
    <button
      onClick={onClick}
      className="h-10 w-10 rounded-full bg-accent-dark flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-dark overflow-hidden"
      aria-label="User menu"
    >
      {user?.picture && !imageError ? (
        <img
          src={user.picture}
          alt={user.name || 'User'}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="font-semibold text-white">{getInitial()}</span>
      )}
    </button>
  );
};

UserAvatar.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    picture: PropTypes.string,
  }),
  onClick: PropTypes.func.isRequired,
};

/**
 * MainContent - Primary chat interface component
 */
const MainContent = ({ isChatView = false, sessionId = null }) => {
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const {
    currentSessionId,
    createNewChat,
    updateChatTitle,
    addMessageToChat,
    getChatBySessionId,
  } = useChat();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(
    sessionId || currentSessionId
  );
  const [showUploader, setShowUploader] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentUploadId, setCurrentUploadId] = useState(null);

  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Memoize getChatBySessionId to avoid dependency issues
  const getChatBySessionIdMemo = useCallback(
    (id) => getChatBySessionId(id),
    [getChatBySessionId]
  );

  // Sync activeSessionId with sessionId prop when it changes
  useEffect(() => {
    const newSessionId = sessionId || currentSessionId;
    const sessionChanged = newSessionId !== activeSessionId;

    setActiveSessionId(newSessionId);

    if (sessionChanged) {
      // Close uploader when switching sessions
      setShowUploader(false);

      if (!newSessionId) {
        // Clear messages when switching to a new chat (null sessionId)
        setMessages([]);
      } else {
        // Load messages from the new session
        const chat = getChatBySessionIdMemo(newSessionId);
        if (chat) {
          const messagesWithoutTyping = chat.messages.map((msg) => ({
            ...msg,
            isTyping: false,
          }));
          setMessages(messagesWithoutTyping);
        }
      }
    }
  }, [sessionId, currentSessionId, activeSessionId, getChatBySessionIdMemo]);

  const handleTextareaResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + 'px';
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // Create new session if none exists
    let sessionIdToUse = activeSessionId;
    const isFirstMessage = messages.length === 0;

    if (!sessionIdToUse) {
      sessionIdToUse = createNewChat();
      setActiveSessionId(sessionIdToUse);
      navigate(`/chat/${sessionIdToUse}`);
    }

    // 1. Add user message to the UI instantly
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    addMessageToChat(sessionIdToUse, userMessage);

    // Update chat title based on first message
    if (isFirstMessage) {
      const title =
        inputValue.length > CHAT_CONFIG.MAX_TITLE_LENGTH
          ? inputValue.substring(0, CHAT_CONFIG.MAX_TITLE_LENGTH) + '...'
          : inputValue;
      updateChatTitle(sessionIdToUse, title);
    }

    const currentQuery = inputValue;
    setInputValue('');
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const data = await sendAnalyticsQuery({
        query: currentQuery,
        sessionId: sessionIdToUse,
        email: user?.email,
      });

      if (data.status === 'success' && data.message) {
        const aiMessage = {
          id: Date.now() + 1,
          sender: 'ai',
          content: data.message,
          isTyping: true,
          timestamp: new Date().toISOString(),
        };

        setMessages((prevMessages) => [...prevMessages, aiMessage]);

        const aiMessageForStorage = { ...aiMessage, isTyping: false };
        addMessageToChat(sessionIdToUse, aiMessageForStorage);
      } else {
        const errorMessage = {
          id: Date.now() + 1,
          sender: 'ai',
          content:
            'I apologize, but I encountered an error while processing your request. Please try again.',
          isTyping: true,
          timestamp: new Date().toISOString(),
        };

        setMessages((prevMessages) => [...prevMessages, errorMessage]);

        const errorMessageForStorage = { ...errorMessage, isTyping: false };
        addMessageToChat(sessionIdToUse, errorMessageForStorage);
      }
    } catch (error) {
      console.error('Error fetching from API:', error);

      const errorResponse = {
        id: Date.now() + 1,
        sender: 'ai',
        content: `### Connection Error

Unable to reach the ForensicAnalyst API.

**Possible causes:**
- Backend server is not running
- Network connectivity issues

Please ensure the backend is running at the configured API endpoint and try again.`,
        isTyping: true,
        timestamp: new Date().toISOString(),
      };

      setMessages((prevMessages) => [...prevMessages, errorResponse]);

      const errorResponseForStorage = { ...errorResponse, isTyping: false };
      addMessageToChat(sessionIdToUse, errorResponseForStorage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handlePromptClick = (prompt) => {
    setInputValue(prompt);
  };

  const currentChat = activeSessionId
    ? getChatBySessionIdMemo(activeSessionId)
    : null;
  const chatTitle = currentChat ? currentChat.title : 'New Chat';

  return (
    <main className="flex flex-1 flex-col bg-surface-dark">
      {/* Top bar */}
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-800 px-6">
        {isChatView && (
          <h1 className="text-lg font-semibold text-white">{chatTitle}</h1>
        )}
        <div className="relative ml-auto" ref={dropdownRef}>
          <UserAvatar
            user={user}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          />
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-accent-dark shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none py-1 z-50">
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-surface-dark/50"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main area: chat view or welcome view */}
      {isChatView ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {messages.length === 0 ? (
            <WelcomeScreen
              userName={user?.name}
              promptCards={PROMPT_CARDS}
              onPromptClick={handlePromptClick}
              showPromptHandler={true}
            />
          ) : (
            messages.map((message) => {
              if (message.sender === 'user') {
                return (
                  <UserMessage key={message.id} message={message.content} />
                );
              } else {
                if (message.isTyping) {
                  return (
                    <AIMessageWithTyping
                      key={message.id}
                      fullContent={message.content}
                    />
                  );
                } else {
                  return (
                    <AIMessage key={message.id} message={message.content} />
                  );
                }
              }
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      ) : (
        <WelcomeScreen
          userName={user?.name}
          promptCards={PROMPT_CARDS}
          onPromptClick={handlePromptClick}
          showPromptHandler={false}
        />
      )}

      {/* Footer: upload + input bar */}
      <div className="border-t border-gray-800 bg-surface-dark p-6">
        {/* UFDR uploader panel (like ChatGPT attachment UI) */}
        {isChatView && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setShowUploader((prev) => !prev)}
              className="mb-2 inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-accent-dark px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-accent-dark/80 transition-colors"
              aria-expanded={showUploader}
            >
              <span>📎</span>
              <span>
                {showUploader ? 'Hide UFDR upload' : 'Upload UFDR report'}
              </span>
            </button>

            {showUploader && (
              <div className="rounded-lg border border-gray-700 bg-accent-dark/60 p-3">
                <p className="mb-2 text-xs text-gray-400">
                  Attach a UFDR file for analysis. Large files are uploaded via
                  MinIO; you can continue chatting while it processes.
                </p>
                <UploadUFDR
                  onExtractionStart={(uploadId) => {
                    console.log('UFDR extraction started for upload:', uploadId);
                    setCurrentUploadId(uploadId);
                    setIsExtracting(true);
                    setShowUploader(false);
                  }}
                  onExtractionComplete={() => {
                    console.log('UFDR extraction completed from uploader');
                    setIsExtracting(false);
                    setCurrentUploadId(null);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Chat input */}
        <form onSubmit={handleSendMessage}>
          <div className="relative flex items-center">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onInput={handleTextareaResize}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              className="w-full resize-none rounded-lg bg-accent-dark border-gray-700 py-3 pl-4 pr-14 text-white placeholder-gray-500 focus:border-primary focus:ring-primary"
              placeholder={
                isChatView
                  ? 'Ask a follow-up question...'
                  : 'Ask a question or type a command...'
              }
              rows="1"
              disabled={isLoading}
              aria-label="Message input"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="absolute right-2.5 flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white transition-colors hover:bg-primary/90 disabled:bg-primary/50"
              aria-label="Send message"
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <span className="material-symbols-outlined">send</span>
              )}
            </button>
          </div>
        </form>

        <p className="mt-2 text-center text-xs text-gray-500">
          ForensicAnalyst AI can make mistakes. Consider checking important
          information.
        </p>
      </div>

      {/* UFDR Extraction Overlay */}
      <UfdrExtractionOverlay
        isExtracting={isExtracting}
        uploadId={currentUploadId}
        onComplete={(data) => {
          setIsExtracting(false);
          setCurrentUploadId(null);
          console.log('UFDR extraction completed!', data);

          if (data?.overall_status === 'completed') {
            console.log('✓ All data extracted successfully');
          }
        }}
      />
    </main>
  );
};

MainContent.propTypes = {
  isChatView: PropTypes.bool,
  sessionId: PropTypes.string,
};

export default MainContent;
