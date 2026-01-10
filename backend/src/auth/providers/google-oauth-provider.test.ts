/**
 * Tests for Google OAuth Provider
 * 
 * Tests the Google OAuth provider implementation with mocked Google Auth Library.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OAuth2Client } from 'google-auth-library';
import { GoogleOAuthProvider } from './google-oauth-provider';

// Mock google-auth-library
vi.mock('google-auth-library', () => {
  const mockGenerateAuthUrl = vi.fn(() => '');
  const mockGetToken = vi.fn(() => Promise.resolve({ tokens: {} }));
  const mockVerifyIdToken = vi.fn(() => Promise.resolve({ getPayload: () => null }));

  class MockOAuth2Client {
    generateAuthUrl = mockGenerateAuthUrl;
    getToken = mockGetToken;
    verifyIdToken = mockVerifyIdToken;
    constructor(clientId: string, clientSecret: string) {
      // Constructor for OAuth2Client
    }
  }

  return {
    OAuth2Client: MockOAuth2Client,
    __mocks: {
      generateAuthUrl: mockGenerateAuthUrl,
      getToken: mockGetToken,
      verifyIdToken: mockVerifyIdToken,
    },
  };
});

describe('GoogleOAuthProvider', () => {
  const clientId = 'test-client-id';
  const clientSecret = 'test-client-secret';
  let provider: GoogleOAuthProvider;
  let mocks: {
    generateAuthUrl: ReturnType<typeof vi.fn>;
    getToken: ReturnType<typeof vi.fn>;
    verifyIdToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    // Get the mocked functions
    const googleAuthModule = await import('google-auth-library');
    mocks = (googleAuthModule as any).__mocks;

    // Reset mocks
    mocks.generateAuthUrl.mockReset();
    mocks.getToken.mockReset();
    mocks.verifyIdToken.mockReset();

    provider = new GoogleOAuthProvider(clientId, clientSecret);
  });

  describe('getAuthUrl', () => {
    it('should generate authorization URL with correct parameters', () => {
      const redirectUri = 'http://localhost:3001/api/auth/google/callback';
      const state = 'test-state-123';
      const expectedUrl = 'https://accounts.google.com/o/oauth2/v2/auth?test=params';

      mocks.generateAuthUrl.mockReturnValue(expectedUrl);

      const url = provider.getAuthUrl(redirectUri, state);

      expect(mocks.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: ['openid', 'email', 'profile'],
        redirect_uri: redirectUri,
        state,
      });
      expect(url).toBe(expectedUrl);
    });

    it('should generate authorization URL without state', () => {
      const redirectUri = 'http://localhost:3001/api/auth/google/callback';
      const expectedUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

      mocks.generateAuthUrl.mockReturnValue(expectedUrl);

      const url = provider.getAuthUrl(redirectUri);

      expect(mocks.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: ['openid', 'email', 'profile'],
        redirect_uri: redirectUri,
        state: undefined,
      });
      expect(url).toBe(expectedUrl);
    });
  });

  describe('getToken', () => {
    it('should exchange code for token', async () => {
      const code = 'test-auth-code';
      const redirectUri = 'http://localhost:3001/api/auth/google/callback';
      const mockTokens = {
        access_token: 'test-access-token',
        id_token: 'test-id-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000, // 1 hour from now
      };

      mocks.getToken.mockResolvedValue({
        tokens: mockTokens,
      });

      const result = await provider.getToken(code, redirectUri);

      expect(mocks.getToken).toHaveBeenCalledWith({
        code,
        redirect_uri: redirectUri,
      });
      expect(result.accessToken).toBe('test-access-token');
      expect(result.idToken).toBe('test-id-token');
      expect(result.refreshToken).toBe('test-refresh-token');
      expect(result.expiresIn).toBeDefined();
    });

    it('should handle token without expiry', async () => {
      const code = 'test-auth-code';
      const redirectUri = 'http://localhost:3001/api/auth/google/callback';
      const mockTokens = {
        access_token: 'test-access-token',
        id_token: 'test-id-token',
      };

      mocks.getToken.mockResolvedValue({
        tokens: mockTokens,
      });

      const result = await provider.getToken(code, redirectUri);

      expect(result.accessToken).toBe('test-access-token');
      expect(result.expiresIn).toBeUndefined();
    });
  });

  describe('getUserInfo', () => {
    it('should get user info from access token', async () => {
      const token = 'test-access-token';
      const mockPayload = {
        sub: 'google-user-123',
        email: 'user@example.com',
        name: 'Test User',
      };

      const mockTicket = {
        getPayload: () => mockPayload,
      };

      mocks.verifyIdToken.mockResolvedValue(mockTicket);

      const result = await provider.getUserInfo(token);

      expect(mocks.verifyIdToken).toHaveBeenCalledWith({
        idToken: token,
        audience: clientId,
      });
      expect(result.id).toBe('google-user-123');
      expect(result.email).toBe('user@example.com');
      expect(result.name).toBe('Test User');
    });

    it('should use email as name if name is not provided', async () => {
      const token = 'test-access-token';
      const mockPayload = {
        sub: 'google-user-123',
        email: 'user@example.com',
      };

      const mockTicket = {
        getPayload: () => mockPayload,
      };

      mocks.verifyIdToken.mockResolvedValue(mockTicket);

      const result = await provider.getUserInfo(token);

      expect(result.name).toBe('user@example.com');
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid-token';

      mocks.verifyIdToken.mockResolvedValue({
        getPayload: () => null,
      });

      await expect(provider.getUserInfo(token)).rejects.toThrow('Invalid token payload');
    });
  });

  describe('verifyIdToken', () => {
    it('should verify and extract user info from ID token', async () => {
      const idToken = 'test-id-token';
      const mockPayload = {
        sub: 'google-user-456',
        email: 'oauth@example.com',
        name: 'OAuth User',
      };

      const mockTicket = {
        getPayload: () => mockPayload,
      };

      mocks.verifyIdToken.mockResolvedValue(mockTicket);

      const result = await provider.verifyIdToken(idToken);

      expect(mocks.verifyIdToken).toHaveBeenCalledWith({
        idToken,
        audience: clientId,
      });
      expect(result.id).toBe('google-user-456');
      expect(result.email).toBe('oauth@example.com');
      expect(result.name).toBe('OAuth User');
    });

    it('should throw error for invalid ID token', async () => {
      const idToken = 'invalid-id-token';

      mocks.verifyIdToken.mockResolvedValue({
        getPayload: () => null,
      });

      await expect(provider.verifyIdToken(idToken)).rejects.toThrow('Invalid ID token');
    });
  });
});

