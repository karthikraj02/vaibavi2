const User = require('../models/User');
const Otp = require('../models/Otp');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { getJwtSecret, isProduction } = require('../utils/config');

const generateToken = (id, role = 'user') => {
  return jwt.sign({ id, role }, getJwtSecret(), { expiresIn: '30d' });
};

const PASSWORD_MIN_LENGTH = 8;

const validatePassword = (password) => {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number';
  }
  return null;
};

const sendOtp = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp });

    let emailSent = false;
    const hasEmailCreds = process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD;

    if (hasEmailCreds) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: `"FlightAgent Verification" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Your Registration Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
              <h2 style="color: #4285F4;">FlightAgent Verification</h2>
              <p>Your verification code:</p>
              <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1a73e8;">${otp}</span>
              </div>
              <p style="color: #666; font-size: 14px;">Valid for 10 minutes.</p>
            </div>
          `,
        });
        emailSent = true;
      } catch (err) {
        console.error('Nodemailer Error:', err.message);
      }
    }

    if (!isProduction) {
      console.log(`OTP for ${email}: ${otp}`);
    }

    res.status(200).json({
      message: emailSent ? 'Verification OTP sent to email' : 'OTP generated (check server logs in dev)',
      ...(isProduction ? {} : { devOtp: !emailSent ? otp : undefined }),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const registerUser = async (req, res) => {
  const { name, email, password, otp } = req.body;
  try {
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required for verification' });
    }

    const otpDoc = await Otp.findOne({ email }).sort({ createdAt: -1 });
    if (!otpDoc || otpDoc.otp !== otp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await Otp.deleteMany({ email });

    const user = await User.create({ name, email, password, isVerified: true });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (email === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      return res.json({
        _id: 'admin-root-id',
        name: 'Administrator',
        email: process.env.ADMIN_USERNAME,
        role: 'admin',
        token: generateToken('admin-root-id', 'admin'),
      });
    }

    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    }
    res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserProfile = async (req, res) => {
  if (req.user._id === 'admin-root-id') {
    return res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: 'admin',
    });
  }

  const user = await User.findById(req.user._id);
  if (user) {
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

const googleLogin = async (req, res) => {
  const { credential, name, email } = req.body;

  try {
    let verifiedEmail = email;
    let verifiedName = name;

    if (credential) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return res.status(503).json({ message: 'Google OAuth is not configured (GOOGLE_CLIENT_ID)' });
      }

      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      verifiedEmail = payload.email;
      verifiedName = payload.name || name;
    } else if (!email || !name) {
      return res.status(400).json({ message: 'Google credential or name/email required' });
    } else if (isProduction) {
      return res.status(400).json({ message: 'Google ID token required in production' });
    }

    let user = await User.findOne({ email: verifiedEmail });
    if (!user) {
      const randomPassword = cryptoRandomPassword();
      user = await User.create({
        name: verifiedName,
        email: verifiedEmail,
        password: randomPassword,
        isVerified: true,
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ message: 'Google authentication failed' });
  }
};

const cryptoRandomPassword = () =>
  'oauth-' + require('crypto').randomBytes(24).toString('hex');

module.exports = { registerUser, loginUser, getUserProfile, googleLogin, sendOtp };
