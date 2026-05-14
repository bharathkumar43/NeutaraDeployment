import logger from '../utils/logger';

// Token cache — Azure tokens are valid for ~60 min; we refresh at 55 min
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getGraphToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }
  const tenantId     = process.env.AZURE_TENANT_ID     || '';
  const clientId     = process.env.AZURE_CLIENT_ID     || '';
  const clientSecret = process.env.AZURE_CLIENT_SECRET || '';
  const resp = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
        scope:         'https://graph.microsoft.com/.default',
      }).toString(),
    }
  );
  const data = await resp.json() as { access_token?: string; error_description?: string };
  if (!data.access_token) throw new Error(`Graph token error: ${data.error_description}`);
  tokenCache = { token: data.access_token, expiresAt: Date.now() + 55 * 60 * 1000 };
  return data.access_token;
}

async function sendGraphEmail(
  to: string | string[],
  subject: string,
  html: string,
  opts: { rethrow?: boolean } = {},
): Promise<void> {
  // Read env vars at call time so dotenv ordering doesn't matter
  const senderEmail  = process.env.EMAIL_SENDER        || '';
  const tenantId     = process.env.AZURE_TENANT_ID     || '';
  const clientId     = process.env.AZURE_CLIENT_ID     || '';
  const clientSecret = process.env.AZURE_CLIENT_SECRET || '';

  if (!senderEmail || !tenantId || !clientId || !clientSecret) {
    logger.warn(`Email skipped (Graph API not configured): ${subject}`);
    return;
  }
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) {
    logger.warn(`Email skipped (no recipients): ${subject}`);
    return;
  }
  try {
    const token = await getGraphToken();
    const resp  = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
      {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message: {
            subject,
            body:         { contentType: 'HTML', content: html },
            toRecipients: recipients.map(a => ({ emailAddress: { address: a } })),
          },
          saveToSentItems: true,
        }),
      }
    );
    if (!resp.ok) {
      if (resp.status === 401) tokenCache = null; // clear cache on auth failure
      const err = await resp.text();
      throw new Error(`sendMail ${resp.status}: ${err}`);
    }
    logger.info(`Graph email sent → ${recipients.join(', ')}: ${subject}`);
  } catch (err) {
    logger.error('Graph email error', err);
    if (opts.rethrow) throw err;
  }
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function layout(title: string, accentColor: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr><td style="background:${accentColor};padding:24px 32px;">
          <p style="margin:0;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Neutara Deployment Management</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">${title}</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">${body}</td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated notification from Neutara Deployment Management System. Do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;color:#6b7280;font-size:13px;width:160px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;color:#111827;font-size:13px;font-weight:500;">${value}</td>
  </tr>`;
}

function ctaButton(text: string, url: string, color: string): string {
  return `<div style="margin-top:24px;">
    <a href="${url}" style="display:inline-block;background:${color};color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">${text}</a>
  </div>`;
}

// ─── 1. Submitted for QA → QA DL ─────────────────────────────────────────────

export const sendQASubmissionEmail = async (opts: {
  requestNumber: string;
  deploymentTitle: string;
  environment: string;
  priority: string;
  raisedByName: string;
  raisedByEmail: string;
  description: string;
}): Promise<void> => {
  const qaDL  = process.env.EMAIL_QA_DL || '';
  if (!qaDL) { logger.warn('EMAIL_QA_DL not set — QA submission email skipped'); return; }
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || '';

  const priorityColor = opts.priority === 'critical' ? '#dc2626' : opts.priority === 'high' ? '#ea580c' : '#2563eb';
  const subject = `[Neutara] QA Review Required — ${opts.requestNumber}: ${opts.deploymentTitle}`;
  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">A new deployment request has been submitted and is awaiting your QA review.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
      ${infoRow('Request #', `<span style="background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-family:monospace;font-weight:700;">${opts.requestNumber}</span>`)}
      ${infoRow('Deployment', opts.deploymentTitle)}
      ${infoRow('Environment', `<span style="background:#f0fdf4;color:#166534;padding:2px 8px;border-radius:4px;font-weight:600;">${opts.environment}</span>`)}
      ${infoRow('Priority', `<span style="color:${priorityColor};font-weight:700;text-transform:uppercase;">${opts.priority}</span>`)}
      ${infoRow('Raised By', `${opts.raisedByName} (${opts.raisedByEmail})`)}
    </table>
    ${opts.description ? `<div style="background:#f9fafb;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:4px;margin-bottom:16px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Description</p>
      <p style="margin:0;font-size:13px;color:#374151;">${opts.description.replace(/\n/g, '<br>')}</p>
    </div>` : ''}
    ${appUrl ? ctaButton('Review in Neutara', `${appUrl}/qa`, '#1d4ed8') : ''}
  `;
  await sendGraphEmail(qaDL, subject, layout('QA Review Required', '#1d4ed8', body));
};

// ─── 2. QA Approved → Infra DL ───────────────────────────────────────────────

export const sendInfraReadyEmail = async (opts: {
  requestNumber: string;
  deploymentTitle: string;
  environment: string;
  priority: string;
  raisedByName: string;
  qaUserName: string;
  qaComments: string;
}): Promise<void> => {
  const infraDL = process.env.EMAIL_INFRA_DL || '';
  if (!infraDL) { logger.warn('EMAIL_INFRA_DL not set — Infra ready email skipped'); return; }
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || '';

  const subject = `[Neutara] Ready for Deployment — ${opts.requestNumber}: ${opts.deploymentTitle}`;
  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">A deployment request has been <strong style="color:#16a34a;">approved by QA</strong> and is ready for infrastructure deployment.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
      ${infoRow('Request #', `<span style="background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-family:monospace;font-weight:700;">${opts.requestNumber}</span>`)}
      ${infoRow('Deployment', opts.deploymentTitle)}
      ${infoRow('Environment', `<span style="background:#f0fdf4;color:#166534;padding:2px 8px;border-radius:4px;font-weight:600;">${opts.environment}</span>`)}
      ${infoRow('Priority', `<span style="font-weight:700;text-transform:uppercase;">${opts.priority}</span>`)}
      ${infoRow('Raised By', opts.raisedByName)}
      ${infoRow('QA Approved By', opts.qaUserName)}
    </table>
    ${opts.qaComments ? `<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px 16px;border-radius:4px;margin-bottom:16px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">QA Comments</p>
      <p style="margin:0;font-size:13px;color:#374151;">${opts.qaComments}</p>
    </div>` : ''}
    ${appUrl ? ctaButton('View in Neutara', `${appUrl}/infra`, '#16a34a') : ''}
  `;
  await sendGraphEmail(infraDL, subject, layout('Ready for Deployment', '#16a34a', body));
};

// ─── 3. QA Rejected / Sent Back → Dev ────────────────────────────────────────

export const sendDevQARejectionEmail = async (opts: {
  requestNumber: string;
  deploymentTitle: string;
  environment: string;
  devEmail: string;
  devName: string;
  qaUserName: string;
  approvalStatus: 'rejected' | 'sent_back';
  qaComments: string;
}): Promise<void> => {
  if (!opts.devEmail) { logger.warn('No dev email — QA rejection email skipped'); return; }
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || '';

  const isRejected = opts.approvalStatus === 'rejected';
  const accentColor = isRejected ? '#dc2626' : '#d97706';
  const statusLabel = isRejected ? 'Rejected by QA' : 'Sent Back for Revision';
  const subject = `[Neutara] ${statusLabel} — ${opts.requestNumber}: ${opts.deploymentTitle}`;

  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Hi ${opts.devName},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Your deployment request has been <strong style="color:${accentColor};">${statusLabel.toLowerCase()}</strong> by the QA team.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
      ${infoRow('Request #', `<span style="background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-family:monospace;font-weight:700;">${opts.requestNumber}</span>`)}
      ${infoRow('Deployment', opts.deploymentTitle)}
      ${infoRow('Environment', opts.environment)}
      ${infoRow('Reviewed By', opts.qaUserName)}
    </table>
    <div style="background:${isRejected ? '#fef2f2' : '#fffbeb'};border-left:4px solid ${accentColor};padding:12px 16px;border-radius:4px;margin-bottom:16px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">${isRejected ? 'Rejection Reason' : 'Feedback'}</p>
      <p style="margin:0;font-size:13px;color:#374151;">${opts.qaComments}</p>
    </div>
    ${isRejected
      ? '<p style="margin:0 0 16px;font-size:13px;color:#6b7280;">Please address the issues raised and submit a new deployment request.</p>'
      : '<p style="margin:0 0 16px;font-size:13px;color:#6b7280;">Please update the request based on the feedback and resubmit for QA review.</p>'}
    ${appUrl ? ctaButton('View Request', `${appUrl}/deployments`, '#1d4ed8') : ''}
  `;
  await sendGraphEmail(opts.devEmail, subject, layout(statusLabel, accentColor, body));
};

// ─── 4. Deployment Completed → Dev (please acknowledge) ──────────────────────

export const sendDevAcknowledgmentEmail = async (opts: {
  requestNumber: string;
  deploymentTitle: string;
  environment: string;
  devEmail: string;
  devName: string;
  infraUserName: string;
  deploymentNotes?: string;
  dlEmail?: string;
}): Promise<void> => {
  if (!opts.devEmail) { logger.warn('No dev email — acknowledgment email skipped'); return; }
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || '';
  const recipients = [opts.devEmail, opts.dlEmail].filter(Boolean) as string[];

  const subject = `[Neutara] Deployment Successful — Please Acknowledge — ${opts.requestNumber}: ${opts.deploymentTitle}`;
  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Hi ${opts.devName},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Your deployment has been <strong style="color:#16a34a;">completed successfully</strong> by the Infrastructure team. Please log in to acknowledge the deployment.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
      ${infoRow('Request #', `<span style="background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-family:monospace;font-weight:700;">${opts.requestNumber}</span>`)}
      ${infoRow('Deployment', opts.deploymentTitle)}
      ${infoRow('Environment', `<span style="background:#f0fdf4;color:#166534;padding:2px 8px;border-radius:4px;font-weight:600;">${opts.environment}</span>`)}
      ${infoRow('Deployed By', opts.infraUserName)}
    </table>
    ${opts.deploymentNotes ? `<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px 16px;border-radius:4px;margin-bottom:16px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Deployment Notes</p>
      <p style="margin:0;font-size:13px;color:#374151;">${opts.deploymentNotes}</p>
    </div>` : ''}
    <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:4px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#374151;"><strong>Action Required:</strong> Please acknowledge the deployment in Neutara to complete the workflow.</p>
    </div>
    ${appUrl ? ctaButton('Acknowledge Deployment', `${appUrl}/deployments`, '#16a34a') : ''}
  `;
  await sendGraphEmail(recipients, subject, layout('Deployment Successful', '#16a34a', body));
};

// ─── 5. Deployment Failed → Dev ──────────────────────────────────────────────

export const sendDeploymentFailedEmail = async (opts: {
  requestNumber: string;
  deploymentTitle: string;
  environment: string;
  devEmail: string;
  devName: string;
  infraUserName: string;
  failureComments?: string;
  dlEmail?: string;
}): Promise<void> => {
  if (!opts.devEmail) { logger.warn('No dev email — failure email skipped'); return; }
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || '';
  const recipients = [opts.devEmail, opts.dlEmail].filter(Boolean) as string[];

  const subject = `[Neutara] Deployment Failed — ${opts.requestNumber}: ${opts.deploymentTitle}`;
  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Hi ${opts.devName},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Unfortunately, the deployment of your request has <strong style="color:#dc2626;">failed</strong>. Please review the details below and coordinate with the Infrastructure team.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
      ${infoRow('Request #', `<span style="background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-family:monospace;font-weight:700;">${opts.requestNumber}</span>`)}
      ${infoRow('Deployment', opts.deploymentTitle)}
      ${infoRow('Environment', opts.environment)}
      ${infoRow('Attempted By', opts.infraUserName)}
    </table>
    ${opts.failureComments ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;border-radius:4px;margin-bottom:16px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Failure Details</p>
      <p style="margin:0;font-size:13px;color:#374151;">${opts.failureComments}</p>
    </div>` : ''}
    ${appUrl ? ctaButton('View Request', `${appUrl}/deployments`, '#dc2626') : ''}
  `;
  await sendGraphEmail(recipients, subject, layout('Deployment Failed', '#dc2626', body));
};

// ─── 6. Scope Email (multi-project) ──────────────────────────────────────────

export const sendScopeEmail = async (opts: {
  deploymentTitle: string;
  requesterName:   string;
  requesterEmail:  string;
  teamName:        string;
}): Promise<void> => {
  const recipient = process.env.SCOPE_EMAIL_RECIPIENT || opts.requesterEmail;
  const subject = `[Neutara] Project Names Required — ${opts.deploymentTitle}`;
  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">A deployment request that spans multiple projects has been created and requires the full list of affected project names before it can proceed.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
      ${infoRow('Deployment', opts.deploymentTitle)}
      ${infoRow('Requested By', `${opts.requesterName} (${opts.requesterEmail})`)}
      ${infoRow('Team', opts.teamName)}
    </table>
    <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#374151;">Please reply with the complete list of project names that will be affected by this deployment. The submitter will enter them into the deployment form to proceed.</p>
    </div>
  `;
  await sendGraphEmail(recipient, subject, layout('Project Names Required', '#1d4ed8', body), { rethrow: true });
};
