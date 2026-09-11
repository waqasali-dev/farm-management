import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, isDatabaseConnected, schema } from '../../db/client.js';
import { mockStore } from '../../db/mock-store.js';
import { successResponse, errorResponse } from '../../utils/response.js';

const registerSchema = z.object({
  email: z.string().email('Invalid email address').transform((v) => v.toLowerCase().trim()),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().min(1, 'Name cannot be empty').optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/auth/register
  fastify.post('/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', parsed.error.format());
    }

    const { email, password, name } = parsed.data;

    if (isDatabaseConnected()) {
      try {
        const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
        if (existing) {
          reply.status(409);
          return errorResponse('A user with this email address already exists.', 'EMAIL_ALREADY_EXISTS');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [newUser] = await db
          .insert(schema.users)
          .values({
            email,
            password: hashedPassword,
            name: name || email.split('@')[0],
            role: 'user',
          })
          .returning();

        const token = fastify.jwt.sign(
          {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
          },
          { expiresIn: '30d' }
        );

        return successResponse({
          token,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            createdAt: newUser.createdAt,
          },
        });
      } catch (err: any) {
        reply.status(500);
        return errorResponse(err.message || 'Database error during registration');
      }
    }

    // Fallback store
    const existing = mockStore.users.find((u) => u.email.toLowerCase() === email);
    if (existing) {
      reply.status(409);
      return errorResponse('A user with this email address already exists.', 'EMAIL_ALREADY_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const mockUser = {
      id: crypto.randomUUID(),
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      role: 'user' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockStore.users.push(mockUser);

    const token = fastify.jwt.sign(
      {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      },
      { expiresIn: '30d' }
    );

    return successResponse({
      token,
      user: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
      },
    });
  });

  // POST /api/v1/auth/login
  fastify.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', parsed.error.format());
    }

    const { email, password } = parsed.data;

    if (isDatabaseConnected()) {
      try {
        const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
        if (!user) {
          reply.status(401);
          return errorResponse('Invalid email address or password.', 'INVALID_CREDENTIALS');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          reply.status(401);
          return errorResponse('Invalid email address or password.', 'INVALID_CREDENTIALS');
        }

        const token = fastify.jwt.sign(
          {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          { expiresIn: '30d' }
        );

        return successResponse({
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt,
          },
        });
      } catch (err: any) {
        reply.status(500);
        return errorResponse(err.message || 'Database error during login');
      }
    }

    // Fallback store
    const user = mockStore.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      reply.status(401);
      return errorResponse('Invalid email address or password.', 'INVALID_CREDENTIALS');
    }

    // If fallback password is empty or matches bcrypt
    let isMatch = false;
    if (!user.password) {
      isMatch = true;
    } else {
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      reply.status(401);
      return errorResponse('Invalid email address or password.', 'INVALID_CREDENTIALS');
    }

    const token = fastify.jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      { expiresIn: '30d' }
    );

    return successResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  });

  // GET /api/v1/auth/me
  fastify.get('/auth/me', { preHandler: [(fastify as any).authenticate] }, async (request, reply) => {
    const authUser = (request as any).user;

    if (isDatabaseConnected()) {
      try {
        const [user] = await db.select().from(schema.users).where(eq(schema.users.id, authUser.id));
        if (!user) {
          reply.status(404);
          return errorResponse('User account not found', 'NOT_FOUND');
        }

        return successResponse({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        });
      } catch (err: any) {
        reply.status(500);
        return errorResponse(err.message || 'Database error fetching user profile');
      }
    }

    const user = mockStore.users.find((u) => u.id === authUser.id);
    if (!user) {
      reply.status(404);
      return errorResponse('User account not found', 'NOT_FOUND');
    }

    return successResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    });
  });
};
