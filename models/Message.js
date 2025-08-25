const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null, // null means anonymous
  },
  content: {
    type: String,
    required: true,
    maxlength: 500,
  },
  image: {
    type: String, // base64 string أو URL
    default: null,
  },
  isAnonymous: {
    type: Boolean,
    default: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  reply: {
    content: {
      type: String,
      maxlength: 500,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for better performance
MessageSchema.index({ recipient: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, createdAt: -1 });

module.exports = mongoose.model("Message", MessageSchema);
