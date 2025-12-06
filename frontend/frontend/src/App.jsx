import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

export default function PreAuthForm() {
  const [step, setStep] = useState('form');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    patientName: '',
    email: '',
    phoneNumber: '',
    hospitalName: '',
    hospitalNameOther: '',
    policyPrefix: '',
    policyPrefixOther: '',
    policyNumber: '',
    treatmentType: '',
    treatmentTypeOther: '',
    estimatedAmount: '',
    doctorNotes: ''
  });

  // Validation functions (same as before)
  const validatePatientName = (name) => {
    if (!name.trim()) return 'Patient name is required';
    if (!/^[a-zA-Z\s]+$/.test(name)) return 'Name can only contain letters and spaces';
    if (name.trim().length < 2) return 'Name must be at least 2 characters';
    if (name.trim().length > 100) return 'Name is too long';
    return '';
  };

  const validateEmail = (email) => {
    if (!email.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    if (email.length > 255) return 'Email is too long';
    return '';
  };

  const validatePhoneNumber = (phone) => {
    if (!phone.trim()) return 'Phone number is required';
    const phoneRegex = /^\d{10}$/;
    const cleanPhone = phone.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) return 'Phone number must be exactly 10 digits';
    return '';
  };

  const validateHospitalName = (hospitalName) => {
    if (!hospitalName) return 'Hospital name is required';
    if (hospitalName === 'Other' && !formData.hospitalNameOther.trim()) {
      return 'Please specify the hospital name';
    }
    return '';
  };

  const validatePolicyPrefix = (prefix) => {
    if (!prefix) return 'Policy prefix is required';
    if (prefix === 'OTH-' && !formData.policyPrefixOther.trim()) {
      return 'Please specify the policy prefix';
    }
    return '';
  };

  const validateTreatmentType = (type) => {
    if (!type) return 'Treatment type is required';
    if (type === 'Other' && !formData.treatmentTypeOther.trim()) {
      return 'Please specify the treatment type';
    }
    return '';
  };

  const validateEstimatedAmount = (amount) => {
    if (!amount.trim()) return 'Estimated amount is required';
    if (!/^\d+$/.test(amount)) return 'Amount must be a number';
    const numAmount = parseInt(amount, 10);
    if (numAmount <= 0) return 'Amount must be greater than 0';
    if (numAmount > 100000000) return 'Amount is too high';
    return '';
  };

  const validateForm = () => {
    const errors = {
      patientName: validatePatientName(formData.patientName),
      email: validateEmail(formData.email),
      phoneNumber: validatePhoneNumber(formData.phoneNumber),
      hospitalName: validateHospitalName(formData.hospitalName),
      policyPrefix: validatePolicyPrefix(formData.policyPrefix),
      policyNumber: formData.policyNumber.trim() ? '' : 'Policy number is required',
      treatmentType: validateTreatmentType(formData.treatmentType),
      estimatedAmount: validateEstimatedAmount(formData.estimatedAmount)
    };

    setValidationErrors(errors);
    return Object.values(errors).every(error => error === '');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phoneNumber') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData({ ...formData, [name]: digitsOnly });
    }
    else if (name === 'patientName') {
      const lettersAndSpaces = value.replace(/[^a-zA-Z\s]/g, '');
      setFormData({ ...formData, [name]: lettersAndSpaces });
    }
    else if (name === 'estimatedAmount') {
      const digitsOnly = value.replace(/\D/g, '');
      setFormData({ ...formData, [name]: digitsOnly });
    }
    else {
      setFormData({ ...formData, [name]: value });
    }
    
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: '' });
    }
    
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setError('Please fix the errors in the form before submitting.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          patientName: formData.patientName
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('OTP sent to your email! Please check your inbox.');
        setStep('otp');
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Send OTP error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError('');

    try {
      const verifyResponse = await fetch(`${API_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp: otp
        })
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.success) {
        const finalData = {
          patientName: formData.patientName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          hospitalName: formData.hospitalName === 'Other' ? formData.hospitalNameOther : formData.hospitalName,
          policyPrefix: formData.policyPrefix === 'OTH-' ? formData.policyPrefixOther : formData.policyPrefix,
          policyNumber: formData.policyNumber,
          treatmentType: formData.treatmentType === 'Other' ? formData.treatmentTypeOther : formData.treatmentType,
          estimatedAmount: formData.estimatedAmount,
          doctorNotes: formData.doctorNotes
        };

        const submitResponse = await fetch(`${API_URL}/submit-preauth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalData)
        });

        const submitData = await submitResponse.json();

        if (submitData.success) {
          setStep('success');
        } else {
          setError(submitData.message || 'Failed to submit form');
        }
      } else {
        setError(verifyData.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Verify OTP error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    setOtp('');

    try {
      const response = await fetch(`${API_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          patientName: formData.patientName
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('New OTP sent to your email!');
      } else {
        setError(data.message || 'Failed to resend OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-teal-100">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white rounded-full p-4">
                  <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white text-center mb-3">Claim Submitted Successfully!</h2>
              <p className="text-teal-100 text-center text-lg">
                Your pre-authorization request has been securely processed.
              </p>
            </div>
            
            <div className="p-8">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 mb-6 border border-emerald-100">
                <h3 className="text-lg font-semibold text-emerald-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Confirmation Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-emerald-100">
                    <p className="text-sm text-gray-500">Patient Name</p>
                    <p className="font-semibold text-gray-800">{formData.patientName}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-emerald-100">
                    <p className="text-sm text-gray-500">Policy Number</p>
                    <p className="font-semibold text-gray-800">{formData.policyPrefix}{formData.policyNumber}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-emerald-100">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold text-gray-800">{formData.email}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-emerald-100">
                    <p className="text-sm text-gray-500">Reference ID</p>
                    <p className="font-semibold text-gray-800">CLAIM-{Date.now().toString().slice(-8)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <h4 className="font-semibold text-blue-800 mb-3">What happens next?</h4>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="inline-block w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-center mr-2 flex-shrink-0">1</span>
                    You'll receive a confirmation email within 5 minutes
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-center mr-2 flex-shrink-0">2</span>
                    Our claims team will review your request within 24-48 hours
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-center mr-2 flex-shrink-0">3</span>
                    You'll be notified via email and SMS about the status
                  </li>
                </ul>
              </div>
              
              <button
                onClick={() => window.print()}
                className="mt-8 w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-all duration-200"
              >
                Download Confirmation
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-slate-700 to-gray-800 p-8">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-full p-4 border border-white/20">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white text-center mb-2">Secure Verification</h2>
              <p className="text-gray-300 text-center text-sm">
                Enter the verification code sent to <br />
                <span className="font-semibold text-white">{formData.email}</span>
              </p>
            </div>
            
            <div className="p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">Enter 6-digit verification code</label>
                <div className="flex justify-center space-x-3">
                  {[...Array(6)].map((_, i) => (
                    <input
                      key={i}
                      type="text"
                      maxLength="1"
                      value={otp[i] || ''}
                      onChange={(e) => {
                        const newOtp = otp.split('');
                        newOtp[i] = e.target.value.replace(/\D/g, '');
                        setOtp(newOtp.join('').slice(0, 6));
                        if (e.target.value && i < 5) {
                          document.getElementById(`otp-${i + 1}`)?.focus();
                        }
                      }}
                      id={`otp-${i}`}
                      className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 text-center mt-3">
                  Code expires in 10 minutes
                </p>
              </div>
              
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 mb-4"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verifying...
                  </span>
                ) : 'Verify & Submit Claim'}
              </button>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <button
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center disabled:text-gray-400"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Resend Code
                </button>
                
                <button
                  onClick={() => setStep('form')}
                  disabled={loading}
                  className="text-gray-600 hover:text-gray-800 text-sm flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Form
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              <svg className="inline w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Your information is secured with 256-bit encryption
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 rounded-2xl shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Secure <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">HealthClaim</span> Portal
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Submit your medical pre-authorization request with end-to-end encryption and secure verification
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Progress Indicator */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 border-b border-gray-200">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">1</div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Claim Details</p>
                  <p className="text-xs text-gray-500">Fill in your information</p>
                </div>
              </div>
              <div className="h-1 w-12 bg-gray-300 mx-2"></div>
              <div className="flex items-center opacity-50">
                <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-bold">2</div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Verify</p>
                  <p className="text-xs text-gray-500">Email verification</p>
                </div>
              </div>
              <div className="h-1 w-12 bg-gray-300 mx-2"></div>
              <div className="flex items-center opacity-50">
                <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-bold">3</div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Confirmation</p>
                  <p className="text-xs text-gray-500">Receive confirmation</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {/* Patient Information Section */}
            <div className="mb-10">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-emerald-100 to-teal-100 p-2 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Patient Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                    <input
                      type="text"
                      name="patientName"
                      value={formData.patientName}
                      onChange={handleChange}
                      className={`pl-10 w-full px-4 py-3 border ${validationErrors.patientName ? 'border-red-300' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  {validationErrors.patientName && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validationErrors.patientName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`pl-10 w-full px-4 py-3 border ${validationErrors.email ? 'border-red-300' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  {validationErrors.email && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validationErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      className={`pl-10 w-full px-4 py-3 border ${validationErrors.phoneNumber ? 'border-red-300' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`}
                      placeholder="9876543210"
                      maxLength="10"
                      required
                    />
                  </div>
                  {validationErrors.phoneNumber && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validationErrors.phoneNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Policy Information Section */}
            <div className="mb-10">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-blue-100 to-cyan-100 p-2 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Policy Details</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hospital Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="hospitalName"
                      value={formData.hospitalName}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border ${validationErrors.hospitalName ? 'border-red-300' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white pr-10 transition-all`}
                      required
                    >
                      <option value="">Select Hospital</option>
                      <option value="Apollo Hospital">Apollo Hospital</option>
                      <option value="Fortis Hospital">Fortis Hospital</option>
                      <option value="Max Hospital">Max Hospital</option>
                      <option value="Manipal Hospital">Manipal Hospital</option>
                      <option value="AIIMS">AIIMS</option>
                      <option value="Other">Other</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                  {validationErrors.hospitalName && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validationErrors.hospitalName}
                    </p>
                  )}
                  {formData.hospitalName === 'Other' && (
                    <input
                      type="text"
                      name="hospitalNameOther"
                      value={formData.hospitalNameOther}
                      onChange={handleChange}
                      className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      placeholder="Enter hospital name"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Policy Prefix <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="policyPrefix"
                      value={formData.policyPrefix}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border ${validationErrors.policyPrefix ? 'border-red-300' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white pr-10 transition-all`}
                      required
                    >
                      <option value="">Select Policy Prefix</option>
                      <option value="APL-">APL- (Apollo)</option>
                      <option value="FRT-">FRT- (Fortis)</option>
                      <option value="MAX-">MAX- (Max)</option>
                      <option value="MNP-">MNP- (Manipal)</option>
                      <option value="AIM-">AIM- (AIIMS)</option>
                      <option value="OTH-">OTH- (Other)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                  {validationErrors.policyPrefix && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validationErrors.policyPrefix}
                    </p>
                  )}
                  {formData.policyPrefix === 'OTH-' && (
                    <input
                      type="text"
                      name="policyPrefixOther"
                      value={formData.policyPrefixOther}
                      onChange={handleChange}
                      className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      placeholder="Enter policy prefix"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Policy Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                      </svg>
                    </div>
                    <input
                      type="text"
                      name="policyNumber"
                      value={formData.policyNumber}
                      onChange={handleChange}
                      className={`pl-10 w-full px-4 py-3 border ${validationErrors.policyNumber ? 'border-red-300' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`}
                      placeholder="Enter policy number"
                      required
                    />
                  </div>
                  {validationErrors.policyNumber && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validationErrors.policyNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Treatment Information Section */}
            <div className="mb-10">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-2 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Treatment Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Treatment Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="treatmentType"
                      value={formData.treatmentType}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border ${validationErrors.treatmentType ? 'border-red-300' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none bg-white pr-10 transition-all`}
                      required
                    >
                      <option value="">Select Treatment Type</option>
                      <option value="Surgery">Surgery</option>
                      <option value="Hospitalization">Hospitalization</option>
                      <option value="Diagnostic Tests">Diagnostic Tests</option>
                      <option value="Chemotherapy">Chemotherapy</option>
                      <option value="Dialysis">Dialysis</option>
                      <option value="Emergency Treatment">Emergency Treatment</option>
                      <option value="Other">Other</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                  {validationErrors.treatmentType && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validationErrors.treatmentType}
                    </p>
                  )}
                  {formData.treatmentType === 'Other' && (
                    <input
                      type="text"
                      name="treatmentTypeOther"
                      value={formData.treatmentTypeOther}
                      onChange={handleChange}
                      className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      placeholder="Specify treatment type"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-700 font-medium">₹</span>
                    </div>
                    <input
                      type="text"
                      name="estimatedAmount"
                      value={formData.estimatedAmount}
                      onChange={handleChange}
                      className={`pl-10 w-full px-4 py-3 border ${validationErrors.estimatedAmount ? 'border-red-300' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`}
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                  {validationErrors.estimatedAmount && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validationErrors.estimatedAmount}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Doctor's Notes & Medical Justification
                    <span className="text-gray-500 font-normal"> (Optional)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      name="doctorNotes"
                      value={formData.doctorNotes}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      rows="4"
                      placeholder="Provide doctor's remarks, medical justification, or any additional details about the treatment..."
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                      {formData.doctorNotes.length}/1000
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="mb-4 md:mb-0">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-emerald-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Your data is secured with bank-level encryption
                  </div>
                </div>
                
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg w-full md:w-auto"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                      </svg>
                      Submit & Verify
                    </span>
                  )}
                </button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Secure Submission
                  </span>
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
                    </svg>
                    Encrypted Storage
                  </span>
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    24/7 Support
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}