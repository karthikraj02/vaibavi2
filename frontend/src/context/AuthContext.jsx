import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      setUser(JSON.parse(userInfo));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await axios.post(`${API}/api/auth/login`, { email, password });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Login failed';
    }
  };

  const register = async (name, email, password, otp) => {
    try {
      const { data } = await axios.post(`${API}/api/auth/register`, { name, email, password, otp });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Registration failed';
    }
  };

  const sendRegistrationOtp = async (email) => {
    try {
      const { data } = await axios.post(`${API}/api/auth/send-otp`, { email });
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to send OTP';
    }
  };

  const loginWithGoogle = async (payload) => {
    try {
      const body = typeof payload === 'string'
        ? { credential: payload }
        : payload.credential
          ? { credential: payload.credential }
          : { name: payload.name, email: payload.email };
      const { data } = await axios.post(`${API}/api/auth/google`, body);
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Google authentication failed';
    }
  };

  const getAuthHeaders = () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');
    return userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {};
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userInfo');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithGoogle, logout, loading, sendRegistrationOtp, getAuthHeaders }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};