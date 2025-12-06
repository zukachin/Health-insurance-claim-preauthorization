// server.js - Node.js + Express Backend with Nodemailer
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Configure email transporter (using Gmail as example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // your-email@gmail.com
    pass: process.env.EMAIL_PASS  // your-app-password
  }
});

    
// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP Email
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email, patientName } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP with 10 minute expiry
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Pre-Authorization OTP Verification',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .otp-box { background: white; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Email Verification</h1>
            </div>
            <div class="content">
              <p>Dear ${patientName || 'Patient'},</p>
              <p>Thank you for submitting your Pre-Authorization Request. Please use the OTP below to verify your email address and complete your submission.</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 14px; color: #6b7280;">Your OTP Code</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">Valid for 10 minutes</p>
              </div>
              
              <p><strong>Important:</strong> Do not share this OTP with anyone. Our staff will never ask for your OTP.</p>
              <p>If you didn't request this verification, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; 2024 Health Insurance Pre-Authorization System</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    console.log(`OTP sent to ${email}: ${otp}`); // For development logging

    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      // Remove in production:
      devOTP: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP. Please try again.' 
    });
  }
});

// Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP are required' 
      });
    }

    const storedData = otpStore.get(email);

    if (!storedData) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP not found or expired. Please request a new one.' 
      });
    }

    // Check if OTP expired
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'OTP has expired. Please request a new one.' 
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP. Please try again.' 
      });
    }

    // OTP verified successfully
    otpStore.delete(email);

    res.json({ 
      success: true, 
      message: 'Email verified successfully' 
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Verification failed. Please try again.' 
    });
  }
});

// Submit pre-authorization form
app.post('/api/submit-preauth', async (req, res) => {
  try {
    const formData = req.body;
    
    // Here you would save to database
    console.log('Pre-authorization submitted:', formData);
    
    // Send confirmation email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: formData.email,
      subject: 'Pre-Authorization Request Received',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #10b981; color: white; padding: 20px; text-align: center;">
            <h1>✓ Request Submitted Successfully</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <p>Dear ${formData.patientName},</p>
            <p>Your pre-authorization request has been successfully submitted.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Request Details:</h3>
              <p><strong>Patient Name:</strong> ${formData.patientName}</p>
              <p><strong>Policy Number:</strong> ${formData.policyPrefix}${formData.policyNumber}</p>
              <p><strong>Hospital:</strong> ${formData.hospitalName}</p>
              <p><strong>Treatment Type:</strong> ${formData.treatmentType}</p>
              <p><strong>Estimated Amount:</strong> ₹${formData.estimatedAmount}</p>
            </div>
            <p>We will review your request and contact you within 24-48 hours.</p>
            <p>Thank you for choosing our services.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});