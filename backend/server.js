// server.js - Node.js + Express Backend with Nodemailer + Power Automate integration
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// OTP store (for dev; use DB or Redis in production)
const otpStore = new Map();

// Configure email transporter (Gmail example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // your-email@gmail.com
    pass: process.env.EMAIL_PASS  // your-app-password
  }
});

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// -------------------- MIDDLEWARE: Check OTP Verification --------------------
function requireOTPVerification(req, res, next) {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      otpVerified: false,
      message: 'Email is required'
    });
  }

  const record = otpStore.get(email);
  
  // Check if OTP record exists
  if (!record) {
    return res.status(403).json({
      success: false,
      otpVerified: false,
      message: 'No OTP found. Please request OTP first.'
    });
  }

  // Check if OTP is verified
  if (!record.verified) {
    return res.status(403).json({
      success: false,
      otpVerified: false,
      message: 'Email not verified. Please verify OTP before submitting.'
    });
  }

  // Check if OTP has expired
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(403).json({
      success: false,
      otpVerified: false,
      message: 'OTP verification expired. Please request a new OTP.'
    });
  }

  // OTP is verified and valid - proceed
  next();
}

// -------------------- SEND OTP --------------------
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email, patientName } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const otp = generateOTP();
    // Store OTP with verified: false initially, expires in 10 minutes
    otpStore.set(email, { 
      otp, 
      verified: false, 
      expiresAt: Date.now() + 1 * 60 * 1000 
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Pre-Authorization OTP Verification',
      html: `<div style="font-family: Arial, sans-serif;">
              <h2>Email Verification</h2>
              <p>Dear ${patientName || 'Patient'},</p>
              <p>Your OTP is:</p>
              <h1 style="color:#2563eb;">${otp}</h1>
              <p>Valid for 10 minutes.</p>
            </div>`
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}: ${otp}`);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      devOTP: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// -------------------- VERIFY OTP --------------------
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  
  if (!email || !otp) {
    return res.status(400).json({ 
      success: false, 
      otpVerified: false, 
      message: 'Email and OTP required' 
    });
  }

  const stored = otpStore.get(email);
  
  if (!stored) {
    return res.status(400).json({ 
      success: false, 
      otpVerified: false, 
      message: 'OTP not found. Please request OTP first.' 
    });
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ 
      success: false, 
      otpVerified: false, 
      message: 'OTP expired. Please request a new OTP.' 
    });
  }

  if (stored.otp !== otp) {
    return res.status(400).json({ 
      success: false, 
      otpVerified: false, 
      message: 'Invalid OTP. Please try again.' 
    });
  }

  // Mark as verified
  stored.verified = true;
  otpStore.set(email, stored);

  console.log(`OTP verified for ${email}`);

  res.json({ 
    success: true, 
    otpVerified: true, 
    message: 'Email verified successfully' 
  });
});

// -------------------- CHECK OTP STATUS (Optional endpoint) --------------------
app.post('/api/check-otp-status', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required' 
    });
  }

  const record = otpStore.get(email);
  
  if (!record) {
    return res.json({ 
      success: true, 
      otpVerified: false, 
      message: 'No OTP record found' 
    });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.json({ 
      success: true, 
      otpVerified: false, 
      message: 'OTP expired' 
    });
  }

  res.json({ 
    success: true, 
    otpVerified: record.verified, 
    message: record.verified ? 'Email verified' : 'Email not verified yet' 
  });
});

// -------------------- SUBMIT PRE-AUTH FORM (with OTP verification middleware) --------------------
app.post('/api/submit-preauth', requireOTPVerification, async (req, res) => {
  try {
    const formData = req.body;

    // At this point, OTP is already verified by middleware
    console.log('✓ OTP verified - Processing pre-authorization:', formData.email);

    // Delete OTP record after successful verification check
    otpStore.delete(formData.email);

    // --- Save to DB here if needed ---
    console.log('Pre-authorization data:', formData);

    // --- Send confirmation email ---
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: formData.email,
      subject: 'Pre-Authorization Request Received',
      html: `<div style="font-family: Arial, sans-serif;">
               <h2>✓ Request Submitted Successfully</h2>
               <p>Dear ${formData.patientName},</p>
               <p>Your pre-authorization request has been submitted and verified.</p>
               <p><strong>Policy Number:</strong> ${formData.policyPrefix || ''}${formData.policyNumber}</p>
               <p><strong>Hospital:</strong> ${formData.hospitalName}</p>
               <p><strong>Treatment Type:</strong> ${formData.treatmentType}</p>
               <p><strong>Estimated Amount:</strong> ₹${formData.estimatedAmount}</p>
               <br>
               <p>We will process your request shortly.</p>
             </div>`
    };
    
    await transporter.sendMail(mailOptions);
    console.log('✓ Confirmation email sent');

    // --- Send data to Power Automate (ONLY after OTP verification) ---
    if (!process.env.PA_FLOW_URL) {
      console.warn('⚠ PA_FLOW_URL not configured - skipping Power Automate integration');
    } else {
      try {
        const paPayload = {
          patientName: formData.patientName,
          policyNumber: (formData.policyPrefix || '') + formData.policyNumber,
          hospitalName: formData.hospitalName,
          treatmentType: formData.treatmentType,
          estimatedAmount: formData.estimatedAmount,
          email: formData.email,
          mobile: formData.mobile,
          doctorNotes: formData.doctorNotes,
          verifiedAt: new Date().toISOString(), // Include verification timestamp
          otpVerified: true // Explicitly mark as verified
        };

        await axios.post(process.env.PA_FLOW_URL, paPayload, { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000 // 10 second timeout
        });

        console.log('✓ Claim sent to Power Automate successfully');
      } catch (err) {
        console.error('✗ Failed to send claim to Power Automate:', err.message);
        // Don't fail the whole request if PA fails
        // You might want to queue this for retry
      }
    }

    res.json({ 
      success: true, 
      otpVerified: true, 
      message: 'Pre-authorization submitted successfully' 
    });

  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit form. Please try again.' 
    });
  }
});

// -------------------- HEALTH CHECK --------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));