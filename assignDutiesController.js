
//developed by Taran jit Singh
import AdminPermission from "../models/adminPermission.js";

import Login from "../models/login.js";



export const assignDutiesToAdmin = async (req, res) => {
  try {

    const {
      adminId,
      organizationId,
      courses,
      students,
      staff,
      reports,
      refunds,


      // 🔹 New granular receipt permissions (optional)
      receiptsView,
      receiptsAdd,

      // 🔹 Old receipt permission (boolean)
      receipts,

      // 🔹 Discount (boolean)
      discounts,
    } = req.body;

    const admin = await Login.findOne({
      where: {
        id: adminId,
        role: "admin",
        organizationId,

      },
    });

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found for this organization",
      });
    }

    let permission = await AdminPermission.findOne({
      where: { adminId, organizationId },
    });

    /**
     * 🔐 RECEIPTS PERMISSION STRATEGY
     * - Preserve backward compatibility
     * - Guarantee enabled/view/add always exist
     */
    const receiptsPermission =
      receiptsView !== undefined || receiptsAdd !== undefined
        ? {
            enabled: Boolean(receiptsView || receiptsAdd),
            view: Boolean(receiptsView),
            add: Boolean(receiptsAdd),
          }
        : typeof receipts === "boolean"
        ? {
            enabled: receipts,
            view: receipts,
            add: receipts,
          }
        : {
            enabled: false,
            view: false,
            add: false,
          };

    /**
     * 🎓 STUDENTS / ADMISSION PERMISSION NORMALIZATION
     * - Admission is rendered through students
     * - Ensure frontend always receives a complete object
     */
    const studentsPermission = {
      enabled: Boolean(students?.enabled),
      view: Boolean(students?.view),
      add: Boolean(students?.add),
      edit: Boolean(students?.edit),
      delete: Boolean(students?.delete),
    };

    const payload = {
      courses,
      students: studentsPermission,
      staff,
      reports,
      refunds,
      discounts,
      receipts: receiptsPermission,
    };

    if (permission) {
      await permission.update(payload);
    } else {
      await AdminPermission.create({
        adminId,
        organizationId,
        ...payload,
      });
    }

    res.status(200).json({
      message: "Admin permissions updated successfully",
    });
  } catch (error) {
    console.error("Assign duties error:", error);
    res.status(500).json({
      message: "Failed to assign admin duties",
    });
  }
};

export const getAdminPermissions = async (req, res) => {
  try {
    const { adminId, organizationId } = req.params;

    const permissions = await AdminPermission.findOne({
      where: {
        adminId,
        organizationId,
      },
    });

    res.json({
      success: true,

      data: permissions,
    });
  } catch (error) {
    console.error("Fetch permissions error:", error);
    res.status(500).json({ message: "Failed to load permissions" });
  }

};
 