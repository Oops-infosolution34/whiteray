// developed by Taranjit Singh
import express from "express";
// import cookieParser from "cookie-parser";
import cors from "cors";
import sequelize from "./database/DB.js";

import Course from "./models/course.js";


import StudentFees from "./models/studentFees.js";
import FeeInstallments from "./models/feeInstallments.js";
 
import Discount from "./models/discount.js"; 


import Organization from "./models/Organization.js"; 
import AdminPermission from "./models/adminPermission.js"; 
import LoginNotification from "./models/loginNotification.js"; 
import StaffRequest from "./models/staffRequest.js"; 
import DueNotification from "./models/dueNotification.js"; 
// ✅ Only staffRequest, NOT staff 

 
// // Routes imports
// import superAdminRoutes from "./routes/superAdminRoutes.js";
// import studentRoutes from "./routes/studentRoutes.js";
// import authRoutes from "./routes/authRoutes.js";
// import receiptRoutes from "./routes/receiptRoutes.js";
// import courseRoutes from "./routes/courseRoutes.js";
// import feesRoutes from "./routes/feesRoutes.js";
// import discountRoutes from "./routes/discountRoutes.js";
// import loginNotificationRoutes from "./routes/loginNotificationRoutes.js";
// import staffRoutes from "./routes/staffRoutes.js";
// import { applyDiscount } from "./controllers/studentController.js";
// import organizationRoutes from "./routes/organizationRoutes.js";
// import assignAdminRoutes from "./routes/assignAdminRoutes.js";
// import assignDutiesRoutes from "./routes/assignDutiesRoutes.js";
// import adminRoutes from "./routes/adminRoutes.js";
// import refundRoutes from "./routes/refundRoutes.js";
// import dueNotificationRoutes from "./routes/dueNotificationRoutes.js";
// import { initCronJobs } from "./utils/cronJobs.js";


const app = express();

// Middleware
app.use(cors());

app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());
// app.use("/uploads", express.static("uploads"));

// API Routes 
// app.use("/api/superadmin", superAdminRoutes);
// app.use("/api/student", studentRoutes);
// app.use("/api/auth", authRoutes);
// app.use("/api/receipt", receiptRoutes);
// app.use("/api/courses", courseRoutes);
// app.use("/api/fee-installments", feesRoutes);
// app.use("/api/discounts", discountRoutes);
// app.use("/organization", organizationRoutes);
// app.use("/api/assign-admin", assignAdminRoutes);
// app.use("/api/assign-duties", assignDutiesRoutes);
// app.use("/api/admin", adminRoutes);
// app.use("/api", loginNotificationRoutes);
// app.use("/api/staff", staffRoutes);
// app.post('/api/student/discount/apply', applyDiscount);
// app.use("/api/refund", refundRoutes);
// app.use("/api", dueNotificationRoutes);

app.get("/erp", async (req, res) => {
    try {
      
        const courses = await Course.findAll();
        res.status(200).json({
            success: true,
            count: courses.length,
            data: courses,
        });
    } catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch courses",
            error: error.message,
        });
    }
});



// Start server
(async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    await sequelize.sync();
    console.log("Sequelize models registered (sync with alter: false).");

    // Initialize Cron Jobs
    initCronJobs();

    const PORT = 3000;
    app.listen(PORT, () => {
      console.log(`Server is live on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error);
    process.exit(1);
    
  }
})(); 
//mm