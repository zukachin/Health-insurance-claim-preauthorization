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

// OTP store (for development; use DB or Redis in production)
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

// -------------------- SEND OTP --------------------
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email, patientName } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const otp = generateOTP();
    otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

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
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });

  const stored = otpStore.get(email);
  if (!stored) return res.status(400).json({ success: false, message: 'OTP not found or expired' });
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ success: false, message: 'OTP expired' });
  }
  if (stored.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });

  otpStore.delete(email);
  res.json({ success: true, message: 'Email verified successfully' });
});

// -------------------- SUBMIT PRE-AUTH FORM --------------------
app.post('/api/submit-preauth', async (req, res) => {
  try {
    const formData = req.body;

    // --- Save to DB here if needed ---
    console.log('Pre-authorization submitted:', formData);

    // --- Send confirmation email ---
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: formData.email,
      subject: 'Pre-Authorization Request Received',
      html: `<div style="font-family: Arial, sans-serif;">
               <h2>✓ Request Submitted Successfully</h2>
               <p>Dear ${formData.patientName},</p>
               <p>Your pre-authorization request has been submitted.</p>
               <p><strong>Policy Number:</strong> ${formData.policyPrefix || ''}${formData.policyNumber}</p>
               <p><strong>Hospital:</strong> ${formData.hospitalName}</p>
               <p><strong>Treatment Type:</strong> ${formData.treatmentType}</p>
               <p><strong>Estimated Amount:</strong> ₹${formData.estimatedAmount}</p>
             </div>`
    };
    await transporter.sendMail(mailOptions);

    // --- Send data to Power Automate ---
    try {
      await axios.post(process.env.PA_FLOW_URL, {
        patientName: formData.patientName,
        policyNumber: (formData.policyPrefix || '') + formData.policyNumber,
        hospitalName: formData.hospitalName,
        treatmentType: formData.treatmentType,
        estimatedAmount: formData.estimatedAmount,
        email: formData.email,
        mobile: formData.mobile
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('Claim sent to Power Automate successfully');
    } catch (err) {
      console.error('Failed to send claim to Power Automate:', err.message);
    }

    res.json({ success: true, message: 'Pre-authorization submitted successfully' });

  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ success: false, message: 'Failed to submit form' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
