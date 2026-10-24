//developed by Taranjit Singh

import AdminPermission from "../models/adminPermission.js";
import Login from "../models/login.js";

export const getAdminDashboard = async (req, res) => {
  try {
    
    const { id, role, organizationId } = req.user;

    if (role !== "admin" && role !== "superAdmin") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Load admin info
    const admin = await Login.findByPk(id, {
      attributes: ["id", "username", "email", "organizationId", "role"],
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Load permissions
    let permissions = await AdminPermission.findOne({
      where: {
        adminId: id,
        ...(organizationId ? { organizationId } : {}),
      },
    });

    //if 

    // If superAdmin and no explicit permissions found, grant all
    if (!permissions && role === "superAdmin") {
      permissions = {
        courses: { enabled: true, view: true, add: true, edit: true, delete: true },
        students: { enabled: true, view: true, add: true, edit: true, delete: true },
        staff: { enabled: true, view: true, add: true, edit: true, delete: true },
        reports: { enabled: true, view: true, add: true, edit: true, delete: true },
        receipts: { enabled: true, view: true, add: true },
        refunds: { enabled: true, view: true, add: true, edit: true, delete: true },
        discounts: true,
      };
    }

    if (!permissions) {
      return res.status(403).json({
        message: "No permissions assigned to this admin",
      });
    }

    res.status(200).json({
      admin,
      permissions,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ message: "Failed to load admin dashboard" });
  }
};
