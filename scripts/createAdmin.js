require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const connectDB = require("../config/db");

const createAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@bsaraha.com";
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123456";

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log("❌ Admin user already exists with email:", adminEmail);
      process.exit(1);
    }

    // Create admin user
    const admin = new User({
      email: adminEmail,
      username: "admin",
      password: adminPassword,
      firstName: "System",
      lastName: "Administrator",
      isAdmin: true,
      isVerified: true,
      status: "active",
      bio: "System administrator account",
    });

    await admin.save();

    console.log("✅ Admin user created successfully!");
    console.log("📧 Email:", adminEmail);
    console.log("🔑 Password:", adminPassword);
    console.log("⚠️ Please change the password after first login!");
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
  } finally {
    mongoose.connection.close();
  }
};

// Run the script
createAdmin();
