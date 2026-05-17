import React, { useContext } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';

const GoogleSignInButton = ({ onSuccess, onError }) => {
  const { loginWithGoogle } = useContext(AuthContext);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <p className="text-xs text-amber-400 text-center">
        Set VITE_GOOGLE_CLIENT_ID for Google sign-in
      </p>
    );
  }

  return (
    <GoogleLogin
      onSuccess={async (response) => {
        try {
          await loginWithGoogle(response.credential);
          onSuccess?.();
        } catch (err) {
          onError?.(err);
        }
      }}
      onError={() => onError?.('Google sign-in failed')}
      theme="filled_black"
      size="large"
      width="100%"
      text="signin_with"
    />
  );
};

export default GoogleSignInButton;
