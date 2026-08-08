import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import env, { frontendOrigins, isProduction } from '@/config/env';
import { sendEmail } from '@/lib/utils/email';
import { AUTH_PREFIX } from '@/lib/constants';
import { betterAuth } from 'better-auth';
import { db, schema } from '@/db';

export const auth = betterAuth({
  appName: 'Realtime Chat',
  baseURL: env.BETTER_AUTH_URL,
  basePath: AUTH_PREFIX,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: frontendOrigins,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Reset your password',
        text: `Hi ${user.name}, reset your password using this link: ${url}`,
        html: `<p>Hi ${user.name},</p><p>Reset your password using <a href="${url}">this link</a>.</p>`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Verify your email',
        text: `Hi ${user.name}, verify your email using this link: ${url}`,
        html: `<p>Hi ${user.name},</p><p>Verify your email using <a href="${url}">this link</a>.</p>`,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      prompt: 'select_account',
      accessType: 'offline',
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60,
    },
  },
  advanced: {
    useSecureCookies: isProduction,
    defaultCookieAttributes: {
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      httpOnly: true,
    },
  },
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
