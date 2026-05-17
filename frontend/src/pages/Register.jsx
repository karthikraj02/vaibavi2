import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User } from 'lucide-react';

const Register = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const { register, loginWithGoogle, sendRegistrationOtp } = useContext(AuthContext);
  const navigate = useNavigate();

  // If used as a route component, isOpen will be undefined, so default to true.
  const isModalOpen = isOpen !== undefined ? isOpen : true;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setOtpLoading(true);
    try {
      const data = await sendRegistrationOtp(email);
      if (data.otp) {
        setDemoOtp(data.otp);
      }
      setStep(2);
    } catch (err) {
      setError(err);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    setError('');
    setOtpLoading(true);
    try {
      await register(name, email, password, otp);
      if (onClose) onClose();
      navigate('/');
    } catch (err) {
      setError(err);
    } finally {
      setOtpLoading(false);
    }
  };

  // Listen to message events from Google and Apple oauth popups
  useEffect(() => {
    const handleAuthMessage = async (event) => {
      if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        const { name, email } = event.data;
        try {
          await loginWithGoogle(name, email);
          if (onClose) onClose();
          navigate('/');
        } catch (err) {
          setError(err);
        }
      }
      if (event.data && event.data.type === 'APPLE_AUTH_SUCCESS') {
        const { name, email } = event.data;
        try {
          await loginWithGoogle(name, email);
          if (onClose) onClose();
          navigate('/');
        } catch (err) {
          setError(err);
        }
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [loginWithGoogle, onClose, navigate]);

  if (!isModalOpen) return null;

  const handleGoogleSignIn = () => {
    const width = 500;
    const height = 620;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open('', 'GoogleSignIn', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`);
    
    popup.document.write(`
      <html>
        <head>
          <title>Sign in - Google Accounts</title>
          <style>
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #131314;
              color: #e3e3e3;
              margin: 0;
              padding: 24px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .card {
              background-color: #1b1b1f;
              width: 100%;
              max-width: 440px;
              border-radius: 28px;
              padding: 36px 36px 28px 36px;
              display: flex;
              flex-direction: column;
            }
            .brand-header {
              display: flex;
              align-items: center;
              margin-bottom: 28px;
            }
            .brand-text {
              font-size: 15px;
              font-weight: 500;
              color: #e3e3e3;
              display: flex;
              align-items: center;
            }
            .app-section {
              display: flex;
              align-items: center;
              gap: 16px;
              margin-bottom: 32px;
            }
            .app-logo {
              width: 48px;
              height: 48px;
              border-radius: 50%;
              background-color: #2b2b2f;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 1px solid #444746;
            }
            .title-area {
              display: flex;
              flex-direction: column;
            }
            h1 {
              font-size: 28px;
              font-weight: 400;
              margin: 0;
              color: #e3e3e3;
              letter-spacing: -0.5px;
            }
            .subtitle {
              font-size: 15px;
              color: #c4c7c5;
              margin: 4px 0 0 0;
            }
            .account-list {
              display: flex;
              flex-direction: column;
              margin-bottom: 12px;
            }
            .account-row {
              display: flex;
              align-items: center;
              padding: 14px 12px;
              cursor: pointer;
              border-radius: 12px;
              transition: background-color 0.15s ease;
              margin: 0 -12px;
            }
            .account-row:hover {
              background-color: #2d2e30;
            }
            .avatar {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              margin-right: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 16px;
            }
            .avatar-initial {
              background: linear-gradient(135deg, #0f5132, #1b4d3e);
              color: #d1e7dd;
            }
            .avatar-icon {
              background-color: #2d2e30;
              color: #c4c7c5;
              border: 1px solid #444746;
            }
            .info {
              display: flex;
              flex-direction: column;
              flex-grow: 1;
            }
            .name {
              font-size: 14px;
              font-weight: 500;
              color: #e3e3e3;
            }
            .email {
              font-size: 12px;
              color: #c4c7c5;
              margin-top: 2px;
            }
            .divider {
              height: 1px;
              background-color: #444746;
              margin: 0;
              width: 100%;
            }
            .privacy-notice {
              font-size: 12px;
              color: #c4c7c5;
              line-height: 1.5;
              margin-top: 24px;
            }
            .privacy-notice a {
              color: #a8c7fa;
              text-decoration: none;
            }
            .privacy-notice a:hover {
              text-decoration: underline;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              width: 100%;
              max-width: 440px;
              margin-top: 16px;
              padding: 0 12px;
              font-size: 12px;
              color: #c4c7c5;
            }
            .footer-links {
              display: flex;
              gap: 16px;
            }
            .footer a {
              color: #c4c7c5;
              text-decoration: none;
            }
            .footer a:hover {
              color: #e3e3e3;
            }
            .custom-box {
              padding: 16px;
              background-color: #202124;
              border-radius: 12px;
              display: none;
              flex-direction: column;
              gap: 12px;
              margin-top: 8px;
              border: 1px solid #444746;
            }
            .input-field {
              padding: 10px 12px;
              border: 1px solid #444746;
              border-radius: 6px;
              font-size: 13px;
              outline: none;
              background-color: #131314;
              color: #e3e3e3;
            }
            .input-field:focus {
              border-color: #a8c7fa;
            }
            .submit-btn {
              background-color: #a8c7fa;
              color: #062e6f;
              border: none;
              padding: 10px;
              border-radius: 6px;
              font-weight: 500;
              cursor: pointer;
              font-size: 13px;
              transition: background-color 0.15s ease;
            }
            .submit-btn:hover {
              background-color: #c2e7ff;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand-header">
              <span class="brand-text">
                <svg width="18" height="18" viewBox="0 0 24 24" style="margin-right: 8px; vertical-align: middle;">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </span>
            </div>
            
            <div class="app-section">
              <div class="app-logo">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a8c7fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.9-.2-1.9.1-2.4.9l-.5.7 8.3 3.6-4.6 4.6-2.5-.8c-.6-.2-1.2 0-1.5.5l-.3.4 3.2 1.6 1.6 3.2.4-.3c.5-.3.7-.9.5-1.5l-.8-2.5 4.6-4.6 3.6 8.3.7-.5c.8-.5 1.1-1.5.9-2.4z"/>
                </svg>
              </div>
              <div class="title-area">
                <h1>Choose an account</h1>
                <p class="subtitle">to continue to FlightAgent</p>
              </div>
            </div>
            
            <div class="account-list">
              <div class="account-row" onclick="selectAccount('Karthik Raj', 'karthikraj9000@gmail.com')">
                <div class="avatar avatar-initial">K</div>
                <div class="info">
                  <span class="name">Karthik Raj</span>
                  <span class="email">karthikraj9000@gmail.com</span>
                </div>
              </div>
              
              <div class="divider"></div>
              
              <div class="account-row" onclick="selectAccount('Guest User', 'guest@gmail.com')">
                <div class="avatar" style="background: linear-gradient(135deg, #e91e63, #ad1457); color: #fce4ec;">G</div>
                <div class="info">
                  <span class="name">Guest User</span>
                  <span class="email">guest@gmail.com</span>
                </div>
              </div>
              
              <div class="divider"></div>
              
              <div class="account-row" onclick="toggleCustomForm()">
                <div class="avatar avatar-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div class="info">
                  <span class="name">Use another account</span>
                </div>
              </div>
              
              <div id="custom-box" class="custom-box">
                <span style="font-size: 12px; font-weight: 500; color: #c4c7c5; margin-bottom: 2px;">Enter credentials:</span>
                <input type="text" id="cust-name" class="input-field" placeholder="Full Name">
                <input type="email" id="cust-email" class="input-field" placeholder="Email Address">
                <button class="submit-btn" onclick="submitCustom()">Continue</button>
              </div>
            </div>
            
            <div class="privacy-notice">
              Before using this app, you can review FlightAgent's <a href="#">Privacy Policy</a> and <a href="#">Terms of Service</a>.
            </div>
          </div>
          
          <div class="footer">
            <span>English (United States)</span>
            <div class="footer-links">
              <a href="#">Help</a>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
          
          <script>
            function selectAccount(name, email) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', name, email }, '*');
              window.close();
            }
            
            function toggleCustomForm() {
              var box = document.getElementById('custom-box');
              if (box.style.display === 'flex') {
                box.style.display = 'none';
              } else {
                box.style.display = 'flex';
              }
            }
            
            function submitCustom() {
              var name = document.getElementById('cust-name').value.trim();
              var email = document.getElementById('cust-email').value.trim();
              if (!name || !email) {
                alert('Please fill in both name and email.');
                return;
              }
              if (!email.includes('@')) {
                alert('Please enter a valid email.');
                return;
              }
              selectAccount(name, email);
            }
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  const handleAppleSignIn = () => {
    const width = 500;
    const height = 620;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open('', 'AppleSignIn', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`);
    
    popup.document.write(`
      <html>
        <head>
          <title>Sign in with Apple ID</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #161617;
              color: #f5f5f7;
              margin: 0;
              padding: 40px 24px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .logo {
              margin-bottom: 24px;
              color: #ffffff;
            }
            h1 {
              font-size: 24px;
              font-weight: 600;
              margin: 0 0 8px 0;
              letter-spacing: -0.5px;
            }
            p {
              font-size: 15px;
              color: #86868b;
              margin: 0 0 32px 0;
              text-align: center;
            }
            .account-box {
              width: 100%;
              max-width: 360px;
              border: 1px solid #424245;
              border-radius: 12px;
              overflow: hidden;
              background-color: #212124;
              margin-bottom: 20px;
            }
            .account-row {
              display: flex;
              align-items: center;
              padding: 14px 16px;
              border-bottom: 1px solid #424245;
              cursor: pointer;
              transition: background-color 0.2s;
            }
            .account-row:last-child {
              border-bottom: none;
            }
            .account-row:hover {
              background-color: #2d2d30;
            }
            .avatar {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: #f5f5f7;
              color: #1d1d1f;
              font-weight: bold;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 12px;
              font-size: 14px;
            }
            .info {
              display: flex;
              flex-direction: column;
            }
            .name {
              font-size: 14px;
              font-weight: 500;
              color: #f5f5f7;
            }
            .email {
              font-size: 12px;
              color: #86868b;
            }
            .footer {
              font-size: 11px;
              color: #86868b;
              margin-top: 24px;
              max-width: 360px;
              text-align: center;
              line-height: 1.5;
            }
            .footer a {
              color: #2997ff;
              text-decoration: none;
            }
            .custom-box {
              padding: 16px;
              border-top: 1px solid #424245;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .input-field {
              padding: 10px 14px;
              border: 1px solid #424245;
              border-radius: 6px;
              font-size: 14px;
              outline: none;
              background-color: #1d1d1f;
              color: #f5f5f7;
            }
            .input-field:focus {
              border-color: #0071e3;
            }
            .submit-btn {
              background-color: #f5f5f7;
              color: #1d1d1f;
              border: none;
              padding: 10px;
              border-radius: 6px;
              font-weight: 600;
              cursor: pointer;
              font-size: 14px;
            }
            .submit-btn:hover {
              background-color: #e8e8ed;
            }
          </style>
        </head>
        <body>
          <div class="logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.57 2.95-1.38z" />
            </svg>
          </div>
          <h1>Sign in with Apple ID</h1>
          <p>Use your Apple ID to sign in to FlightAgent</p>
          
          <div class="account-box">
            <div class="account-row" onclick="selectAccount('Karthik Raj', 'karthikraj@apple.com')">
              <div class="avatar">K</div>
              <div class="info">
                <span class="name">Karthik Raj</span>
                <span class="email">karthikraj@apple.com</span>
              </div>
            </div>
            
            <div class="custom-box">
              <span style="font-size: 13px; font-weight: 500; color: #86868b; margin-bottom: 4px;">Use another Apple ID:</span>
              <input type="text" id="cust-name" class="input-field" placeholder="Full Name">
              <input type="email" id="cust-email" class="input-field" placeholder="Apple ID Email">
              <button class="submit-btn" onclick="submitCustom()">Continue</button>
            </div>
          </div>
          
          <div class="footer">
            Your Apple ID information will be used to initialize access to FlightAgent. See Apple's <a href="#">Privacy Policy</a> and <a href="#">Terms of Use</a>.
          </div>
          
          <script>
            function selectAccount(name, email) {
              window.opener.postMessage({ type: 'APPLE_AUTH_SUCCESS', name, email }, '*');
              window.close();
            }
            
            function submitCustom() {
              var name = document.getElementById('cust-name').value.trim();
              var email = document.getElementById('cust-email').value.trim();
              if (!name || !email) {
                alert('Please fill in both name and Apple ID email.');
                return;
              }
              if (!email.includes('@')) {
                alert('Please enter a valid email.');
                return;
              }
              selectAccount(name, email);
            }
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  const handleClose = () => {
    if (onClose) onClose();
    else navigate('/');
  };

  return (
    <AnimatePresence>
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleClose}
          ></motion.div>
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass-panel relative w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(138,43,226,0.15)] overflow-hidden"
          >
            {/* Glowing borders/accents */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neonPurple to-neonCyan"></div>
            
            <button 
               onClick={handleClose}
               className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            {step === 1 ? (
              <>
                <h2 className="text-3xl font-display font-extrabold text-white text-center mb-2 tracking-tight">
                  Create <span className="text-gradient">Access</span>
                </h2>
                <p className="text-gray-400 text-center mb-8 font-light text-sm">Register your credentials for network entry</p>
                
                {error && <div className="text-red-400 text-sm text-center mb-6 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</div>}
                
                <form className="space-y-5" onSubmit={handleSendOtp}>
                  <div className="space-y-4">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="text-gray-500 group-focus-within:text-neonPurple transition-colors" size={18} />
                      </div>
                      <input 
                        type="text" 
                        required 
                        className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-neonPurple/50 focus:ring-1 focus:ring-neonPurple/50 transition-all" 
                        placeholder="Full Name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                      />
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="text-gray-500 group-focus-within:text-neonCyan transition-colors" size={18} />
                      </div>
                      <input 
                        type="email" 
                        required 
                        className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-neonCyan/50 focus:ring-1 focus:ring-neonCyan/50 transition-all" 
                        placeholder="Email Address" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                      />
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="text-gray-500 group-focus-within:text-neonPurple transition-colors" size={18} />
                      </div>
                      <input 
                        type="password" 
                        required 
                        className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-neonPurple/50 focus:ring-1 focus:ring-neonPurple/50 transition-all" 
                        placeholder="Password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                      />
                    </div>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={otpLoading}
                    className="neon-button w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-neonPurple to-blue-600 mt-4 text-lg shadow-[0_0_15px_rgba(138,43,226,0.4)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {otpLoading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-display font-extrabold text-white text-center mb-2 tracking-tight">
                  Verify <span className="text-gradient">Email</span>
                </h2>
                <p className="text-gray-400 text-center mb-8 font-light text-sm">Enter the code sent to your inbox</p>
                
                {error && <div className="text-red-400 text-sm text-center mb-6 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</div>}
                
                <form className="space-y-5" onSubmit={handleVerifyAndRegister}>
                  <div className="space-y-4">
                    <p className="text-gray-300 text-sm text-center">
                      We have sent a verification code to <span className="text-neonCyan font-semibold">{email}</span>. Please enter it below.
                    </p>
                    
                    {demoOtp && (
                      <div className="text-emerald-400 text-xs text-center bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 font-mono">
                        💡 [Demo Mode] OTP is: <span className="font-bold text-sm tracking-[4px]">{demoOtp}</span>
                      </div>
                    )}

                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="text-gray-500 group-focus-within:text-neonCyan transition-colors" size={18} />
                      </div>
                      <input 
                        type="text" 
                        maxLength="6"
                        required 
                        className="w-full bg-black/30 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white text-center font-bold tracking-[8px] text-lg placeholder-gray-600 placeholder-normal focus:outline-none focus:border-neonCyan/50 focus:ring-1 focus:ring-neonCyan/50 transition-all" 
                        placeholder="000000" 
                        value={otp} 
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs mt-2">
                      <button 
                        type="button" 
                        onClick={() => { setStep(1); setError(''); }} 
                        className="text-gray-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                      >
                        ← Edit Account Info
                      </button>
                      <button 
                        type="button" 
                        onClick={handleSendOtp} 
                        className="text-neonCyan hover:underline transition-colors bg-transparent border-none cursor-pointer"
                      >
                        Resend Code
                      </button>
                    </div>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={otpLoading}
                    className="neon-button w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-neonPurple to-blue-600 mt-4 text-lg shadow-[0_0_15px_rgba(138,43,226,0.4)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {otpLoading ? 'Processing...' : 'Verify & Register'}
                  </button>
                </form>
              </>
            )}

            {/* Google/Apple Auth Integration */}
            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-4 text-gray-500 text-xs uppercase tracking-wider font-semibold">Or connect with</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <div className="space-y-3">
              {/* Google Sign In Button */}
              <button 
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 rounded-xl border border-[#d0d7de] bg-[#f6f8fa] hover:bg-[#f3f4f6] text-black font-semibold flex items-center justify-center gap-3 text-sm transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              {/* Apple Sign In Button */}
              <button 
                type="button"
                onClick={handleAppleSignIn}
                className="w-full py-3 px-4 rounded-xl border border-[#d0d7de] bg-[#f6f8fa] hover:bg-[#f3f4f6] text-black font-semibold flex items-center justify-center gap-3 text-sm transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.57 2.95-1.38z" />
                </svg>
                Continue with Apple
              </button>
            </div>
            
            <div className="mt-8 text-center pt-6 border-t border-white/10">
              <Link to="/login" onClick={() => { if(onClose) onClose(); }} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                Already registered? <span className="text-neonPurple">Access Portal</span>
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Register;