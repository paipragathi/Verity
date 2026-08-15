import Post from '../models/post.model.js';
import { errorHandler } from '../utils/error.js';
import { cacheGet, cacheSet, cacheInvalidatePrefix } from '../utils/cache.js';

const POSTS_CACHE_PREFIX = 'posts:list:';

export const create = async (req, res, next) => {
  if (!req.user.isAdmin) {
    return next(errorHandler(403, 'You are not allowed to create a post'));
  }
  if (!req.body.title || !req.body.content) {
    return next(errorHandler(400, 'Please provide all required fields'));
  }
  const slug = req.body.title
    .split(' ')
    .join('-')
    .toLowerCase()
    .replace(/[^a-zA-Z0-9-]/g, '');
  const newPost = new Post({
    ...req.body,
    slug,
    userId: req.user.id,
  });
  try {
    const savedPost = await newPost.save();
    await cacheInvalidatePrefix(POSTS_CACHE_PREFIX);
    res.status(201).json(savedPost);
  } catch (error) {
    next(error);
  }
};

export const getposts = async (req, res, next) => {
  try {
    const startIndex = parseInt(req.query.startIndex) || 0;
    const limit = parseInt(req.query.limit) || 9;
    const sortDirection = req.query.order === 'asc' ? 1 : -1;

    // Cache key must encode every query param that affects the result —
    // a stable, sorted serialization so equivalent requests (regardless
    // of param order) hit the same cache entry.
    const cacheKey =
      POSTS_CACHE_PREFIX +
      JSON.stringify({
        startIndex,
        limit,
        sortDirection,
        userId: req.query.userId || null,
        category: req.query.category || null,
        slug: req.query.slug || null,
        postId: req.query.postId || null,
        searchTerm: req.query.searchTerm || null,
      });

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json({ ...cached, _cache: 'HIT' });
    }

    const query = {
      ...(req.query.userId && { userId: req.query.userId }),
      ...(req.query.category && { category: req.query.category }),
      ...(req.query.slug && { slug: req.query.slug }),
      ...(req.query.postId && { _id: req.query.postId }),
      // MongoDB text index (title + content, see post.model.js) instead of
      // the previous unanchored $regex scan. Trade-off, documented: this
      // is word/stem-based matching (via MongoDB's text search), not
      // substring matching — searching "cat" will no longer match
      // "category" the way $regex did, but it can now use an index
      // instead of scanning every document on every search request.
      ...(req.query.searchTerm && {
        $text: { $search: req.query.searchTerm },
      }),
    };

    const posts = await Post.find(query)
      .sort({ updatedAt: sortDirection })
      .skip(startIndex)
      .limit(limit);

    const totalPosts = await Post.countDocuments();

    const now = new Date();

    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );

    const lastMonthPosts = await Post.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    const responseBody = { posts, totalPosts, lastMonthPosts };

    // Fire-and-forget — cacheSet never throws, and the response doesn't
    // need to wait on the cache write completing.
    cacheSet(cacheKey, responseBody);

    res.status(200).json({ ...responseBody, _cache: 'MISS' });
  } catch (error) {
    next(error);
  }
};

export const deletepost = async (req, res, next) => {
  if (!req.user.isAdmin || req.user.id !== req.params.userId) {
    return next(errorHandler(403, 'You are not allowed to delete this post'));
  }
  try {
    await Post.findByIdAndDelete(req.params.postId);
    await cacheInvalidatePrefix(POSTS_CACHE_PREFIX);
    res.status(200).json('The post has been deleted');
  } catch (error) {
    next(error);
  }
};

export const updatepost = async (req, res, next) => {
  if (!req.user.isAdmin || req.user.id !== req.params.userId) {
    return next(errorHandler(403, 'You are not allowed to update this post'));
  }
  try {
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.postId,
      {
        $set: {
          title: req.body.title,
          content: req.body.content,
          category: req.body.category,
          image: req.body.image,
        },
      },
      { new: true }
    );
    await cacheInvalidatePrefix(POSTS_CACHE_PREFIX);
    res.status(200).json(updatedPost);
  } catch (error) {
    next(error);
  }
};
