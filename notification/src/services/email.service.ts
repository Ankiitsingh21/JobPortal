import nodemailer from "nodemailer";

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export const sendEmail = async (to: string, subject: string, text: string) => {
  if (!transporter) {
    console.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}\n${text}`);
    return;
  }
  await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
};