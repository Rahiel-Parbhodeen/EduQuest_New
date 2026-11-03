import nodemailer from 'nodemailer';

let testDelivery = null;

export function setEmailDeliveryForTests(deliver) {
  testDelivery = deliver;
}

export async function sendVerificationCode(email, code, purpose) {
  if (testDelivery) return testDelivery({ email, code, purpose });
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM } = process.env;
  if (!SMTP_HOST || !EMAIL_FROM)
    throw new Error('EMAIL_DELIVERY_NOT_CONFIGURED');
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    ...(SMTP_USER ? { auth: { user: SMTP_USER, pass: SMTP_PASSWORD || '' } } : {}),
  });
  const registration = purpose === 'register';
  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: registration ? 'Verify your EduQuest email' : 'Confirm your EduQuest email change',
    text: `Your EduQuest verification code is ${code}. It expires in 10 minutes. If you did not request this code, ignore this email.`,
  });
}
