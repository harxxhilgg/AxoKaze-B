import mongoose from "mongoose";

export const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifyToken: String,
    verifyTokenExpiry: Date,

    // PASSWORD RESET
    resetToken: String,
    resetTokenExpiry: Date,

    // LOGIN OTP
    loginOtp: String,
    loginOtpExpiry: Date,
    otpAttemps: {
      type: Number,
      default: 0,
    },
    lastOtpSent: Date,

    // JWT REFRESH TOKENS
    refreshToken: String,
    refreshTokenExpiry: Date,
  },
  {
    timestamps: true,
  }
);
