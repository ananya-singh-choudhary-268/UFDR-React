/**
 * Application constants and configuration.
 * Centralizes all magic strings and configuration values.
 */

// =============================================================================
// API Configuration
// =============================================================================

/**
 * Base URL for API calls.
 * Uses REACT_APP_API_URL environment variable if set, otherwise empty string
 * which works with Create React App's proxy configuration.
 */
export const API_BASE_URL = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/$/, '')
  : '';

// =============================================================================
// Local Storage Keys
// =============================================================================

export const STORAGE_KEYS = {
  USER: 'forensicAnalystUser',
  CHATS: 'forensicAnalystChats',
};

// =============================================================================
// Chat Configuration
// =============================================================================

export const CHAT_CONFIG = {
  /** Maximum length for chat title before truncation */
  MAX_TITLE_LENGTH: 30,
  /** Typing animation speed in milliseconds */
  TYPING_SPEED_MS: 20,
  /** Polling interval for extraction status in milliseconds */
  EXTRACTION_POLL_INTERVAL_MS: 2000,
};

// =============================================================================
// UI Configuration
// =============================================================================

export const UI_CONFIG = {
  /** Default avatar initials when user has no profile picture */
  DEFAULT_AVATAR_TEXT: 'U',
};

// =============================================================================
// Prompt Cards (Example Queries)
// =============================================================================

export const PROMPT_CARDS = [
  {
    title: "Summarize call logs for user 'John Doe'",
    description: 'Get a quick overview of all incoming and outgoing calls.',
  },
  {
    title: 'Find all locations visited on October 9th',
    description: 'Pinpoint geographic data for a specific date.',
  },
  {
    title: 'Identify all social media applications',
    description: 'List all installed and used social media apps.',
  },
  {
    title: 'Recover deleted images from gallery',
    description: 'Attempt to restore image files marked for deletion.',
  },
];
