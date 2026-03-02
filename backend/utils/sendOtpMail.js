import nodemailer from "nodemailer";

export const sendOtpMail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "postjourneycc2025@gmail.com",
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: "PostJourney <postjourneycc2025@gmail.com>",
    to: email,
    subject: "PostJourney OTP Verification",
    html: `
      <h2>Email Verification</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP is valid for <b>10 minutes</b>.</p>
    `,
  });
};