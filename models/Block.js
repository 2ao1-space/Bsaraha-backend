const mongoose = require("mongoose");

const BlockSchema = new mongoose.Schema({
  blocker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  blocked: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reason: {
    type: String,
    maxlength: 200,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent duplicate blocks
BlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

// Prevent self-blocking
BlockSchema.pre("save", function (next) {
  if (this.blocker.toString() === this.blocked.toString()) {
    const error = new Error("Cannot block yourself");
    return next(error);
  }
  next();
});

module.exports = mongoose.model("Block", BlockSchema);
