import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { limitLogin } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter both email and password");
        }

        // Apply rate limit on credentials login attempts
        const rateLimitCheck = limitLogin(credentials.email);
        if (!rateLimitCheck.success) {
          throw new Error(rateLimitCheck.message);
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: {
            teacher: {
              select: { schoolId: true },
            },
            parent: {
              select: { schoolId: true },
            },
            principalSchools: {
              select: { id: true },
              take: 1,
            },
          },
        });

        if (!user || !user.isActive) {
          throw new Error("Invalid credentials or inactive account");
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        // Determine schoolId based on the role
        let schoolId: string | null = null;
        if (user.role === Role.TEACHER) {
          schoolId = user.teacher?.schoolId ?? null;
        } else if (user.role === Role.PARENT) {
          schoolId = user.parent?.schoolId ?? null;
        } else if (user.role === Role.PRINCIPAL) {
          schoolId = user.principalSchools[0]?.id ?? null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          schoolId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours (standard school day)
  },
  jwt: {
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.schoolId = user.schoolId;
        token.avatar = user.avatar;
        // Keep initial password hash reference
        const dbUser = await db.user.findUnique({ where: { id: user.id } });
        if (dbUser) {
          token.passwordHash = dbUser.password;
        }
      }

      // Check dynamically if role or password changed
      if (token && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
        });

        if (!dbUser || !dbUser.isActive) {
          return {} as any; // Invalidates/clears session
        }

        if (token.passwordHash && dbUser.password !== token.passwordHash) {
          return {} as any; // Password changed, logout immediately
        }

        // If role updated, regenerate token values dynamically
        if (dbUser.role !== token.role) {
          token.role = dbUser.role;
          let schoolId: string | null = null;
          if (dbUser.role === Role.TEACHER) {
            const tProfile = await db.teacher.findUnique({ where: { userId: dbUser.id } });
            schoolId = tProfile?.schoolId ?? null;
          } else if (dbUser.role === Role.PARENT) {
            const pProfile = await db.parent.findFirst({ where: { userId: dbUser.id } });
            schoolId = pProfile?.schoolId ?? null;
          } else if (dbUser.role === Role.PRINCIPAL) {
            const principalSchools = await db.school.findMany({ where: { principalId: dbUser.id }, take: 1 });
            schoolId = principalSchools[0]?.id ?? null;
          }
          token.schoolId = schoolId;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token && token.id) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.schoolId = token.schoolId;
        session.user.avatar = token.avatar;
      } else {
        session.user = null as any;
      }
      return session;
    },
  },
};
