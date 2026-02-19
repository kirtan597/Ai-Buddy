import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === 'google') {
                try {
                    await dbConnect();
                    const { name, email, image } = user;

                    if (!email) return true; // Allow sign in even if email missing? No, but proceed.

                    // Best effort to create/update user
                    try {
                        let dbUser = await User.findOne({ email: email as string });
                        if (!dbUser) {
                            await User.create({
                                name: name || 'User',
                                email: email as string,
                                image: image || undefined,
                            });
                        } else {
                            dbUser.lastLoginAt = new Date();
                            await dbUser.save();
                        }
                    } catch (dbError) {
                        console.error('DB Error in signIn (proceeding):', dbError);
                        // Allow sign in to proceed even if DB write fails
                    }
                    return true;
                } catch (error) {
                    console.error('Error in signIn callback:', error);
                    return true; // Use true to allow login even on error
                }
            }
            return true;
        },
        async session({ session, token }) {
            if (session?.user && token?.sub) {
                // Pass the user ID to the session
                // @ts-ignore
                session.user.id = token.sub;

                // Also fetch the internal MongoDB ID (Best Effort)
                try {
                    await dbConnect();
                    if (session.user.email) {
                        const dbUser = await User.findOne({ email: session.user.email });
                        if (dbUser) {
                            // @ts-ignore
                            session.user.dbId = dbUser._id.toString();
                        }
                    }
                } catch (error) {
                    console.error('Error fetching user in session callback (proceeding):', error);
                    // Return session without dbId
                }
            }
            return session;
        },
    },
    pages: {
        signIn: '/',
        error: '/',
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
