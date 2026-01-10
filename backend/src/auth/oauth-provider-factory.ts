/**
 * OAuth Provider Factory
 * 
 * Factory for creating OAuth provider instances based on provider name.
 */

import { IOAuthProvider } from './oauth-provider';
import { GoogleOAuthProvider } from './providers/google-oauth-provider';

/**
 * Get OAuth provider instance for the specified provider
 * 
 * @param provider - Provider name (e.g., "google", "github", "microsoft")
 * @returns OAuth provider instance
 * @throws Error if provider is not supported or configuration is missing
 */
export function getOAuthProvider(provider: string): IOAuthProvider {
  switch (provider.toLowerCase()) {
    case 'google':
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error(
          'Google OAuth configuration missing: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set'
        );
      }

      return new GoogleOAuthProvider(clientId, clientSecret);

    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}

