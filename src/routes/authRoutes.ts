import express from "express";
import {
  getProfile,
  login,
  verifyOtp,
  logout,
  register,
  requestPasswordReset,
  resetPassword,
  updateProfile,
  resendOtp,
} from "../controllers/authController";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  loginLimiter,
  otpVerifyLimiter,
  registerLimiter,
  resendOtpLimiter,
  resetRequestLimiter,
} from "../middlewares/rateLimiters";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Auth routes are up." });
});

// Public routes
router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/verify-otp", otpVerifyLimiter, verifyOtp);
router.post("/forgot-password", resetRequestLimiter, requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/resend-otp", resendOtpLimiter, resendOtp);

// Protected routes
router.get("/get-profile", requireAuth, getProfile);
router.get("/logout", requireAuth, logout);
router.put("/update-profile", requireAuth, updateProfile);

export default router;
