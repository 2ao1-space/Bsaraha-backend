const express = require("express");
const Joi = require("joi");
const Message = require("../models/Message");
const User = require("../models/User");
const Block = require("../models/Block");
const Follow = require("../models/Follow");
const Report = require("../models/Report");
const { authenticateToken, optionalAuth } = require("../middleware/auth");

const router = express.Router();

// Validation schemas
const sendMessageSchema = Joi.object({
  recipientId: Joi.string().required(),
  content: Joi.string().min(1).max(500).required(),
  image: Joi.string().allow(""),
  isAnonymous: Joi.boolean().default(true),
});

const replyMessageSchema = Joi.object({
  content: Joi.string().min(1).max(500).required(),
  isPublic: Joi.boolean().default(false),
});

/**
 * @swagger
 * /api/messages/send:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 */
router.post("/send", optionalAuth, async (req, res) => {
  try {
    const { error, value } = sendMessageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { recipientId, content, image, isAnonymous } = value;

    // Find recipient
    const recipient = await User.findOne({
      _id: recipientId,
      status: "active",
    });
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found",
      });
    }

    // Check if anonymous messages are allowed
    if (isAnonymous && !recipient.settings.allowAnonymousMessages) {
      return res.status(403).json({
        success: false,
        message: "This user doesn't accept anonymous messages",
      });
    }

    // Check if users are blocked (only if sender is authenticated)
    if (req.user) {
      const isBlocked = await Block.findOne({
        $or: [
          { blocker: req.user._id, blocked: recipientId },
          { blocker: recipientId, blocked: req.user._id },
        ],
      });

      if (isBlocked) {
        return res.status(403).json({
          success: false,
          message: "Cannot send message to this user",
        });
      }

      // Don't allow sending to self
      if (req.user._id.toString() === recipientId) {
        return res.status(400).json({
          success: false,
          message: "Cannot send message to yourself",
        });
      }
    }

    // Create message
    const message = new Message({
      recipient: recipientId,
      sender: req.user && !isAnonymous ? req.user._id : null,
      content,
      image,
      isAnonymous,
    });

    await message.save();

    // Populate sender info if not anonymous
    if (!isAnonymous && message.sender) {
      await message.populate(
        "sender",
        "username firstName lastName profilePicture"
      );
    }

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        messageId: message._id,
        isAnonymous: message.isAnonymous,
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
});

/**
 * @swagger
 * /api/messages/inbox:
 *   get:
 *     summary: Get received messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 */
router.get("/inbox", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ recipient: req.user._id })
      .populate("sender", "username firstName lastName profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ recipient: req.user._id });
    const unreadCount = await Message.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    // Format messages to hide sender info for anonymous messages
    const formattedMessages = messages.map((message) => ({
      _id: message._id,
      content: message.content,
      image: message.image,
      isAnonymous: message.isAnonymous,
      isRead: message.isRead,
      sender: message.isAnonymous ? null : message.sender,
      reply: message.reply,
      createdAt: message.createdAt,
    }));

    res.json({
      success: true,
      data: {
        messages: formattedMessages,
        unreadCount,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: messages.length,
        },
      },
    });
  } catch (error) {
    console.error("Get inbox error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
});

/**
 * @swagger
 * /api/messages/{messageId}/read:
 *   put:
 *     summary: Mark message as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:messageId/read", authenticateToken, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.messageId,
      recipient: req.user._id,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    message.isRead = true;
    await message.save();

    res.json({
      success: true,
      message: "Message marked as read",
    });
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark message as read",
    });
  }
});

/**
 * @swagger
 * /api/messages/{messageId}/reply:
 *   post:
 *     summary: Reply to a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 */
router.post("/:messageId/reply", authenticateToken, async (req, res) => {
  try {
    const { error, value } = replyMessageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { content, isPublic } = value;

    const message = await Message.findOne({
      _id: req.params.messageId,
      recipient: req.user._id,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.reply && message.reply.content) {
      return res.status(400).json({
        success: false,
        message: "Message already has a reply",
      });
    }

    message.reply = {
      content,
      isPublic,
      createdAt: new Date(),
    };

    message.isRead = true;
    await message.save();

    res.json({
      success: true,
      message: "Reply sent successfully",
      data: {
        reply: message.reply,
      },
    });
  } catch (error) {
    console.error("Reply message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send reply",
    });
  }
});

/**
 * @swagger
 * /api/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:messageId", authenticateToken, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.messageId,
      recipient: req.user._id,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    await Message.findByIdAndDelete(req.params.messageId);

    res.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
    });
  }
});

/**
 * @swagger
 * /api/messages/feed:
 *   get:
 *     summary: Get public replies feed
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 */
router.get("/feed", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get users that the current user follows
    const following = await Follow.find({ follower: req.user._id }).select(
      "following"
    );

    const followingIds = following.map((f) => f.following);
    followingIds.push(req.user._id); // Include own replies

    // Get messages with public replies from followed users
    const messages = await Message.find({
      recipient: { $in: followingIds },
      "reply.content": { $exists: true },
      "reply.isPublic": true,
    })
      .populate("recipient", "username firstName lastName profilePicture")
      .populate("sender", "username firstName lastName profilePicture")
      .sort({ "reply.createdAt": -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({
      recipient: { $in: followingIds },
      "reply.content": { $exists: true },
      "reply.isPublic": true,
    });

    // Format feed items
    const feedItems = messages.map((message) => ({
      _id: message._id,
      content: message.content,
      image: message.image,
      isAnonymous: message.isAnonymous,
      sender: message.isAnonymous ? null : message.sender,
      recipient: message.recipient,
      reply: message.reply,
      createdAt: message.createdAt,
    }));

    res.json({
      success: true,
      data: {
        feed: feedItems,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: feedItems.length,
        },
      },
    });
  } catch (error) {
    console.error("Get feed error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch feed",
    });
  }
});

/**
 * @swagger
 * /api/messages/{messageId}/report:
 *   post:
 *     summary: Report a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 */
router.post("/:messageId/report", authenticateToken, async (req, res) => {
  try {
    const { type, description, screenshot } = req.body;

    if (!type || !description) {
      return res.status(400).json({
        success: false,
        message: "Type and description are required",
      });
    }

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Check if already reported by this user
    const existingReport = await Report.findOne({
      reporter: req.user._id,
      reportedMessage: message._id,
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: "Message already reported",
      });
    }

    const report = new Report({
      reporter: req.user._id,
      reportedMessage: message._id,
      reportedUser: message.sender,
      type,
      description,
      screenshot,
    });

    await report.save();

    res.json({
      success: true,
      message: "Report submitted successfully",
    });
  } catch (error) {
    console.error("Report message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit report",
    });
  }
});

/**
 * @swagger
 * /api/messages/user/{userId}:
 *   get:
 *     summary: Get public replies from a specific user
 *     tags: [Messages]
 */
router.get("/user/:userId", optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Check if user exists and is active
    const user = await User.findOne({ _id: userId, status: "active" });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if current user is blocked
    if (req.user) {
      const isBlocked = await Block.findOne({
        blocker: userId,
        blocked: req.user._id,
      });

      if (isBlocked) {
        return res.status(403).json({
          success: false,
          message: "You are blocked by this user",
        });
      }
    }

    // Get public replies from this user
    const messages = await Message.find({
      recipient: userId,
      "reply.content": { $exists: true },
      "reply.isPublic": true,
    })
      .populate("sender", "username firstName lastName profilePicture")
      .sort({ "reply.createdAt": -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({
      recipient: userId,
      "reply.content": { $exists: true },
      "reply.isPublic": true,
    });

    // Format messages
    const formattedMessages = messages.map((message) => ({
      _id: message._id,
      content: message.content,
      image: message.image,
      isAnonymous: message.isAnonymous,
      sender: message.isAnonymous ? null : message.sender,
      reply: message.reply,
      createdAt: message.createdAt,
    }));

    res.json({
      success: true,
      data: {
        messages: formattedMessages,
        user: user.getPublicProfile(),
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: formattedMessages.length,
        },
      },
    });
  } catch (error) {
    console.error("Get user messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user messages",
    });
  }
});

/**
 * @swagger
 * /api/messages/stats:
 *   get:
 *     summary: Get message statistics for current user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 */
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const [totalReceived, unreadCount, totalReplied, publicReplies] =
      await Promise.all([
        Message.countDocuments({ recipient: req.user._id }),
        Message.countDocuments({ recipient: req.user._id, isRead: false }),
        Message.countDocuments({
          recipient: req.user._id,
          "reply.content": { $exists: true },
        }),
        Message.countDocuments({
          recipient: req.user._id,
          "reply.isPublic": true,
        }),
      ]);

    res.json({
      success: true,
      data: {
        totalReceived,
        unreadCount,
        totalReplied,
        publicReplies,
      },
    });
  } catch (error) {
    console.error("Get message stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch message statistics",
    });
  }
});

module.exports = router;
