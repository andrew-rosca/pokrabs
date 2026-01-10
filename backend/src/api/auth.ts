/**
 * Authentication API Routes
 * 
 * Handles OAuth authentication flows and session management.
 */

import { Router, Request, Response } from 'express';
import { getOAuthProvider } from '../auth/oauth-provider-factory';
import { getOrganizationRepository, getUserRepository } from '../models/repository-factory';
import { getPrismaClient } from '../database/prisma-client';
import { randomUUID } from 'crypto';

const router = Router();

/**
 * GET /api/auth/mode
 * Get current authentication mode
 * Must come before /:provider route
 */
router.get('/mode', (req: Request, res: Response) => {
  const authMode = process.env.AUTH_MODE || 'demo';
  res.json({ mode: authMode });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 * Must come before /:provider route
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    const userId = session?.userId;

    if (!userId) {
      return res.json({ user: null });
    }

    const prisma = (req as any).prisma || getPrismaClient();
    const userRepo = getUserRepository(prisma);
    const user = await userRepo.findById(userId);

    if (!user) {
      // Clear invalid session
      session.userId = undefined;
      session.organizationId = undefined;
      return res.json({ user: null });
    }

    // Don't expose organizationId or internal fields
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get current user' });
  }
});

/**
 * POST /api/auth/logout
 * Destroy session
 * Must come before /:provider route
 */
router.post('/logout', (req: Request, res: Response) => {
  const session = (req as any).session;
  
  if (session) {
    session.destroy((err: any) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.json({ success: true });
    });
  } else {
    res.json({ success: true });
  }
});

/**
 * GET /api/auth/:provider
 * Initiate OAuth flow for the specified provider
 */
router.get('/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const redirectUri = process.env.OAUTH_CALLBACK_URL || 
      `${req.protocol}://${req.get('host')}/api/auth/${provider}/callback`;
    
    const oauthProvider = getOAuthProvider(provider);
    const state = randomUUID(); // CSRF protection
    
    // Store state in session for verification
    (req as any).session.oauthState = state;
    
    const authUrl = oauthProvider.getAuthUrl(redirectUri, state);
    
    res.redirect(authUrl);
  } catch (error: any) {
    console.error('OAuth initiation error:', error);
    res.status(400).json({ error: error.message || 'Failed to initiate OAuth flow' });
  }
});

/**
 * GET /api/auth/:provider/callback
 * Handle OAuth callback
 */
router.get('/:provider/callback', async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider; // Get provider from URL path parameter
    const { code, state } = req.query;
    const session = (req as any).session;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Authorization code missing' });
    }

    // Verify state (CSRF protection)
    if (state !== session.oauthState) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    // Clear state from session
    delete session.oauthState;

    if (!provider || typeof provider !== 'string') {
      return res.status(400).json({ error: 'Provider missing' });
    }

    const redirectUri = process.env.OAUTH_CALLBACK_URL || 
      `${req.protocol}://${req.get('host')}/api/auth/${provider}/callback`;

    const oauthProvider = getOAuthProvider(provider);
    
    // Exchange code for token
    const tokens = await oauthProvider.getToken(code, redirectUri);
    
    // Get user info from ID token (preferred) or access token
    let userInfo;
    if (tokens.idToken) {
      userInfo = await oauthProvider.verifyIdToken(tokens.idToken);
    } else {
      userInfo = await oauthProvider.getUserInfo(tokens.accessToken);
    }

    // Get default organization
    const prisma = (req as any).prisma || getPrismaClient();
    const organizationRepo = getOrganizationRepository(prisma);
    const defaultOrg = await organizationRepo.findDefault();
    
    if (!defaultOrg) {
      return res.status(500).json({ error: 'Default organization not found' });
    }

    // Find or create user
    const userRepo = getUserRepository(prisma);
    const user = await userRepo.findOrCreateByAuthId({
      organizationId: defaultOrg.id,
      authId: userInfo.id,
      authProvider: provider,
      email: userInfo.email,
      name: userInfo.name,
    });

    // Create session
    session.userId = user.id;
    session.organizationId = user.organizationId;

    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(frontendUrl);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(400).json({ error: error.message || 'OAuth callback failed' });
  }
});


export default router;

