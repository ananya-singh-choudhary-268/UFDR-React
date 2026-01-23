import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { STORAGE_KEYS } from '../constants';

const ChatContext = createContext();

/**
 * Generate a cryptographically random UUID.
 * Uses crypto.randomUUID() for secure generation.
 * @returns {string} UUID string
 */
const generateUUID = () => {
  // Use native crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Hook to access chat context
 * @returns {Object} Chat context value
 */
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

/**
 * ChatProvider - Manages chat sessions and messages
 */
export const ChatProvider = ({ children }) => {
  const [chats, setChats] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Load chats from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem(STORAGE_KEYS.CHATS);
    if (savedChats) {
      try {
        setChats(JSON.parse(savedChats));
      } catch (error) {
        console.error('Error loading chats from localStorage:', error);
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEYS.CHATS);
      }
    }
  }, []);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
    }
  }, [chats]);

  /**
   * Create a new chat session
   * @returns {string} New session ID
   */
  const createNewChat = useCallback(() => {
    const sessionId = generateUUID();
    const newChat = {
      sessionId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setChats((prev) => [newChat, ...prev]);
    setCurrentSessionId(sessionId);
    return sessionId;
  }, []);

  /**
   * Update chat title
   * @param {string} sessionId - Session to update
   * @param {string} title - New title
   */
  const updateChatTitle = useCallback((sessionId, title) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.sessionId === sessionId
          ? { ...chat, title, updatedAt: new Date().toISOString() }
          : chat
      )
    );
  }, []);

  /**
   * Add message to a chat
   * @param {string} sessionId - Target chat session
   * @param {Object} message - Message to add
   */
  const addMessageToChat = useCallback((sessionId, message) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.sessionId === sessionId
          ? {
              ...chat,
              messages: [...chat.messages, message],
              updatedAt: new Date().toISOString(),
            }
          : chat
      )
    );
  }, []);

  /**
   * Get current chat
   * @returns {Object|undefined} Current chat or undefined
   */
  const getCurrentChat = useCallback(() => {
    return chats.find((chat) => chat.sessionId === currentSessionId);
  }, [chats, currentSessionId]);

  /**
   * Get chat by session ID
   * @param {string} sessionId - Session ID to find
   * @returns {Object|undefined} Chat or undefined
   */
  const getChatBySessionId = useCallback(
    (sessionId) => {
      return chats.find((chat) => chat.sessionId === sessionId);
    },
    [chats]
  );

  /**
   * Delete a chat
   * @param {string} sessionId - Session to delete
   */
  const deleteChat = useCallback(
    (sessionId) => {
      setChats((prev) => prev.filter((chat) => chat.sessionId !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
    },
    [currentSessionId]
  );

  /**
   * Set current session
   * @param {string} sessionId - Session ID to set as current
   */
  const setSession = useCallback((sessionId) => {
    setCurrentSessionId(sessionId);
  }, []);

  const value = {
    chats,
    currentSessionId,
    createNewChat,
    updateChatTitle,
    addMessageToChat,
    getCurrentChat,
    getChatBySessionId,
    deleteChat,
    setSession,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

ChatProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
