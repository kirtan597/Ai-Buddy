import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            authorization: {
                params: {
                    prompt: 'consent',
                    access_type: 'offline',
                    response_type: 'code',
                },
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === 'google') {
                try {
                    await dbConnect();
                    const { name, email, image } = user;

                    if (!email) {
                        console.error('[Auth] Google sign-in: no email in user object');
                        return false; // Reject sign in without email
                    }

                    // Upsert user: create if not exists, update lastLoginAt if exists
                    await User.findOneAndUpdate(
                        { email },
                        {
                            $set: {
                                name: name || 'User',
                                image: image || undefined,
                                lastLoginAt: new Date(),
                            },
                            $setOnInsert: { email }, // Only set email on first insert
                        },
                        {
                            upsert: true,
                            new: true,
                            setDefaultsOnInsert: true,
                        }
                    );

                    console.log(`[Auth] User signed in: ${email}`);
                    return true;
                } catch (error) {
                    console.error('[Auth] DB error during sign in (allowing anyway):', error);
                    // Still allow sign in even if DB write fails
                    return true;
                }
            }
            return true;
        },

        async jwt({ token, user, account }) {
            // On initial sign in, 'user' and 'account' are populated.
            // On subsequent requests, only 'token' is populated.
            if (account && user) {
                token.provider = account.provider;
                try {
                    await dbConnect();
                    const dbUser = await User.findOne({ email: user.email });
                    if (dbUser) {
                        token.dbId = dbUser._id.toString();
                    }
                } catch (error) {
                    console.error('[Auth] Failed to fetch dbId for JWT (non-fatal):', error);
                }
            }
            return token;
        },

        async session({ session, token }) {
            // JWT is already populated from the jwt() callback above.
            // We read from token here — NO extra DB call needed on every request.
            if (session?.user) {
                // @ts-ignore
                session.user.id = token.sub;
                // @ts-ignore
                session.user.dbId = token.dbId as string | undefined;
            }
            return session;
        },
    },
    pages: {
        signIn: '/',
        error: '/',
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development', // Enable debug logs in dev mode
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
