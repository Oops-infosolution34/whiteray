//developed by Taranjit Singh

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";
import Login from "../models/login.js";
import { Op } from "sequelize";
import AdminPermission from "../models/adminPermission.js";
import LoginNotification from "../models/loginNotification.js"; // ✅ NEW

// =======================
// User Signup
// =======================
export const signup = async (req, res) => {
  try {
    const { username, email, mobileNumber, password, role } = req.body;

    const existingUser = await Login.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = await Login.create({
      username,
      email,
      mobileNumber,
      password_hash: password,
      role,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({
      message: "Error creating user",
      error: error.message,
    });
  }
};

// =============================
// User Login (Email OR Username)
// =============================
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const identifier = username;

    const user = await Login.findOne({
      where: {
        [Op.or]: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password_hash
    );
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      process.env.JWT_SECRET
    );

    // ✅ Existing functionality (UNCHANGED)
    user.last_login = new Date();
    await user.save();

    // ✅ NEW: Login notification insert (NON-BLOCKING)
    try {
      await LoginNotification.create({
        adminId: user.id,
        adminName: user.username,
        role: user.role,
        organizationId: user.organizationId ?? null,
      });
    } catch (notificationError) {
      // Intentionally silent – must NOT affect login
      console.error(
        "Login notification insert failed:",
        notificationError.message
      );
    }

    // 🔐 Fetch permissions only for admins (BACKWARD-SAFE)
    let permissions = null;

    if (user.role === "admin") {
      const permissionRecord = await AdminPermission.findOne({
        where: {
          adminId: user.id,
          organizationId: user.organizationId,
        },
      });

      permissions = permissionRecord
        ? permissionRecord.toJSON()
        : null;
    }

    // ✅ ADD: Staff permissions (hardcoded)
    if (user.role === "staff") {
      permissions = {
        students: {
          enabled: true,
          add: true,
          view: false,
          edit: false,
          delete: false,
        },
        receipts: {
          enabled: true,
          add: true,
          view: false,
          edit: false,
          delete: false,
        },
        discounts: true, // Staff can apply discounts
      };
    }

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,

        
        role: user.role,
        organizationId: user.organizationId,
      },
      permissions,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      message: "Error logging in",
      error: error.message,

    });
  }
}; 