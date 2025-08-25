const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

// Rate limiting configurations
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || "Too many requests, please try again later",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different rate limits for different endpoints
const rateLimits = {
  // General API rate limit
  general: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // limit each IP to 100 requests per windowMs
    "Too many requests from this IP, please try again after 15 minutes"
  ),

  // Auth endpoints - more restrictive
  auth: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5, // limit each IP to 5 requests per windowMs
    "Too many authentication attempts, please try again after 15 minutes"
  ),

  // Message sending - moderate limit
  messages: createRateLimit(
    60 * 1000, // 1 minute
    10, // limit each IP to 10 messages per minute
    "Too many messages sent, please wait before sending more"
  ),

  // Password reset - very restrictive
  passwordReset: createRateLimit(
    60 * 60 * 1000, // 1 hour
    3, // limit each IP to 3 password reset attempts per hour
    "Too many password reset attempts, please try again after an hour"
  ),

  // Search - moderate limit
  search: createRateLimit(
    60 * 1000, // 1 minute
    30, // limit each IP to 30 searches per minute
    "Too many search requests, please wait a moment"
  ),
};

// Security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Remove potential XSS attempts from string inputs
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === "string") {
        // Remove script tags and javascript: protocols
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/javascript:/gi, "")
          .replace(/on\w+\s*=/gi, "");
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

// Block common attack patterns
const blockSuspiciousRequests = (req, res, next) => {
  const suspiciousPatterns = [
    /(\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin)/i, // NoSQL injection
    /(union\s+select|drop\s+table|delete\s+from)/i, // SQL injection
    /(<script|javascript:|vbscript:|onload=|onerror=)/i, // XSS
    /(\.\.\/|\.\.\\)/i, // Path traversal
  ];

  const checkString = JSON.stringify({
    ...req.body,
    ...req.query,
    ...req.params,
  });

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      console.log(`🚨 Suspicious request blocked from IP: ${req.ip}`);
      return res.status(400).json({
        success: false,
        message: "Invalid request format",
      });
    }
  }

  next();
};

// Log suspicious activities
const logSuspiciousActivity = (req, res, next) => {
  const suspiciousIndicators = [
    req.headers["user-agent"] && req.headers["user-agent"].includes("bot"),
    req.headers["user-agent"] && req.headers["user-agent"].length < 10,
    req.url.includes("../"),
    req.url.includes("<script"),
  ];

  if (suspiciousIndicators.some(Boolean)) {
    console.log(
      `⚠️ Potentially suspicious activity from IP: ${req.ip}, User-Agent: ${req.headers["user-agent"]}, URL: ${req.url}`
    );
  }

  next();
};

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "http://localhost:3001",
      "https://your-production-domain.com",
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS blocked for origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    const logLevel = status >= 400 ? "ERROR" : "INFO";
    console.log(
      `[${logLevel}] ${req.method} ${req.url} - ${status} - ${duration}ms - IP: ${req.ip}`
    );

    // Log errors with more detail
    if (status >= 400) {
      console.log(
        `Error details - Headers: ${JSON.stringify(
          req.headers
        )}, Body: ${JSON.stringify(req.body)}`
      );
    }
  });

  next();
};

module.exports = {
  rateLimits,
  securityHeaders,
  sanitizeInput,
  blockSuspiciousRequests,
  logSuspiciousActivity,
  corsOptions,
  requestLogger,
};
