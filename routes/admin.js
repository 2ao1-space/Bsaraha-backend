const express = require("express");
const User = require("../models/User");
const Message = require("../models/Message");
const Report = require("../models/Report");
const Follow = require("../models/Follow");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authenticateToken, requireAdmin);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get("/stats", async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      bannedUsers,
      newUsersToday,
      newUsersThisWeek,
      totalMessages,
      messagesToday,
      messagesThisWeek,
      totalFollows,
      newFollowsToday,
      pendingReports,
      totalReports,
      reportsThisWeek,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ status: "blocked" }),
      User.countDocuments({ status: "banned" }),
      User.countDocuments({ createdAt: { $gte: yesterday } }),
      User.countDocuments({ createdAt: { $gte: lastWeek } }),
      Message.countDocuments(),
      Message.countDocuments({ createdAt: { $gte: yesterday } }),
      Message.countDocuments({ createdAt: { $gte: lastWeek } }),
      Follow.countDocuments(),
      Follow.countDocuments({ createdAt: { $gte: yesterday } }),
      Report.countDocuments({ status: "pending" }),
      Report.countDocuments(),
      Report.countDocuments({ createdAt: { $gte: lastWeek } }),
    ]);

    // Get daily stats for the last 7 days
    const dailyStats = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

        const [users, messages, follows] = await Promise.all([
          User.countDocuments({
            createdAt: { $gte: date, $lt: nextDate },
          }),
          Message.countDocuments({
            createdAt: { $gte: date, $lt: nextDate },
          }),
          Follow.countDocuments({
            createdAt: { $gte: date, $lt: nextDate },
          }),
        ]);

        return {
          date: date.toISOString().split("T")[0],
          users,
          messages,
          follows,
        };
      })
    );

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          blockedUsers,
          bannedUsers,
          totalMessages,
          totalFollows,
          totalReports,
          pendingReports,
        },
        recent: {
          newUsersToday,
          newUsersThisWeek,
          messagesToday,
          messagesThisWeek,
          newFollowsToday,
          reportsThisWeek,
        },
        dailyStats: dailyStats.reverse(),
      },
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
    });
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get users list for admin
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get("/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const search = req.query.search;
    const skip = (page - 1) * limit;

    // Build filter
    let filter = {};

    if (status && ["active", "blocked", "banned"].includes(status)) {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { username: searchRegex },
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
      ];
    }

    const users = await User.find(filter)
      .select("-password -verificationToken -resetPasswordToken")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const [
          messagesReceived,
          messagesSent,
          followersCount,
          followingCount,
          reportsAgainst,
        ] = await Promise.all([
          Message.countDocuments({ recipient: user._id }),
          Message.countDocuments({ sender: user._id }),
          Follow.countDocuments({ following: user._id }),
          Follow.countDocuments({ follower: user._id }),
          Report.countDocuments({ reportedUser: user._id }),
        ]);

        return {
          ...user.toObject(),
          stats: {
            messagesReceived,
            messagesSent,
            followersCount,
            followingCount,
            reportsAgainst,
          },
        };
      })
    );

    res.json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: users.length,
        },
      },
    });
  } catch (error) {
    console.error("Get admin users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{userId}/status:
 *   put:
 *     summary: Update user status (block/unblock/ban)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.put("/users/:userId/status", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    if (!["active", "blocked", "banned"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'active', 'blocked', or 'banned'",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent admin from changing their own status
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot change your own status",
      });
    }

    // Prevent changing status of other admins
    if (user.isAdmin && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Cannot change status of admin users",
      });
    }

    const previousStatus = user.status;
    user.status = status;
    await user.save();

    // Log the action (you might want to create an AdminAction model for this)
    console.log(
      `Admin ${req.user.username} changed user ${
        user.username
      } status from ${previousStatus} to ${status}. Reason: ${
        reason || "No reason provided"
      }`
    );

    res.json({
      success: true,
      message: `User status updated to ${status}`,
      data: {
        userId: user._id,
        previousStatus,
        newStatus: status,
        reason,
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
});

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     summary: Get reports for admin review
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get("/reports", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || "pending";
    const type = req.query.type;
    const skip = (page - 1) * limit;

    // Build filter
    let filter = {};

    if (
      status &&
      ["pending", "reviewed", "resolved", "dismissed"].includes(status)
    ) {
      filter.status = status;
    }

    if (type) {
      filter.type = type;
    }

    const reports = await Report.find(filter)
      .populate("reporter", "username email firstName lastName")
      .populate("reportedUser", "username email firstName lastName status")
      .populate("reportedMessage", "content image isAnonymous createdAt")
      .populate("reviewedBy", "username firstName lastName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Report.countDocuments(filter);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: reports.length,
        },
      },
    });
  } catch (error) {
    console.error("Get admin reports error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
    });
  }
});

/**
 * @swagger
 * /api/admin/reports/{reportId}/review:
 *   put:
 *     summary: Review a report
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.put("/reports/:reportId/review", async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes, action } = req.body;

    if (!["reviewed", "resolved", "dismissed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Must be 'reviewed', 'resolved', or 'dismissed'",
      });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Update report
    report.status = status;
    report.adminNotes = adminNotes;
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    await report.save();

    // Take action if specified
    if (action && action.type) {
      switch (action.type) {
        case "delete_message":
          if (report.reportedMessage) {
            await Message.findByIdAndDelete(report.reportedMessage);
          }
          break;

        case "block_user":
          if (report.reportedUser) {
            await User.findByIdAndUpdate(report.reportedUser, {
              status: "blocked",
            });
          }
          break;

        case "ban_user":
          if (report.reportedUser) {
            await User.findByIdAndUpdate(report.reportedUser, {
              status: "banned",
            });
          }
          break;
      }
    }

    await report.populate([
      { path: "reporter", select: "username email firstName lastName" },
      {
        path: "reportedUser",
        select: "username email firstName lastName status",
      },
      {
        path: "reportedMessage",
        select: "content image isAnonymous createdAt",
      },
      { path: "reviewedBy", select: "username firstName lastName" },
    ]);

    res.json({
      success: true,
      message: "Report reviewed successfully",
      data: report,
    });
  } catch (error) {
    console.error("Review report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to review report",
    });
  }
});

/**
 * @swagger
 * /api/admin/messages:
 *   get:
 *     summary: Get all messages for admin
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get("/messages", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const skip = (page - 1) * limit;

    let filter = {};

    if (search) {
      filter.content = new RegExp(search, "i");
    }

    const messages = await Message.find(filter)
      .populate("sender", "username email firstName lastName")
      .populate("recipient", "username email firstName lastName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments(filter);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: messages.length,
        },
      },
    });
  } catch (error) {
    console.error("Get admin messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
});

/**
 * @swagger
 * /api/admin/messages/{messageId}:
 *   delete:
 *     summary: Delete a message (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/messages/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reason } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    await Message.findByIdAndDelete(messageId);

    // Log the action
    console.log(
      `Admin ${req.user.username} deleted message ${messageId}. Reason: ${
        reason || "No reason provided"
      }`
    );

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
 * /api/admin/user/{userId}:
 *   get:
 *     summary: Get detailed user info for admin
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user's activity
    const [
      messagesReceived,
      messagesSent,
      followersCount,
      followingCount,
      reportsAgainst,
      reportsMade,
      recentMessages,
      recentReports,
    ] = await Promise.all([
      Message.countDocuments({ recipient: userId }),
      Message.countDocuments({ sender: userId }),
      Follow.countDocuments({ following: userId }),
      Follow.countDocuments({ follower: userId }),
      Report.countDocuments({ reportedUser: userId }),
      Report.countDocuments({ reporter: userId }),
      Message.find({
        $or: [{ recipient: userId }, { sender: userId }],
      })
        .populate("sender", "username firstName lastName")
        .populate("recipient", "username firstName lastName")
        .sort({ createdAt: -1 })
        .limit(10),
      Report.find({
        $or: [{ reportedUser: userId }, { reporter: userId }],
      })
        .populate("reporter", "username firstName lastName")
        .populate("reportedUser", "username firstName lastName")
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    res.json({
      success: true,
      data: {
        user,
        stats: {
          messagesReceived,
          messagesSent,
          followersCount,
          followingCount,
          reportsAgainst,
          reportsMade,
        },
        recentActivity: {
          messages: recentMessages,
          reports: recentReports,
        },
      },
    });
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
    });
  }
});

module.exports = router;
