import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { getClientSession, clearClientSession } from '@/lib/clientSession';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: appParams.token,
        interceptResponses: true
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        setIsLoadingPublicSettings(false);
        await checkUserAuth();
      } catch (appError) {
        console.error('App state check failed:', appError);
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
            const reason = appError.data.extra_data.reason;
            if (reason === 'auth_required') {
              // Don't give up — try client session fallback first
              setIsLoadingPublicSettings(false);
              await checkUserAuth();
              // Only set auth_required error if client session also failed
              // (checkUserAuth sets isLoadingAuth/authChecked/authError itself)
              return;
            } else if (reason === 'user_not_registered') {
              setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
            } else {
              setAuthError({ type: reason, message: appError.message });
            }
          } else {
            setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
          }
          setIsLoadingPublicSettings(false);
          setIsLoadingAuth(false);
          setAuthChecked(true);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      // Fall back to client session (username+code login) if Base44 auth fails
      let clientSession = getClientSession();
      // Stale sessions saved before invite_token existed can't authorize backend
      // calls — clear them so the user signs in again and gets a complete session.
      if (clientSession && !clientSession.invite_token) {
        clearClientSession();
        clientSession = null;
      }
      if (clientSession) {
        setUser(clientSession);
        setIsAuthenticated(true);
      } else {
        console.error('User auth check failed:', error);
        setIsAuthenticated(false);
        // Only set auth_required if not already set from a previous check
        if ((error.status === 401 || error.status === 403) && !authError) {
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
        }
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  // Call this after updateMe() to sync the context user with latest data
  const refreshUser = async () => {
    const currentUser = await base44.auth.me().catch(() => null);
    if (currentUser) setUser(currentUser);
    return currentUser;
  };

  const logout = (shouldRedirect = true) => {
    clearClientSession();
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecked(false);
    if (shouldRedirect) {
      base44.auth.logout("/");
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authChecked,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      checkUserAuth,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};