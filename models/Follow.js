const mongoose = require("mongoose");

const FollowSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent duplicate follows
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

// Prevent self-following
FollowSchema.pre("save", function (next) {
  if (this.follower.toString() === this.following.toString()) {
    const error = new Error("Cannot follow yourself");
    return next(error);
  }
  next();
});

module.exports = mongoose.model("Follow", FollowSchema);
