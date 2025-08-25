const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  reportedMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
  },
  type: {
    type: String,
    enum: [
      "spam",
      "harassment",
      "inappropriate_content",
      "fake_account",
      "other",
    ],
    required: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 500,
  },
  screenshot: {
    type: String, // base64 string
  },
  status: {
    type: String,
    enum: ["pending", "reviewed", "resolved", "dismissed"],
    default: "pending",
  },
  adminNotes: {
    type: String,
    maxlength: 500,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  reviewedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for admin queries
ReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Report", ReportSchema);
