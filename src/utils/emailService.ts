import { Resend } from "resend";
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

// PRODUCTION ~ RESEND
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpEmail = async (
  email: string,
  otp: string
): Promise<boolean> => {
  try {
    const subject = "Your Login OTP Code";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Your OTP Code</h2>
        <p>Use the following OTP to complete your login:</p>
        <div style="text-align: center; margin: 30px 0;">
          <h1 style="font-size: 32px; letter-spacing: 8px; color: #2563eb; background: #f3f4f6; padding: 20px; border-radius: 8px; display: inline-block;">
            ${otp}
          </h1>
        </div>
        <p><strong>This OTP will expire in 10 minutes.</strong></p>
        <p style="color: #6b7280; font-size: 14px;">Do not share this code with anyone.</p>
      </div>`;

    if (isProd) {
      await resend.emails.send({
        // @ts-ignore
        from: process.env.EMAIL_FROM,
        to: email,
        subject: subject,
        html: html,
      });

      logger.info(`OTP email sent to: ${email}`);
    } else {
      await devTransporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: subject,
        html: html,
      });

      logger.info(`[dev] OTP email sent to: ${email}`);
    }

    return true;
  } catch (error) {
    logger.error("Email sending failed: ", error);

    return false;
  }
};
