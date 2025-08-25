const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 20,
    match: /^[a-zA-Z0-9_]+$/,
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId; // Password required only if not using Google OAuth
    },
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  bio: {
    type: String,
    maxlength: 200,
    default: "",
  },
  profilePicture: {
    type: String, // base64 string أو URL
    default: "",
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  googleId: {
    type: String,
    sparse: true, // allows null values but ensures uniqueness for non-null values
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ["active", "blocked", "banned"],
    default: "active",
  },
  lastLogin: {
    type: Date,
  },
  messageLink: {
    type: String,
    unique: true,
  },
  settings: {
    allowAnonymousMessages: {
      type: Boolean,
      default: true,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
  },
  createdAt: { type: Date, default: Date.now },
});

// Generate unique message link before saving
UserSchema.pre("save", async function (next) {
  // Hash password if modified
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }

  // Generate message link if new user
  if (this.isNew && !this.messageLink) {
    this.messageLink = this.username.toLowerCase();
  }

  next();
});

// Methods
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.getPublicProfile = function () {
  return {
    _id: this._id,
    username: this.username,
    firstName: this.firstName,
    lastName: this.lastName,
    bio: this.bio,
    profilePicture: this.profilePicture,
    messageLink: this.messageLink,
    createdAt: this.createdAt,
  };
};

// Index for performance
UserSchema.index({ messageLink: 1 });
UserSchema.index({ email: 1 });

module.exports = mongoose.model("User", UserSchema);
