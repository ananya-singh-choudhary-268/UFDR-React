import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ChatProvider } from './context/ChatContext';
import { UserProvider, useUser } from './context/UserContext';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import ChatLayout from './components/ChatLayout';
import AppLayout from './components/AppLayout';
import NewChatLayout from './components/NewChatLayout';

// Google OAuth Client ID from environment
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// Log warning if Google OAuth is not configured
if (!GOOGLE_CLIENT_ID) {
  console.warn(
    'REACT_APP_GOOGLE_CLIENT_ID is not set. Google OAuth will not work. ' +
    'Please set this environment variable in your .env file.'
  );
}

/**
 * ProtectedRoute - Wrapper that redirects to login if not authenticated
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useUser();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

/**
 * AppRoutes - Main routing configuration
 */
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/landing"
        element={
          <ProtectedRoute>
            <LandingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:sessionId"
        element={
          <ProtectedRoute>
            <ChatLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/new-chat"
        element={
          <ProtectedRoute>
            <NewChatLayout />
          </ProtectedRoute>
        }
      />
      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

/**
 * App - Root application component
 */
function App() {
  // Render with OAuth provider if client ID is available, otherwise without
  const content = (
    <UserProvider>
      <ChatProvider>
        <BrowserRouter>
          <div className="dark">
            <AppRoutes />
          </div>
        </BrowserRouter>
      </ChatProvider>
    </UserProvider>
  );

  // Wrap with GoogleOAuthProvider only if client ID is configured
  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        {content}
      </GoogleOAuthProvider>
    );
  }

  // Render without OAuth provider if not configured
  // Login will still work but Google OAuth button won't
  return content;
}

export default App;
