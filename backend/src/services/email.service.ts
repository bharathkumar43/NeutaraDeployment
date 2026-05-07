import nodemailer from 'nodemailer';
import logger from '../utils/logger';

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

export const sendScopeEmail = async (opts: {
  deploymentTitle: string;
  requesterName:   string;
  requesterEmail:  string;
  teamName:        string;
}): Promise<void> => {
  const recipient = process.env.SCOPE_EMAIL_RECIPIENT || opts.requesterEmail;
  const from      = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@neutara.com';

  await transporter.sendMail({
    from,
    to: recipient,
    subject: `[Neutara] Project Names Required — ${opts.deploymentTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1d4ed8;">Multi-Project Deployment — Project Names Needed</h2>
        <p>A deployment request that spans multiple projects has been created and requires the full list of affected project names before it can proceed.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 0;color:#6b7280;width:140px;">Deployment</td><td style="padding:6px 0;font-weight:600;">${opts.deploymentTitle}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Requested by</td><td style="padding:6px 0;">${opts.requesterName} (${opts.requesterEmail})</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Team</td><td style="padding:6px 0;">${opts.teamName}</td></tr>
        </table>
        <p style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:4px;">
          Please reply with the complete list of project names that will be affected by this deployment. The submitter will enter them into the deployment form to proceed.
        </p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="color:#9ca3af;font-size:12px;">Neutara Deployment Management System</p>
      </div>
    `,
  });

  logger.info(`Scope email sent for "${opts.deploymentTitle}" to ${recipient}`);
};
