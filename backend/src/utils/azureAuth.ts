import jwt from 'jsonwebtoken';

export interface AzureTokenPayload {
  oid: string;
  preferred_username: string;
  email?: string;
  name: string;
  sub: string;
  tid: string;
  exp: number;
}

// Decodes an Azure ID token received directly from Azure's token endpoint.
// No signature verification needed — the token came server-to-server via
// our client_secret exchange, so it's already trusted.
export const decodeAzureToken = (token: string): AzureTokenPayload => {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid Azure token format');
  }
  return decoded as AzureTokenPayload;
};
