const User = require('../models/User');
const Otp = require('../models/Otp');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '30d',
  });
};

// @desc    Send OTP to email for registration
// @route   POST /api/auth/send-otp
// @access  Public
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

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete existing OTPs for this email and save new one
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp });

    // Try sending email
    let emailSent = false;
    let isDefaultCredentials = (process.env.EMAIL_USER === 'your_email@gmail.com' || !process.env.EMAIL_USER);

    if (!isDefaultCredentials) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
          }
        });

        await transporter.sendMail({
          from: `"FlightAgent Verification" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Your Registration Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h2 style="color: #4285F4; text-align: center;">FlightAgent Verification</h2>
              <p>Hello,</p>
              <p>Thank you for registering an account on FlightAgent! To complete your registration, please verify your email using the following 6-digit OTP code:</p>
              <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1a73e8; background-color: #f1f3f4; padding: 10px 20px; border-radius: 6px; border: 1px dashed #1a73e8;">${otp}</span>
              </div>
              <p style="color: #666; font-size: 14px;">This code is valid for 10 minutes. Please do not share this OTP with anyone.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">FlightAgent Inc. &copy; 2026</p>
            </div>
          `
        });
        emailSent = true;
      } catch (err) {
        console.error('Nodemailer Error:', err.message);
      }
    }

    // Print generated OTP to backend console so it's easy to read in terminal
    console.log(`\n========================================`);
    console.log(`🔑 REGISTRATION OTP FOR ${email}: ${otp}`);
    if (isDefaultCredentials) {
      console.log(`⚠️ Using default placeholder email credentials.`);
    } else if (!emailSent) {
      console.log(`❌ Failed to send email via SMTP, logged OTP for convenience.`);
    } else {
      console.log(`✅ Email sent successfully!`);
    }
    console.log(`========================================\n`);

    res.status(200).json({
      message: 'Verification OTP sent to email!',
      // Return the OTP in the JSON response ONLY in default config to make testing extremely seamless
      otp: isDefaultCredentials ? otp : undefined
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password, otp } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required for verification' });
    }

    // Verify OTP
    const otpDoc = await Otp.findOne({ email }).sort({ createdAt: -1 });
    if (!otpDoc) {
      return res.status(400).json({ message: 'OTP has expired or is invalid' });
    }

    if (otpDoc.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP code' });
    }

    // Successful match, delete OTP document
    await Otp.deleteMany({ email });

    const user = await User.create({ name, email, password, isVerified: true });
    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// @desc    Auth user via Google OAuth
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  const { name, email } = req.body;
  try {
    if (!email || !name) {
      return res.status(400).json({ message: 'Missing name or email from Google' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      // Create user with a secure random password since it is required
      const randomPassword = 'google-oauth-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      user = await User.create({
        name,
        email,
        password: randomPassword,
        isVerified: true
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser, getUserProfile, googleLogin, sendOtp };