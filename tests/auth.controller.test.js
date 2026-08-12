import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the User model and bcryptjs/jwt BEFORE importing the controller,
// since ESM module mocking must be registered ahead of the import that uses it.
const mockFindOne = jest.fn();
const mockSave = jest.fn();

jest.unstable_mockModule('../api/models/user.model.js', () => ({
  default: jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    this.save = mockSave;
    this._doc = { ...data, _id: 'mock-user-id' };
  }),
}));

// Attach static findOne to the mocked constructor after the mock is defined
const UserModule = await import('../api/models/user.model.js');
UserModule.default.findOne = mockFindOne;

const { signup, signin } = await import('../api/controllers/auth.controller.js');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
}

describe('auth.controller — signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('saves a new user and responds with success on valid input', async () => {
    mockSave.mockResolvedValueOnce(undefined);
    const req = {
      body: { username: 'johndoe1', email: 'john@example.com', password: 'secret123' },
    };
    const res = mockRes();
    const next = jest.fn();

    await signup(req, res, next);

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith('Signup successful');
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards an error to next() if save() fails (e.g. duplicate email)', async () => {
    const dbError = new Error('E11000 duplicate key error');
    mockSave.mockRejectedValueOnce(dbError);
    const req = {
      body: { username: 'johndoe1', email: 'dup@example.com', password: 'secret123' },
    };
    const res = mockRes();
    const next = jest.fn();

    await signup(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
  });
});

describe('auth.controller — signin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('returns 404 via next() when the user does not exist', async () => {
    mockFindOne.mockResolvedValueOnce(null);
    const req = { body: { email: 'nobody@example.com', password: 'whatever' } };
    const res = mockRes();
    const next = jest.fn();

    await signin(req, res, next);

    expect(next).toHaveBeenCalled();
    const errArg = next.mock.calls[0][0];
    expect(errArg.statusCode).toBe(404);
  });

  it('returns 400 via next() when the password is invalid', async () => {
    const bcryptjs = (await import('bcryptjs')).default;
    const hashed = bcryptjs.hashSync('correct-password', 10);
    mockFindOne.mockResolvedValueOnce({
      _id: 'mock-id',
      isAdmin: false,
      password: hashed,
      _doc: { password: hashed, email: 'john@example.com' },
    });

    const req = { body: { email: 'john@example.com', password: 'wrong-password' } };
    const res = mockRes();
    const next = jest.fn();

    await signin(req, res, next);

    expect(next).toHaveBeenCalled();
    const errArg = next.mock.calls[0][0];
    expect(errArg.statusCode).toBe(400);
  });

  it('sets an auth cookie and returns the user (minus password) on valid login', async () => {
    const bcryptjs = (await import('bcryptjs')).default;
    const hashed = bcryptjs.hashSync('correct-password', 10);
    mockFindOne.mockResolvedValueOnce({
      _id: 'mock-id',
      isAdmin: false,
      password: hashed,
      _doc: { password: hashed, email: 'john@example.com', username: 'johndoe1' },
    });

    const req = { body: { email: 'john@example.com', password: 'correct-password' } };
    const res = mockRes();
    const next = jest.fn();

    await signin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, maxAge: expect.any(Number) })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    // password must never be in the response body
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.password).toBeUndefined();
  });
});
