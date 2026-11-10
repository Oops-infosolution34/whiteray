 
import express from "express";
import cors from "cors";
import sequelize from "./database/DB.js";
import course from "./models/course.js";
import studentfee from "./models/studentFees.js";
const app = express();

app.use(cors());
app.use(express.json());


app.get("/erp", async (req, res) => {
   try {
        const courses = await course.findAll();
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


app.get("/erp/fee", async (req, res) => {
   try {
        const courses = await studentfee.findAll();
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
        console.log(" Database connection established successfully.");

        await sequelize.sync();
        console.log(" Models synced.");

        const PORT = 3000;
        app.listen(PORT, () => {
            console.log(` Test server running on port ${PORT}`);
            console.log(` GET http://localhost:${PORT}/api/test/courses`);
        });
    } catch (error) {
        console.error(" Unable to start server:", error);
        process.exit(1);
    }
})();
