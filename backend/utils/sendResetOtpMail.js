import nodemailer from "nodemailer";

export const sendResetOtpMail = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER || "postjourneycc2025@gmail.com",
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    await transporter.sendMail({
        from: `"PostJourney" <${process.env.GMAIL_USER || "postjourneycc2025@gmail.com"}>`,
        to: email,
        subject: "Reset Your PostJourney Password",
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #1188e6;">Password Reset Request</h2>
        <p>You requested to reset your password. Use the following 6-digit OTP to proceed:</p>
        <h1 style="background: #f4f4f4; padding: 10px; display: inline-block; letter-spacing: 5px;">${otp}</h1>
        <p>This OTP is valid for <b>10 minutes</b>. If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">This is an automated email from PostJourney.</p>
      </div>
    `,
    });
};
