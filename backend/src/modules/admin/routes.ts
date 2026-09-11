import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { eq, desc, sql } from 'drizzle-orm';
import { db, isDatabaseConnected, schema } from '../../db/client.js';
import { mockStore } from '../../db/mock-store.js';
import { successResponse, errorResponse } from '../../utils/response.js';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address').transform((v) => v.toLowerCase().trim()),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().optional(),
  role: z.enum(['user', 'admin']).default('user'),
});

const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').transform((v) => v.toLowerCase().trim()).optional(),
  name: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters long').optional(),
});

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // Protect all admin routes with authentication + admin verification
  fastify.addHook('preHandler', async (request, reply) => {
    await (fastify as any).authenticate(request, reply);
    await (fastify as any).verifyAdmin(request, reply);
  });

  // GET /api/v1/admin/users - List all users with flock counts
  fastify.get('/admin/users', async () => {
    if (isDatabaseConnected()) {
      try {
        const usersList = await db
          .select({
            id: schema.users.id,
            email: schema.users.email,
            name: schema.users.name,
            role: schema.users.role,
            createdAt: schema.users.createdAt,
            flockCount: sql<number>`count(${schema.flocks.id})::int`,
          })
          .from(schema.users)
          .leftJoin(schema.flocks, eq(schema.flocks.userId, schema.users.id))
          .groupBy(schema.users.id, schema.users.email, schema.users.name, schema.users.role, schema.users.createdAt)
          .orderBy(desc(schema.users.createdAt));

        return successResponse(usersList);
      } catch (err: any) {
        // Fall back to mock store
      }
    }

    const mockList = mockStore.users.map((u) => {
      const flocks = mockStore.flocks.filter((f) => f.userId === u.id);
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
        flockCount: flocks.length,
      };
    });

    return successResponse(mockList);
  });

  // POST /api/v1/admin/users - Admin directly creates a user
  fastify.post('/admin/users', async (request, reply) => {
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', parsed.error.format());
    }

    const { email, password, name, role } = parsed.data;

    if (isDatabaseConnected()) {
      try {
        const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
        if (existing) {
          reply.status(409);
          return errorResponse('A user with this email address already exists.', 'EMAIL_ALREADY_EXISTS');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [created] = await db
          .insert(schema.users)
          .values({
            email,
            password: hashedPassword,
            name: name || email.split('@')[0],
            role: role || 'user',
          })
          .returning();

        return successResponse({
          id: created.id,
          email: created.email,
          name: created.name,
          role: created.role,
          createdAt: created.createdAt,
        });
      } catch (err: any) {
        reply.status(500);
        return errorResponse(err.message || 'Database error creating user');
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
      role: role || 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockStore.users.push(mockUser);

    return successResponse({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      role: mockUser.role,
      createdAt: mockUser.createdAt,
    });
  });

  // PATCH /api/v1/admin/users/:userId - Admin directly updates user details or resets password without prior auth
  fastify.patch('/admin/users/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', parsed.error.format());
    }

    const data = parsed.data;

    if (isDatabaseConnected()) {
      try {
        const [targetUser] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
        if (!targetUser) {
          reply.status(404);
          return errorResponse('User account not found', 'NOT_FOUND');
        }

        // If changing email, check for uniqueness
        if (data.email && data.email !== targetUser.email) {
          const [duplicate] = await db.select().from(schema.users).where(eq(schema.users.email, data.email));
          if (duplicate) {
            reply.status(409);
            return errorResponse('A user with this email address already exists.', 'EMAIL_ALREADY_EXISTS');
          }
        }

        const updatePayload: any = {
          updatedAt: new Date(),
        };

        if (data.email) updatePayload.email = data.email;
        if (data.name !== undefined) updatePayload.name = data.name;
        if (data.role) updatePayload.role = data.role;
        if (data.password) {
          updatePayload.password = await bcrypt.hash(data.password, 10);
        }

        const [updated] = await db
          .update(schema.users)
          .set(updatePayload)
          .where(eq(schema.users.id, userId))
          .returning();

        return successResponse({
          id: updated.id,
          email: updated.email,
          name: updated.name,
          role: updated.role,
          updatedAt: updated.updatedAt,
          passwordReset: Boolean(data.password),
        });
      } catch (err: any) {
        reply.status(500);
        return errorResponse(err.message || 'Database error updating user');
      }
    }

    // Fallback store
    const user = mockStore.users.find((u) => u.id === userId);
    if (!user) {
      reply.status(404);
      return errorResponse('User account not found', 'NOT_FOUND');
    }

    if (data.email) user.email = data.email;
    if (data.name !== undefined) user.name = data.name;
    if (data.role) user.role = data.role;
    if (data.password) {
      user.password = await bcrypt.hash(data.password, 10);
    }
    user.updatedAt = new Date();

    return successResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      updatedAt: user.updatedAt,
      passwordReset: Boolean(data.password),
    });
  });

  // DELETE /api/v1/admin/users/:userId - Delete a user and cascade their data
  fastify.delete('/admin/users/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const currentAdmin = (request as any).user;

    // Guard against self-deletion
    if (userId === currentAdmin.id) {
      reply.status(400);
      return errorResponse('You cannot delete your own administrative account.', 'SELF_DELETION_PROHIBITED');
    }

    if (isDatabaseConnected()) {
      try {
        const [targetUser] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
        if (!targetUser) {
          reply.status(404);
          return errorResponse('User account not found', 'NOT_FOUND');
        }

        // Delete user (flocks cascade delete via schema foreign key ON DELETE CASCADE)
        await db.delete(schema.users).where(eq(schema.users.id, userId));

        return successResponse({
          deleted: true,
          id: userId,
          email: targetUser.email,
        });
      } catch (err: any) {
        reply.status(500);
        return errorResponse(err.message || 'Database error deleting user');
      }
    }

    // Fallback store
    const userIndex = mockStore.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) {
      reply.status(404);
      return errorResponse('User account not found', 'NOT_FOUND');
    }

    const [deletedUser] = mockStore.users.splice(userIndex, 1);
    mockStore.flocks = mockStore.flocks.filter((f) => f.userId !== userId);

    return successResponse({
      deleted: true,
      id: userId,
      email: deletedUser.email,
    });
  });
};
