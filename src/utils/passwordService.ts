import crypto from "crypto";

// GENERATE RANDOM TOKEN
export const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

// CHECK IF TOKEN EXPIRED
export const isResetTokenExpired = (expiry: Date) => {
  return new Date() > expiry;
};
