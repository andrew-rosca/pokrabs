/**
 * Google OAuth Provider Implementation
 * 
 * Implements IOAuthProvider for Google OAuth 2.0.
 */

import { OAuth2Client } from 'google-auth-library';
import { IOAuthProvider, OAuthToken, OAuthUserInfo } from '../oauth-provider';

export class GoogleOAuthProvider implements IOAuthProvider {
  private client: OAuth2Client;
  private clientId: string;
  private clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.client = new OAuth2Client(clientId, clientSecret);
  }

  getAuthUrl(redirectUri: string, state?: string): string {
    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      redirect_uri: redirectUri,
      state,
    });
  }

  async getToken(code: string, redirectUri: string): Promise<OAuthToken> {
    const { tokens } = await this.client.getToken({
      code,
      redirect_uri: redirectUri,
    });

    return {
      accessToken: tokens.access_token!,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expiry_date
        ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
        : undefined,
    };
  }

  async getUserInfo(token: string): Promise<OAuthUserInfo> {
    // For Google, we can use the ID token or make an API call
    // Using the token info endpoint is simpler
    const ticket = await this.client.verifyIdToken({
      idToken: token,
      audience: this.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid token payload');
    }

    return {
      id: payload.sub,
      email: payload.email!,
      name: payload.name || payload.email!,
    };
  }

  async verifyIdToken(idToken: string): Promise<OAuthUserInfo> {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid ID token');
    }

    return {
      id: payload.sub,
      email: payload.email!,
      name: payload.name || payload.email!,
    };
  }
}

