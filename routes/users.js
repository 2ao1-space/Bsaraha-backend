const express = require("express");
const Joi = require("joi");
const User = require("../models/User");
const Follow = require("../models/Follow");
const Block = require("../models/Block");
const Message = require("../models/Message");
const { authenticateToken, optionalAuth } = require("../middleware/auth");

const router = express.Router();

// Validation schemas
const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(1).max(50),
  lastName: Joi.string().min(1).max(50),
  bio: Joi.string().max(200).allow(""),
  profilePicture: Joi.string().allow(""),
});

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const user = await User.findById(req.user._id);
    Object.assign(user, value);
    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: user.getPublicProfile(),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Profile update failed",
    });
  }
});

/**
 * @swagger
 * /api/users/settings:
 *   put:
 *     summary: Update user settings
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put("/settings", authenticateToken, async (req, res) => {
  try {
    const { allowAnonymousMessages, emailNotifications } = req.body;

    const user = await User.findById(req.user._id);

    if (typeof allowAnonymousMessages === "boolean") {
      user.settings.allowAnonymousMessages = allowAnonymousMessages;
    }

    if (typeof emailNotifications === "boolean") {
      user.settings.emailNotifications = emailNotifications;
    }

    await user.save();

    res.json({
      success: true,
      message: "Settings updated successfully",
      data: user.settings,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({
      success: false,
      message: "Settings update failed",
    });
  }
});

/**
 * @swagger
 * /api/users/{identifier}:
 *   get:
 *     summary: Get user by username or message link
 *     tags: [Users]
 */
router.get("/:identifier", optionalAuth, async (req, res) => {
  try {
    const { identifier } = req.params;

    // Find user by username or messageLink
    const user = await User.findOne({
      $or: [{ username: identifier }, { messageLink: identifier }],
      status: "active",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if current user is blocked by this user
    if (req.user) {
      const isBlocked = await Block.findOne({
        blocker: user._id,
        blocked: req.user._id,
      });

      if (isBlocked) {
        return res.status(403).json({
          success: false,
          message: "You are blocked by this user",
        });
      }
    }

    // Get follow counts
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: user._id }),
      Follow.countDocuments({ follower: user._id }),
    ]);

    // Check if current user follows this user
    let isFollowing = false;
    if (req.user) {
      isFollowing = await Follow.exists({
        follower: req.user._id,
        following: user._id,
      });
    }

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile(),
        followersCount,
        followingCount,
        isFollowing: !!isFollowing,
        canSendMessage: user.settings.allowAnonymousMessages || !!req.user,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
});

/**
 * @swagger
 * /api/users/{userId}/follow:
 *   post:
 *     summary: Follow a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post("/:userId/follow", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot follow yourself",
      });
    }

    // Check if user exists and is active
    const userToFollow = await User.findOne({ _id: userId, status: "active" });
    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      follower: req.user._id,
      following: userId,
    });

    if (existingFollow) {
      return res.status(400).json({
        success: false,
        message: "Already following this user",
      });
    }

    // Check if blocked
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: req.user._id, blocked: userId },
        { blocker: userId, blocked: req.user._id },
      ],
    });

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Cannot follow this user",
      });
    }

    // Create follow relationship
    const follow = new Follow({
      follower: req.user._id,
      following: userId,
    });

    await follow.save();

    res.json({
      success: true,
      message: "Successfully followed user",
    });
  } catch (error) {
    console.error("Follow user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to follow user",
    });
  }
});

/**
 * @swagger
 * /api/users/{userId}/unfollow:
 *   delete:
 *     summary: Unfollow a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:userId/unfollow", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await Follow.findOneAndDelete({
      follower: req.user._id,
      following: userId,
    });

    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Not following this user",
      });
    }

    res.json({
      success: true,
      message: "Successfully unfollowed user",
    });
  } catch (error) {
    console.error("Unfollow user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unfollow user",
    });
  }
});

/**
 * @swagger
 * /api/users/{userId}/block:
 *   post:
 *     summary: Block a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post("/:userId/block", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot block yourself",
      });
    }

    // Check if user exists
    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already blocked
    const existingBlock = await Block.findOne({
      blocker: req.user._id,
      blocked: userId,
    });

    if (existingBlock) {
      return res.status(400).json({
        success: false,
        message: "User already blocked",
      });
    }

    // Create block
    const block = new Block({
      blocker: req.user._id,
      blocked: userId,
      reason,
    });

    await block.save();

    // Remove follow relationships
    await Follow.deleteMany({
      $or: [
        { follower: req.user._id, following: userId },
        { follower: userId, following: req.user._id },
      ],
    });

    res.json({
      success: true,
      message: "User blocked successfully",
    });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to block user",
    });
  }
});

/**
 * @swagger
 * /api/users/{userId}/unblock:
 *   delete:
 *     summary: Unblock a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:userId/unblock", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await Block.findOneAndDelete({
      blocker: req.user._id,
      blocked: userId,
    });

    if (!result) {
      return res.status(400).json({
        success: false,
        message: "User not blocked",
      });
    }

    res.json({
      success: true,
      message: "User unblocked successfully",
    });
  } catch (error) {
    console.error("Unblock user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unblock user",
    });
  }
});

/**
 * @swagger
 * /api/users/my/followers:
 *   get:
 *     summary: Get my followers
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get("/my/followers", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const followers = await Follow.find({ following: req.user._id })
      .populate("follower", "username firstName lastName profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Follow.countDocuments({ following: req.user._id });

    res.json({
      success: true,
      data: {
        followers: followers.map((f) => f.follower),
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: followers.length,
        },
      },
    });
  } catch (error) {
    console.error("Get followers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch followers",
    });
  }
});

/**
 * @swagger
 * /api/users/my/following:
 *   get:
 *     summary: Get users I'm following
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get("/my/following", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const following = await Follow.find({ follower: req.user._id })
      .populate("following", "username firstName lastName profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Follow.countDocuments({ follower: req.user._id });

    res.json({
      success: true,
      data: {
        following: following.map((f) => f.following),
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: following.length,
        },
      },
    });
  } catch (error) {
    console.error("Get following error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch following list",
    });
  }
});

/**
 * @swagger
 * /api/users/my/blocked:
 *   get:
 *     summary: Get blocked users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get("/my/blocked", authenticateToken, async (req, res) => {
  try {
    const blocked = await Block.find({ blocker: req.user._id })
      .populate("blocked", "username firstName lastName profilePicture")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: blocked.map((b) => ({
        user: b.blocked,
        reason: b.reason,
        blockedAt: b.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get blocked users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch blocked users",
    });
  }
});

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search users
 *     tags: [Users]
 */
router.get("/search", optionalAuth, async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const skip = (page - 1) * limit;
    const searchRegex = new RegExp(q.trim(), "i");

    // Get blocked users if authenticated
    let blockedUserIds = [];
    if (req.user) {
      const blocks = await Block.find({
        $or: [{ blocker: req.user._id }, { blocked: req.user._id }],
      });
      blockedUserIds = blocks.flatMap((b) => [
        b.blocker.toString(),
        b.blocked.toString(),
      ]);
    }

    const users = await User.find({
      $and: [
        {
          $or: [
            { username: searchRegex },
            { firstName: searchRegex },
            { lastName: searchRegex },
          ],
        },
        { status: "active" },
        { _id: { $nin: blockedUserIds } },
        req.user ? { _id: { $ne: req.user._id } } : {},
      ],
    })
      .select("username firstName lastName profilePicture bio")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ username: 1 });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
});

module.exports = router;
