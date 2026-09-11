import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.js';

describe('Authentication, Flock Ownership Scoping & Admin Management', () => {
  it('registers a new user, hashes password and issues JWT', async () => {
    const app = await buildApp();
    const testEmail = `test_${Date.now()}@farmtest.com`;

    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: testEmail,
        password: 'Password123!',
        name: 'Unit Tester',
      },
    });

    expect(registerRes.statusCode).toBe(200);
    const body = JSON.parse(registerRes.body);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.email).toBe(testEmail.toLowerCase());
    expect(body.data.user.role).toBe('user');
    expect(body.data.user.password).toBeUndefined(); // ensure password hash not leaked
  });

  it('rejects duplicate email registration with 409', async () => {
    const app = await buildApp();
    const testEmail = `duplicate_${Date.now()}@farmtest.com`;

    // First registration
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: testEmail, password: 'Password123!' },
    });

    // Second registration with same email
    const duplicateRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: testEmail, password: 'Password456!' },
    });

    expect(duplicateRes.statusCode).toBe(409);
    const body = JSON.parse(duplicateRes.body);
    expect(body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('authenticates with correct password and rejects invalid password', async () => {
    const app = await buildApp();
    const testEmail = `login_${Date.now()}@farmtest.com`;

    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: testEmail, password: 'CorrectPassword123!' },
    });

    // Bad password
    const badLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: testEmail, password: 'WrongPassword' },
    });
    expect(badLogin.statusCode).toBe(401);

    // Correct password
    const goodLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: testEmail, password: 'CorrectPassword123!' },
    });
    expect(goodLogin.statusCode).toBe(200);
    const body = JSON.parse(goodLogin.body);
    expect(body.data.token).toBeDefined();
  });

  it('enforces flock isolation: User B cannot see or modify User A flock', async () => {
    const app = await buildApp();

    // Register User A
    const userARes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: `usera_${Date.now()}@farmtest.com`, password: 'Password123!' },
    });
    const tokenA = JSON.parse(userARes.body).data.token;

    // Register User B
    const userBRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: `userb_${Date.now()}@farmtest.com`, password: 'Password123!' },
    });
    const tokenB = JSON.parse(userBRes.body).data.token;

    // User A creates flock
    const createFlockRes = await app.inject({
      method: 'POST',
      url: '/api/v1/flocks',
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: {
        name: 'User A Private Flock',
        startDate: '2026-09-01',
        initialBirds: 1000,
        eggTrackingEnabled: false,
      },
    });
    expect(createFlockRes.statusCode).toBe(201);
    const flockAId = JSON.parse(createFlockRes.body).data.id;

    // User B lists flocks -> flockA must NOT be in User B list
    const listBRes = await app.inject({
      method: 'GET',
      url: '/api/v1/flocks',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const userBFlocks = JSON.parse(listBRes.body).data;
    expect(userBFlocks.some((f: any) => f.id === flockAId)).toBe(false);

    // User B attempts to get User A flock directly -> must be rejected with 403
    const getDirectRes = await app.inject({
      method: 'GET',
      url: `/api/v1/flocks/${flockAId}`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(getDirectRes.statusCode).toBe(403);

    // User B attempts to delete User A flock -> must be rejected with 403
    const deleteDirectRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/flocks/${flockAId}`,
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(deleteDirectRes.statusCode).toBe(403);
  });

  it('admin can list, create, directly reset passwords without prior auth, and delete users', async () => {
    const app = await buildApp();

    // Login as Admin
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@farm.com', password: 'Admin@Farm2026!' },
    });
    expect(adminLogin.statusCode).toBe(200);
    const adminToken = JSON.parse(adminLogin.body).data.token;

    // Admin lists all users
    const usersListRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(usersListRes.statusCode).toBe(200);
    const usersList = JSON.parse(usersListRes.body).data;
    expect(Array.isArray(usersList)).toBe(true);
    expect(usersList.some((u: any) => u.email === 'mujeeb@gmail.com')).toBe(true);

    // Admin creates a managed user directly
    const managedEmail = `managed_${Date.now()}@farmtest.com`;
    const createUserRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        email: managedEmail,
        password: 'InitialPassword123!',
        name: 'Direct Managed User',
        role: 'user',
      },
    });
    expect(createUserRes.statusCode).toBe(200);
    const managedUserId = JSON.parse(createUserRes.body).data.id;

    // Admin directly overrides password without needing old password
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${managedUserId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        password: 'NewDirectPassword999!',
        name: 'Updated Name by Admin',
      },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(JSON.parse(updateRes.body).data.passwordReset).toBe(true);

    // The user can now log in with the new password
    const loginWithNewPassword = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: managedEmail, password: 'NewDirectPassword999!' },
    });
    expect(loginWithNewPassword.statusCode).toBe(200);

    // Admin deletes the user
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${managedUserId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(JSON.parse(deleteRes.body).data.deleted).toBe(true);
  });
});
