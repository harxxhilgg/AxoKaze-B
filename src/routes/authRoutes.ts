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
  refreshToken,
  googleLogin,
  linkgoogleAccount,
  testGoogleLogin,
} from "../controllers/authController";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  googleLoginLimiter,
  loginLimiter,
  otpVerifyLimiter,
  registerLimiter,
  resendOtpLimiter,
  resetRequestLimiter,
} from "../middlewares/rateLimiters";
import { uploadProfilePicture } from "../middlewares/uploadMiddleware";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Auth routes are up." });
});

// Public routes
router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/verify-otp", otpVerifyLimiter, verifyOtp);
router.post("/resend-otp", resendOtpLimiter, resendOtp);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", resetRequestLimiter, requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/google-login", googleLoginLimiter, googleLogin);
router.post("/test-google-login", googleLoginLimiter, testGoogleLogin);

// Protected routes
router.get("/get-profile", requireAuth, getProfile);
router.post("/logout", requireAuth, logout);
router.put(
  "/update-profile",
  requireAuth,
  uploadProfilePicture.single('profilePicture'),
  updateProfile
);
router.post("/link-google", requireAuth, linkgoogleAccount);

export default router;
