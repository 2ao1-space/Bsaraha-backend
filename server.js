require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

// Import security middleware
const {
  rateLimits,
  securityHeaders,
  sanitizeInput,
  blockSuspiciousRequests,
  logSuspiciousActivity,
  corsOptions,
  requestLogger,
} = require("./middleware/security");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Trust proxy (important for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(logSuspiciousActivity);
app.use(blockSuspiciousRequests);

// Request logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
// للصور
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Input sanitization
app.use(sanitizeInput);

// General rate limiting
app.use(rateLimits.general);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Bsaraha API",
      version: "1.0.0",
      description:
        "Anonymous messaging platform API - Built with Express.js and MongoDB",
      contact: {
        name: "API Support",
        email: "support@bsaraha.com",
      },
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://your-domain.com"
            : `http://localhost:${PORT}`,
        description:
          process.env.NODE_ENV === "production"
            ? "Production server"
            : "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./routes/*.js"], // paths to files containing OpenAPI definitions
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Bsaraha API Documentation",
  })
);

// Routes with specific rate limits
app.use("/api/auth/login", rateLimits.auth);
app.use("/api/auth/register", rateLimits.auth);
app.use("/api/auth/forgot-password", rateLimits.passwordReset);
app.use("/api/auth/reset-password", rateLimits.passwordReset);
app.use("/api/messages/send", rateLimits.messages);
app.use("/api/users/search", rateLimits.search);

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/admin", require("./routes/admin"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Default route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 Bsaraha Backend API is running...",
    version: "1.0.0",
    documentation: "/api-docs",
    healthCheck: "/health",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      messages: "/api/messages",
      admin: "/api/admin",
    },
  });
});
"/api/messages", require("./routes/messages");
app.use("/api/admin", require("./routes/admin"));

// Default route
app.get("/", (req, res) => {
  res.json({
    message: "Bsaraha Backend API is running...",
    documentation: "/api-docs",
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Error occurred:", err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
    });
  }

  // CORS error
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS policy violation",
    });
  }

  // Rate limit error
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: "Too many requests, please try again later",
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Handle 404 for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    availableEndpoints: {
      auth: "/api/auth",
      users: "/api/users",
      messages: "/api/messages",
      admin: "/api/admin",
      docs: "/api-docs",
    },
  });
});

// Handle 404 for all other routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    suggestion: "Check /api-docs for available endpoints",
  });
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);

  server.close(() => {
    console.log("🔒 HTTP server closed");

    // Close database connection
    require("mongoose").connection.close(() => {
      console.log("🔌 Database connection closed");
      console.log("👋 Process terminated gracefully");
      process.exit(0);
    });
  });

  // Force close after 30 seconds
  setTimeout(() => {
    console.error("⚠️ Forceful shutdown after timeout");
    process.exit(1);
  }, 30000);
};

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);

  if (process.env.NODE_ENV === "development") {
    console.log(`\n📋 Available endpoints:`);
    console.log(`   Authentication: http://localhost:${PORT}/api/auth`);
    console.log(`   Users: http://localhost:${PORT}/api/users`);
    console.log(`   Messages: http://localhost:${PORT}/api/messages`);
    console.log(`   Admin: http://localhost:${PORT}/api/admin`);
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log("❌ Unhandled Rejection at:", promise, "reason:", err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log("❌ Uncaught Exception:", err);
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown on SIGTERM and SIGINT
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = app;
