/**
 * OAuth Provider Interface
 * 
 * Abstract interface for OAuth provider implementations.
 * Allows for easy addition of new OAuth providers (GitHub, Microsoft, etc.).
 */

/**
 * OAuth token response
 */
export interface OAuthToken {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

/**
 * OAuth user information
 */
export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
}

/**
 * OAuth Provider Interface
 */
export interface IOAuthProvider {
  /**
   * Generate OAuth authorization URL
   * @param redirectUri - The callback URL to redirect to after authorization
   * @param state - Optional state parameter for CSRF protection
   * @returns Authorization URL
   */
  getAuthUrl(redirectUri: string, state?: string): string;

  /**
   * Exchange authorization code for access token
   * @param code - Authorization code from OAuth callback
   * @param redirectUri - The callback URL used in authorization
   * @returns OAuth token response
   */
  getToken(code: string, redirectUri: string): Promise<OAuthToken>;

  /**
   * Get user information from access token
   * @param token - Access token
   * @returns User information
   */
  getUserInfo(token: string): Promise<OAuthUserInfo>;

  /**
   * Verify and extract user information from ID token
   * @param idToken - ID token from OAuth response
   * @returns User information
   */
  verifyIdToken(idToken: string): Promise<OAuthUserInfo>;
}

