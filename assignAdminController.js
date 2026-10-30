//developed bby Taranjit Singh

import Login from "../models/login.js";
import Organization from "../models/Organization.js";

export const assignOrganizationAdmin = async (req, res) => {
  try {
    const { organizationId, username, password } = req.body;

    if (!organizationId || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
      
    }



    // Check organization exists
    const org = await Organization.findByPk(organizationId);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Check if admin already exists for this org
    const existingAdmin = await Login.findOne({
      where: { organizationId, role: "admin" }, 
    });

    if (existingAdmin) {
      return res
        .status(400)
        .json({ message: "Admin already assigned to this organization" });
    }

    //  DO NOT hash here — model hook will handle it
//     const generatedEmail = `${username}@admin.local`;

// await Login.create({
//   username,                      // admin logs in using this
//   email: generatedEmail,         // internal only, passes isEmail validation
//   password_hash: password,       // plain password → model hook hashes it
//   role: "admin",
//   organizationId,
// });
const cleanUsername = username.trim().replace(/\s+/g, "_").toLowerCase(); 

await Login.create({
  username: username.trim(),            // login can still contain spaces
  email: `${cleanUsername}@admin.local`,// valid email always
  password_hash: password,              // model hook hashes it
  role: "admin",
  organizationId,
});
 
    res.status(201).json({
      message: "Organization admin assigned successfully",
    });
  } catch (error) {
    console.error("Assign admin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const removeOrganizationAdmin = async (req, res) => {
  try {
    const { organizationId } = req.params;

    console.log("REMOVE ADMIN orgId:", organizationId);

    const admin = await Login.findOne({
      where: { organizationId, role: "admin" },
    });

    console.log("FOUND ADMIN:", admin?.id);

    if (!admin) {
      return res.status(404).json({ message: "No admin found for organization" });
    }

    const deleted = await admin.destroy();
    console.log("DELETE RESULT:", deleted);

    res.json({ message: "Organization admin removed successfully" });
  } catch (error) {
    console.error("Remove admin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// export const removeOrganizationAdmin = async (req, res) => {
//   try {
//     const { organizationId } = req.params;

//     const admin = await Login.findOne({
//       where: { organizationId, role: "admin" },
//     });

//     if (!admin) {
//       return res.status(404).json({ message: "No admin found for organization" });
//     }

//     await admin.destroy();

//     res.json({ message: "Organization admin removed successfully" });
//   } catch (error) {
//     console.error("Remove admin error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
 