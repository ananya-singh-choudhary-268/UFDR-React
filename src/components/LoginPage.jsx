import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useUser } from '../context/UserContext';

/**
 * LoginPage - User authentication page with Google OAuth
 */
const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useUser();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/landing');
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleSuccess = (credentialResponse) => {
    try {
      // Decode the JWT token to get user info
      const decoded = jwtDecode(credentialResponse.credential);

      const userData = {
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        sub: decoded.sub, // Google user ID
      };

      console.log('Google login successful');
      login(userData);
      navigate('/landing');
    } catch (error) {
      console.error('Error decoding Google token:', error);
    }
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
    alert('Google login failed. Please check your Google OAuth configuration. See .env.example for setup instructions.');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // Email/password login will be implemented in a future version
    console.log('Email login - Coming soon');
  };

  // Check if Google OAuth is configured
  const isGoogleOAuthConfigured = !!process.env.REACT_APP_GOOGLE_CLIENT_ID;

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="bg-surface-dark/50 dark:bg-surface-dark/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-white/5">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Login</h1>
            <p className="mt-2 text-muted-dark">Sign in to access your account</p>
          </div>
          
          <div className="mt-8 space-y-4 flex justify-center">
            {isGoogleOAuthConfigured ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="filled_black"
                size="large"
                text="continue_with"
                shape="rectangular"
              />
            ) : (
              <div className="text-center p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  Google OAuth is not configured. Please set REACT_APP_GOOGLE_CLIENT_ID in your .env file.
                </p>
              </div>
            )}
          </div>
          
          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="mx-4 text-sm text-muted-dark">Or</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>
          
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="sr-only" htmlFor="email">Email or username</label>
              <input 
                className="form-input w-full rounded-lg bg-white/10 dark:bg-white/10 border-none focus:ring-2 focus:ring-primary placeholder-muted-dark text-white p-4" 
                id="email" 
                name="email" 
                placeholder="Email or username" 
                type="text"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="password">Password</label>
              <input 
                className="form-input w-full rounded-lg bg-white/10 dark:bg-white/10 border-none focus:ring-2 focus:ring-primary placeholder-muted-dark text-white p-4" 
                id="password" 
                name="password" 
                placeholder="Password" 
                type="password"
                autoComplete="current-password"
              />
            </div>
            <button 
              className="w-full py-3 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-base transition-colors duration-300 shadow-lg shadow-primary/20 disabled:opacity-50" 
              type="submit"
              disabled
              title="Email login coming soon"
            >
              Login
            </button>
            <p className="text-center text-xs text-gray-500">
              Email/password login coming soon. Please use Google Sign-In.
            </p>
          </form>
          
          <div className="mt-6 flex justify-between items-center text-sm">
            <button
              type="button"
              className="font-medium text-muted-dark hover:text-white transition-colors duration-300"
              onClick={() => console.log('Forgot password - Coming soon')}
            >
              Forgot password?
            </button>
            <button
              type="button"
              className="font-medium text-muted-dark hover:text-white transition-colors duration-300"
              onClick={() => console.log('Sign up - Coming soon')}
            >
              Need an account? <span className="font-bold text-white">Sign up</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;