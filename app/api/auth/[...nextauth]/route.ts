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

                    if (!email) return false;

                    // Ensure email is a string for the query
                    let dbUser = await User.findOne({ email: email as string });

                    if (!dbUser) {
                        dbUser = await User.create({
                            name: name || 'User',
                            email: email as string,
                            image: image || undefined, // Handle null/undefined
                        });
                    } else {
                        // Update last login
                        dbUser.lastLoginAt = new Date();
                        await dbUser.save();
                    }
                    return true;
                } catch (error) {
                    console.error('Error in signIn callback:', error);
                    return false;
                }
            }
            return true;
        },
        async session({ session, token }) {
            if (session?.user && token?.sub) {
                // Pass the user ID to the session
                // @ts-ignore
                session.user.id = token.sub;

                // Also fetch the internal MongoDB ID
                try {
                    await dbConnect();
                    if (session.user.email) {
                        // FIX: Ensure email is string and handle potential connection errors gracefully
                        const dbUser = await User.findOne({ email: session.user.email });
                        if (dbUser) {
                            // @ts-ignore
                            session.user.dbId = dbUser._id.toString();
                        }
                    }
                } catch (error) {
                    console.error('Error fetching user in session callback:', error);
                    // Do NOT throw here, just return session without dbId to prevent 500
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
