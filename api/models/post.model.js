import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      unique: true,
    },
    image: {
      type: String,
      default:
        'https://www.hostinger.com/tutorials/wp-content/uploads/sites/2/2021/09/how-to-write-a-blog-post.png',
    },
    category: {
      type: String,
      default: 'uncategorized',
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

// title and slug already indexed implicitly via `unique: true`.
// These support the filter/sort patterns used in getposts() (post.controller.js):
// filtering by userId/category, sorting by updatedAt, and date-range counts on createdAt.
postSchema.index({ userId: 1 });
postSchema.index({ category: 1 });
postSchema.index({ updatedAt: -1 });
postSchema.index({ createdAt: -1 });

// Replaces the previous $regex-based search in getposts() (post.controller.js).
// A $regex scan on title/content cannot use a standard B-tree index for
// unanchored/case-insensitive matching — it was a full collection scan
// on every search request. A text index lets MongoDB use an inverted
// index instead.
//
// Trade-off (deliberate, documented): text search is word/stem-based,
// not substring-based. Searching "cat" will match documents containing
// "cats" or "catering" (via stemming) but will NOT match "category" the
// way the old $regex substring search did. This is a real product
// behavior change, not just a performance one — acceptable here since
// blog search UX generally expects whole-word matching anyway.
postSchema.index({ title: 'text', content: 'text' });

const Post = mongoose.model('Post', postSchema);

export default Post;
