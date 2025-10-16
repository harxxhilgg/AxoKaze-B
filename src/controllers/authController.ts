import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import logger from "../utils/logger";
import {
  loginSchema,
  signupSchema,
  updateProfileSchema,
} from "../validators/authValidator";
import { User } from "../config/model";

declare module "express-session" {
  interface SessionData {
    user: {
      id: string;
      email: string;
      name: string;
    };
  }
}

/*
  Signup
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

    req.session.user = {
      id: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name,
    };

    return res.status(201).json({
      message: "User created successfully.",
      user: { id: newUser._id, name: newUser.name, email: newUser.email },
    });
  } catch (e) {
    logger.error(e);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/*
  Login
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
      return res.status(404).json({ message: "User not found." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    req.session.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    return res.status(200).json({
      message: "Login successful.",
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (e) {
    logger.error(e);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/*
  getProfile
*/

export const getProfile = (req: Request, res: Response) => {
  try {
    res.json({
      message: "Profile fetched successfully.",
      user: req.session.user,
    });
  } catch (error) {
    logger.error("Profile fetch error: ", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    req.session.destroy((error) => {
      if (error) {
        return res.status(500).json({ message: "Logout failed." });
      }

      res.clearCookie("connect.sid"); // Clear session cookie
      res.json({ message: "Logged out successfully." });
    });
  } catch (error) {
    logger.error("Logout error: ", error);
    return res.status(500).json({ message: "Internal session error." });
  }
};

/*
  updateProfile
*/

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { error } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, email, currentPassword } = req.body;
    const userId = req.session.user?.id;

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
    if (email) {
      req.session.user!.email = email;
    }
    if (name) {
      req.session.user!.name = name;
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
