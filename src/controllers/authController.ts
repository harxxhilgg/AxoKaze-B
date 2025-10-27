import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import logger from "../utils/logger";
import {
  loginSchema,
  signupSchema,
  updateProfileSchema,
} from "../validators/authValidator";
import { User } from "../config/model";
import { generateOtp, isOtpExpired } from "../utils/otpService";
import { sendOtpEmail, sendPasswordResetEmail } from "../utils/emailService";
import { generateResetToken } from "../utils/passwordService";
import {
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  clearTokenCookies,
  verifyRefreshToken,
} from "../utils/jwtService";

/*
  /register
*/

export const register = async (req: Request, res: Response) => {
  try {
    const { error } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        message: "User already exists with this email.",
        email: { email },
      });
    }

    let hashed;
    try {
      hashed = await bcrypt.hash(password, 12);
    } catch (hashedError) {
      logger.error("Password hashing failed: ", hashedError);
      return res.status(500).json({ message: "Error processing password." });
    }

    const newUser = new User({ name, email, password: hashed });
    await newUser.save();

    // GENERATE TOKENS
    const accessToken = generateAccessToken({
      id: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name,
    });

    const refreshToken = generateRefreshToken({
      id: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name,
    });

    // STORE REFRESH TOKEN IN DB
    newUser.refreshToken = refreshToken;
    newUser.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await newUser.save();

    // SET COOKIES
    setTokenCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      message: "User created successfully.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        password: newUser.password, // ! REMOVE LATER
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (e) {
    logger.error(e);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/*
  /login
*/

export const login = async (req: Request, res: Response) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return (
        res
          .status(404)
          // FOR SECURITY REASONS DO NOT TELL USER THAT EMAIL DOES NOT ASSOCIATE WITH ACCOUNT
          .json({ message: "The email or password you entered is incorrect." })
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({
        message:
          "The email or password you entered doesn't match our records. Please try again or reset your password.",
      });
    }

    // GENERATE OTP
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 Minutes

    // SAVE OTP FOR USER
    user.loginOtp = String(otp);
    user.loginOtpExpiry = otpExpiry;
    user.otpAttemps = 0;
    user.lastOtpSent = new Date();
    await user.save();

    // SEND OTP VIA MAIL
    const emailSent = await sendOtpEmail(email, String(otp));
    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send OTP email." });
    }

    return res.status(200).json({
      message: "A 6-digit OTP has been sent to your mailbox.",
      requiresOtp: true,
      email: email,
    });
  } catch (error) {
    logger.error("Login step 1 error: ", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/*
  /verify-otp
*/

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    // VALIDATE INPUT
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "No user found with this email." });
    }

    // CHECK OTP ATTEMPTS
    if (user.otpAttemps >= 5) {
      return res
        .status(429)
        .json({ message: "Too many OTP attempts. Please request a new OTP." });
    }

    // CHECK IF OTP EXISTS AND IS VALID
    if (
      !user.loginOtp ||
      !user.loginOtpExpiry ||
      isOtpExpired(user.loginOtpExpiry)
    ) {
      return res
        .status(400)
        .json({ message: "OTP has expired. Please request a new one." });
    }

    // VERIFY OTP
    if (user.loginOtp !== otp) {
      user.otpAttemps += 1;
      await user.save();

      return res
        .status(401)
        .json({ message: "Invalid OTP.", attemptsLeft: 5 - user.otpAttemps });
    }

    //  OTP IS VALID UNTIL NOW, CLEAR OTP DATA AND LOGIN
    user.loginOtp = undefined;
    user.loginOtpExpiry = undefined;
    user.lastOtpSent = undefined;
    user.otpAttemps = 0;
    user.isVerified = true;
    await user.save();

    // GENERATE TOKENS
    const accessToken = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const refreshToken = generateRefreshToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    // STORE REFRESH TOKEN IN DB
    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    // SET COOKIES
    setTokenCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      tokens: {
        accessToken,
        refreshToken,
      }, // FOR TESTING ONLY, REMOVE IN PROD
    });
  } catch (error) {
    logger.error("Login step 2 error: ", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/*
  /refresh-token
*/

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not found." });
    }

    // VERIFY REFRESH TOKEN
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ message: "Invalid refresh token." });
    }

    // CHECK IF TOKEN EXISTS IN DB
    const user = await User.findOne({
      _id: decoded.id,
      refreshToken: refreshToken,
      refreshTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res
        .status(401)
        .json({ message: "Refresh token expired or invalid." });
    }

    // GENERATE NEW TOKENS
    const newAccessToken = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const newRefreshToken = generateRefreshToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    // UPDATE REFRESH TOKEN IN DB
    user.refreshToken = newRefreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    // SET NEW COOKIES
    setTokenCookies(res, newAccessToken, newRefreshToken);

    return res.status(200).json({
      message: "Tokens refresh successfully.",
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    logger.error("Token refresh error: ", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/*
  resend-otp
*/

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // COOLDOWN
    const COOLDOWN_TIME_MS = 60 * 1000; // a minute
    if (
      user.lastOtpSent &&
      Date.now() - user.lastOtpSent.getTime() < COOLDOWN_TIME_MS
    ) {
      const remainingTime = Math.ceil(
        (COOLDOWN_TIME_MS - (Date.now() - user.lastOtpSent.getTime())) / 1000
      );

      return res.status(429).json({
        message: `Please wait ${remainingTime} seconds before resending OTP.`,
      });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.loginOtp = String(otp);
    user.loginOtpExpiry = otpExpiry;
    user.otpAttemps = 0;
    user.lastOtpSent = new Date();

    await user.save();

    const emailSent = await sendOtpEmail(email, String(otp));
    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send OTP email." });
    }

    return res.status(200).json({
      message: "A new OTP has been sent to your email.",
      requiresOtp: true,
      email,
    });
  } catch (error) {
    logger.error("Resend OTP error: ", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/*
  /get-profile
*/

export const getProfile = (req: Request, res: Response) => {
  try {
    res.json({
      message: "Profile fetched successfully.",
      user: (req as any).user,
    });
  } catch (error) {
    logger.error("Profile fetch error: ", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/*
  /logout
*/

export const logout = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (userId) {
      await User.findByIdAndUpdate(userId, {
        refreshToken: undefined,
        refreshTokenExpiry: undefined,
      });
    }

    clearTokenCookies(res);

    res.json({ message: "Logged out successfully." });
  } catch (error) {
    logger.error("Logout error: ", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/*
  /update-profile
*/

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { error } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, email, currentPassword } = req.body;
    const userId = (req as any).user?.id;

    // FIND USER BY ID
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found.", email: { email: email } });
    }

    // VERIFY CURRENT PASSWORD
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    // CHECK IF EMAIL IS BEING CHANGED AND IF IT IS ALREADY TAKEN BY SOMEONE
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: "Email is already taken." });
      }
    }

    // UPDATE FIELDS
    const updateData: any = {};
    if (name) {
      updateData.name = name;
    }
    if (email) {
      updateData.email = email;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true } // RETURN UPDATE DOCUMENT
    );

    // UPDATE SESSION IF EMAIL CHANGED
    if (email || name) {
      const accessToken = generateAccessToken({
        id: updatedUser!._id.toString(),
        email: updatedUser!.email,
        name: updatedUser!.name,
      });

      const refreshToken = generateAccessToken({
        id: updatedUser!._id.toString(),
        email: updatedUser!.email,
        name: updatedUser!.name,
      });

      // UPDATE REFRESH TOKEN IN DB
      updatedUser!.refreshToken = refreshToken;
      updatedUser!.refreshTokenExpiry = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      );
      await updatedUser!.save();

      // SET NEW COOKIES
      setTokenCookies(res, accessToken, refreshToken);
    }

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: updatedUser?._id,
        name: updatedUser?.name,
        email: updatedUser?.email,
      },
    });
  } catch (error) {
    logger.error("Error updating profile: ", error);
    res.status(500).json({ message: "Internal session error." });
  }
};

/*
  /forgot-password
*/

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(200)
        .json({ message: "If the email exists, a reset link has been sent." });
    }

    // GENERATE TOKEN
    const resetToken = generateResetToken();
    logger.debug(`resetToken: ${resetToken}`);
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 Hour

    // SAVE TO USER
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // RESET LINK ~ FRONTEND
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`; //! ADD FRONTEND URL PAGE IN .env

    // SEND MAIL
    const emailSent = await sendPasswordResetEmail(email, resetLink);

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send reset email." });
    }

    return res
      .status(200)
      .json({ message: "If the email exits, a reset link has been sent." });
  } catch (error) {
    logger.error("Password reset request error: ", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/*
  /reset-password
*/

export const resetPassword = async (req: Request, res: Response) => {
  try {
    // IN FUTURE, UPDATE IT TO MATCH NEW PASSWORD (BASICALLY 2 INPUT FIELDS)
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required." });
    }
    if (!newPassword) {
      return res.status(400).json({ message: "Password is required." });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long." });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }, // NOT EXPIRED
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token." });
    }

    // HASH NEW PASSWORD
    let hashed;
    try {
      hashed = await bcrypt.hash(newPassword, 12);
    } catch (hashedError) {
      logger.error("Password hashing failed: ", hashedError);
      return res.status(500).json({ message: "Error processing password." });
    }

    // UPDATE USER AND CLEAR RESET TOKEN
    user.password = hashed;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    return res.status(200).json({
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    logger.error("Password reset failed: ", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
