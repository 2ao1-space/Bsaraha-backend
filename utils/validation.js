const Joi = require("joi");

// Common validation schemas
const schemas = {
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  username: Joi.string().alphanum().min(3).max(20).required(),
  name: Joi.string().min(1).max(50).required(),
  bio: Joi.string().max(200).allow(""),
  messageContent: Joi.string().min(1).max(500).required(),
  objectId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  // Pagination
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),

  // Search
  search: Joi.string().min(2).max(50),

  // File upload (base64)
  image: Joi.string()
    .pattern(/^data:image\/(jpeg|jpg|png|gif);base64,/)
    .allow(""),
};

// Validate request body
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    req.body = value;
    next();
  };
};

// Validate request params
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    req.params = value;
    next();
  };
};

// Validate request query
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    req.query = value;
    next();
  };
};

// Common validation middleware
const validate = {
  // Auth validations
  register: validateBody(
    Joi.object({
      email: schemas.email,
      username: schemas.username,
      password: schemas.password,
      firstName: schemas.name,
      lastName: schemas.name,
    })
  ),

  login: validateBody(
    Joi.object({
      email: schemas.email,
      password: schemas.password,
    })
  ),

  changePassword: validateBody(
    Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: schemas.password,
    })
  ),

  resetPassword: validateBody(
    Joi.object({
      email: schemas.email,
      resetCode: Joi.string().length(6).required(),
      newPassword: schemas.password,
    })
  ),

  // Profile validations
  updateProfile: validateBody(
    Joi.object({
      firstName: schemas.name.optional(),
      lastName: schemas.name.optional(),
      bio: schemas.bio.optional(),
      profilePicture: schemas.image.optional(),
    })
  ),

  updateSettings: validateBody(
    Joi.object({
      allowAnonymousMessages: Joi.boolean().optional(),
      emailNotifications: Joi.boolean().optional(),
    })
  ),

  // Message validations
  sendMessage: validateBody(
    Joi.object({
      recipientId: schemas.objectId,
      content: schemas.messageContent,
      image: schemas.image.optional(),
      isAnonymous: Joi.boolean().default(true),
    })
  ),

  replyMessage: validateBody(
    Joi.object({
      content: schemas.messageContent,
      isPublic: Joi.boolean().default(false),
    })
  ),

  // Report validations
  reportContent: validateBody(
    Joi.object({
      type: Joi.string()
        .valid(
          "spam",
          "harassment",
          "inappropriate_content",
          "fake_account",
          "other"
        )
        .required(),
      description: Joi.string().min(10).max(500).required(),
      screenshot: Joi.string().optional(),
    })
  ),

  // Admin validations
  updateUserStatus: validateBody(
    Joi.object({
      status: Joi.string().valid("active", "blocked", "banned").required(),
      reason: Joi.string().max(200).optional(),
    })
  ),

  reviewReport: validateBody(
    Joi.object({
      status: Joi.string()
        .valid("reviewed", "resolved", "dismissed")
        .required(),
      adminNotes: Joi.string().max(500).optional(),
      action: Joi.object({
        type: Joi.string()
          .valid("delete_message", "block_user", "ban_user")
          .optional(),
      }).optional(),
    })
  ),

  // Common params
  objectIdParam: validateParams(
    Joi.object({
      userId: schemas.objectId.optional(),
      messageId: schemas.objectId.optional(),
      reportId: schemas.objectId.optional(),
      identifier: Joi.string().min(3).max(20).optional(),
    })
  ),

  // Common queries
  pagination: validateQuery(
    Joi.object({
      page: schemas.page,
      limit: schemas.limit,
      search: schemas.search.optional(),
      status: Joi.string().optional(),
      type: Joi.string().optional(),
    })
  ),
};

module.exports = {
  schemas,
  validateBody,
  validateParams,
  validateQuery,
  validate,
};
