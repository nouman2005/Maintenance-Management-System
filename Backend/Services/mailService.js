import nodemailer from "nodemailer";

const requiredMailConfig = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "MAIL_FROM",
];

const getMissingMailConfig = () =>
  requiredMailConfig.filter((key) => !process.env[key]?.trim());

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const getMailTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST.trim(),
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

export const sendAdminCredentialsEmail = async ({
  to,
  adminName,
  societyName,
  email,
  password,
}) => {
  const missingConfig = getMissingMailConfig();

  if (missingConfig.length > 0) {
    console.warn(
      "SMTP is not fully configured. Admin credentials email was not sent.",
      { to, missingConfig },
    );
    return { sent: false, reason: "SMTP_NOT_CONFIGURED", missingConfig };
  }

  const transporter = getMailTransporter();

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: `Your ${societyName} admin account is approved`,
    html: `
      <p>Hello ${escapeHtml(adminName)},</p>
      <p>Your society registration request for <strong>${escapeHtml(
        societyName,
      )}</strong> has been approved.</p>
      <p>You can now login with these credentials:</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}<br/>
      <strong>Temporary password:</strong> ${escapeHtml(password)}</p>
      <p>Please change your password immediately after your first login.</p>
    `,
    text: [
      `Hello ${adminName},`,
      "",
      `Your society registration request for ${societyName} has been approved.`,
      "You can now login with these credentials:",
      `Email: ${email}`,
      `Temporary password: ${password}`,
      "",
      "Please change your password immediately after your first login.",
    ].join("\n"),
  });

  return { sent: true };
};
