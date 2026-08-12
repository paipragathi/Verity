import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    postId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    likes: {
      type: Array,
      default: [],
    },
    numberOfLikes: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// getPostComments() filters by postId + sorts by createdAt (comment.controller.js) —
// compound index supports both in a single scan instead of a filter-then-sort.
commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ createdAt: -1 }); // used by admin getcomments() sort + date-range counts

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
