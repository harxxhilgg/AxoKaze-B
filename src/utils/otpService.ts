export const generateOtp = (): String => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-DIGIT
};

export const isOtpExpired = (otpExpiry: Date): boolean => {
  return new Date() > otpExpiry;
};
