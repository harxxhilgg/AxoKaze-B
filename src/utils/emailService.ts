import nodemailer from "nodemailer";
import logger from "./logger";

const isProd: boolean = process.env.NODE_ENV === "production";

// DEVELOPMENT ~ NODEMAILER + MAILHOG
const devTransporter = nodemailer.createTransport({
  // @ts-ignore
  host: process.env.EMAIL_HOST || "localhost",
  port: parseInt(process.env.EMAIL_PORT || "1025"),
  secure: false,
  auth: null,
});

// PRODUCTION ~ GMAIL

const prodTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_PASSWORD,
  },
});

export const sendOtpEmail = async (
  email: string,
  otp: string
): Promise<boolean> => {
  try {
    const subject = `${otp} is your Kaze OTP`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb; text-align: center;">Your OTP Code</h2>
        <p style="text-align: center;">Use the following OTP to complete your login:</p>
        <div style="text-align: center; margin: 30px 0;">
          <h1 style="font-size: 32px; letter-spacing: 8px; color: #2563eb; background: #f3f4f6; padding: 20px; border-radius: 8px; display: inline-block; text-align: center;">
            ${otp}
          </h1>
        </div>
        <p style="text-align: center;"><strong>This OTP will expire in 10 minutes.</strong></p>
        <p style="color: #6b7280; font-size: 14px; text-align: center;">Do not share this code with anyone.</p>
      </div>`;

    if (isProd) {
      // SENDING REAL EMAILS
      await prodTransporter.sendMail({
        from: `Kaze <${process.env.GMAIL_EMAIL}>`,
        to: email,
        subject: subject,
        html: html,
      });

      logger.info(`📧 OTP email sent to: ${email}`);
    } else {
      // SENDING TO MAILHOG ~ MAKE SURE YOUR MAILHOG INSTANCE IS RUNNING
      await devTransporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: subject,
        html: html,
      });

      logger.info(`[dev] OTP sent to: ${email}`);
    }

    return true;
  } catch (error) {
    logger.error("Email sending failed: ", error);

    return false;
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  resetLink: string
): Promise<boolean> => {
  try {
    const subject = "Reset your password";

    const html = `
      <div style="display: flex, font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>You requested to reset your password. Click the button below to create a new password:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a
            href="${resetLink}"
            style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;"
          >
            Reset Password
          </a>
        </div>

        <p>Or copy this link:</p>
        <p style="color: #6b7280; font-size: 14px; word-break: break-all;">${resetLink}</p>
        <p><strong>This link expires in 1 hour.</strong></p>
        <p style="color: #6b7280; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `;

    if (isProd) {
      await prodTransporter.sendMail({
        from: `Kaze <${process.env.GMAIL_EMAIL}>`,
        to: email,
        subject: subject,
        html: html,
      });
    } else {
      await devTransporter.sendMail({
        from: `Kaze <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: subject,
        html: html,
      });
    }

    return true;
  } catch (error) {
    logger.error("Password reset email failed: ", error);
    return false;
  }
};
