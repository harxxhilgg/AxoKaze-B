import Joi from "joi";

export const signupSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(50).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  currentPassword: Joi.string().required(), // REQ FOR VERIFICATION
  removeProfilePicture: Joi.boolean().optional()
});

// oauth validation schemas
export const googleLoginSchema = Joi.object({
  credential: Joi.string().required(),
});

export const linkGoogleSchema = Joi.object({
  credential: Joi.string().required(),
});
