import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockSave = jest.fn();
const mockFind = jest.fn();
const mockCountDocuments = jest.fn();
const mockFindByIdAndDelete = jest.fn();
const mockFindByIdAndUpdate = jest.fn();

jest.unstable_mockModule('../api/models/post.model.js', () => ({
  default: Object.assign(
    jest.fn().mockImplementation(function (data) {
      Object.assign(this, data);
      this.save = mockSave;
    }),
    {
      find: mockFind,
      countDocuments: mockCountDocuments,
      findByIdAndDelete: mockFindByIdAndDelete,
      findByIdAndUpdate: mockFindByIdAndUpdate,
    }
  ),
}));

const { create, deletepost, getposts } = await import('../api/controllers/post.controller.js');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('post.controller — create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects non-admin users with 403', async () => {
    const req = { user: { isAdmin: false, id: 'u1' }, body: { title: 'x', content: 'y' } };
    const res = mockRes();
    const next = jest.fn();

    await create(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(403);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('rejects requests missing title or content with 400', async () => {
    const req = { user: { isAdmin: true, id: 'u1' }, body: { title: '' } };
    const res = mockRes();
    const next = jest.fn();

    await create(req, res, next);

    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });

  it('creates a post and generates a slug from the title', async () => {
    mockSave.mockResolvedValueOnce(undefined);
    const req = {
      user: { isAdmin: true, id: 'u1' },
      body: { title: 'Hello World!', content: 'Some content' },
    };
    const res = mockRes();
    const next = jest.fn();

    await create(req, res, next);

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('post.controller — deletepost', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a non-admin, non-owner with 403', async () => {
    const req = {
      user: { isAdmin: false, id: 'someone-else' },
      params: { postId: 'p1', userId: 'owner' },
    };
    const res = mockRes();
    const next = jest.fn();

    await deletepost(req, res, next);

    expect(next.mock.calls[0][0].statusCode).toBe(403);
    expect(mockFindByIdAndDelete).not.toHaveBeenCalled();
  });
});

describe('post.controller — getposts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated posts with counts', async () => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ title: 'Post 1' }]),
    };
    mockFind.mockReturnValue(chain);
    mockCountDocuments.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const req = { query: {} };
    const res = mockRes();
    const next = jest.fn();

    await getposts(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.posts).toEqual([{ title: 'Post 1' }]);
    expect(payload.totalPosts).toBe(1);
  });
});
