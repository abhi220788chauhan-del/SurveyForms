import nodemailer, { type Transporter } from 'nodemailer';

let transport: Transporter | undefined;

export const smtpConfigured = () => Boolean(process.env.SMTP_HOST?.trim());

/** Sends the verification code. Without SMTP (development only) the code is printed to the console. */
export async function sendOtpMail(to: string, code: string): Promise<void> {
  if (!smtpConfigured()) {
    if (process.env.NODE_ENV === 'production') throw new Error('SMTP_HOST is not configured');
    console.log(`[dev] email OTP for ${to}: ${code}`);
    return;
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `${code} is your Sahi-Sahi verification code`,
    text: `Your Sahi-Sahi verification code is ${code}. It is valid for 10 minutes.\n\nIf you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #e3eadf;border-radius:12px">
      <h2 style="color:#176B3A;margin:0 0 8px">Sahi-Sahi</h2>
      <p style="margin:0 0 16px;color:#444">Your verification code is</p>
      <p style="font-size:32px;font-weight:800;letter-spacing:8px;margin:0 0 16px;background:#DFFF00;padding:12px;text-align:center;border-radius:8px">${code}</p>
      <p style="color:#666;font-size:13px;margin:0">Valid for 10 minutes. If you did not request this, ignore this email.</p>
    </div>`,
  });
}
