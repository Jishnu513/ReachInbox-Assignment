import express, { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { requireAuth } from '../middleware/requireAuth';

// Configure Passport Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const avatar = profile.photos?.[0]?.value;

        if (!email) {
          return done(new Error('No email from Google profile'));
        }

        // Upsert user in DB
        const user = await prisma.user.upsert({
          where: { googleId: profile.id },
          update: { name: profile.displayName, avatar, email },
          create: {
            googleId: profile.id,
            name: profile.displayName,
            email,
            avatar,
          },
        });

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    },
  ),
);

const router: Router = express.Router();

// Redirect to Google OAuth
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  }),
);

// Google OAuth Callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${env.FRONTEND_URL}?error=auth_failed` }),
  (req, res) => {
    const user = req.user as unknown as { id: string; email: string; name: string; avatar?: string };

    // Sign JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, avatar: user.avatar },
      env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    // Redirect to frontend with token
    res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}`);
  },
);

// Get current user info
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Logout (client-side token deletion, but we acknowledge it)
router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
