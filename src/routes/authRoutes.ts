import express from "express";
import {
  getProfile,
  login,
  logout,
  register,
  updateProfile,
} from "../controllers/authController";
import { requireAuth } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Auth routes are up." });
});

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/getProfile", requireAuth, getProfile);
router.get("/logout", requireAuth, logout);
router.put("/updateProfile", requireAuth, updateProfile);

export default router;
