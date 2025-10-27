import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: { message: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: {
    message: "Too many verification attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

export const resendOtpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 100,
  message: { message: "You can resend OTP only a few times. Please wait." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

export const resetRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 3,
  message: { message: "Too many reset requests. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: { message: "Too many registrations from this IP. Try later." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});
