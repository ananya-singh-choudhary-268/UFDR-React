/**
 * API Service Layer
 * 
 * Centralizes all API calls to the backend.
 * Uses environment-based URL configuration.
 */

import { API_BASE_URL } from '../constants';

/**
 * Build full API URL from a path.
 * @param {string} path - API endpoint path (e.g., '/api/analytics')
 * @returns {string} Full URL
 */
function apiUrl(path) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

/**
 * Generic fetch wrapper with error handling.
 * @param {string} path - API endpoint path
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
async function fetchApi(path, options = {}) {
  const url = apiUrl(path);
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response;
}

// =============================================================================
// Analytics API
// =============================================================================

/**
 * Send an analytics query to the AI agent.
 * @param {Object} params - Query parameters
 * @param {string} params.query - User's query
 * @param {string} params.sessionId - Session identifier
 * @param {string} [params.email] - User's email
 * @returns {Promise<Object>} API response
 */
export async function sendAnalyticsQuery({ query, sessionId, email }) {
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  const response = await fetchApi('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({
      query,
      current_timestamp: timestamp,
      session_id: sessionId,
      email_id: email || 'anonymous@example.com',
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// Upload API
// =============================================================================

/**
 * Initialize a UFDR file upload.
 * @param {Object} params - Upload parameters
 * @param {string} params.filename - Name of the file
 * @param {number} params.size - Size of the file in bytes
 * @param {string} [params.sessionId] - Session identifier
 * @returns {Promise<Object>} Init response with upload_id and parts
 */
export async function initUpload({ filename, size, sessionId = 'web-session' }) {
  const response = await fetchApi('/api/uploads/init', {
    method: 'POST',
    body: JSON.stringify({
      filename,
      size,
      session_id: sessionId,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Upload init failed (${response.status}): ${text}`);
  }

  return JSON.parse(text || '{}');
}

/**
 * Complete a multipart upload.
 * @param {string} uploadId - Upload identifier
 * @param {Array<{part_number: number, etag: string}>} parts - Uploaded parts info
 * @returns {Promise<Object>} Completion response
 */
export async function completeUpload(uploadId, parts) {
  const response = await fetchApi(`/api/uploads/${uploadId}/complete`, {
    method: 'PUT',
    body: JSON.stringify({ parts }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Upload complete failed (${response.status}): ${text}`);
  }

  return JSON.parse(text || '{}');
}

/**
 * Get ingest progress for an upload.
 * @param {string} uploadId - Upload identifier
 * @returns {Promise<Object>} Progress data
 */
export async function getIngestProgress(uploadId) {
  const response = await fetchApi(`/api/uploads/${uploadId}/ingest-progress`);
  
  if (!response.ok) {
    throw new Error(`Failed to get ingest progress: ${response.status}`);
  }

  return response.json();
}

/**
 * Get extraction status for an upload.
 * @param {string} uploadId - Upload identifier
 * @returns {Promise<Object>} Extraction status
 */
export async function getExtractionStatus(uploadId) {
  const response = await fetchApi(`/api/uploads/${uploadId}/extraction-status`);
  
  if (!response.ok) {
    throw new Error(`Failed to get extraction status: ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// Health API
// =============================================================================

/**
 * Check if the backend API is healthy.
 * @returns {Promise<boolean>} True if healthy
 */
export async function checkHealth() {
  try {
    const response = await fetchApi('/health');
    return response.ok;
  } catch {
    return false;
  }
}
