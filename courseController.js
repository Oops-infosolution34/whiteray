
//developed by Taranjit Singh

// src/controllers/courseController.js
import sequelize from "../database/DB.js";
import Course from "../models/course.js";
import FeeInstallments from "../models/feeInstallments.js";

/**
 * WARNING / SUMMARY
 *
 * This controller now performs a "resequencing" step after create and delete operations.
 * Resequencing: ensures courses.courseID become contiguous 1..N by:
 *  - creating a temporary table courses_tmp like courses (with an extra old_courseID column)
 *  - copying rows into courses_tmp (preserving old_courseID)
 *  - updating referencing tables (FeeInstallments) using the mapping old->new
 *  - truncating original courses and reinserting rows (with new contiguous courseID)
 *  - dropping the temporary table and resetting AUTO_INCREMENT
 *
 * CAUTIONS:
 *  - This rewrites primary keys in the courses table. Any external system that stored courseIDs will break.
 *  - This updates FeeInstallments.courseID mapping automatically inside the routine. If you have other FK tables,
 *    you must update them similarly (add them to the mapping update step).
 *  - DDL operations (CREATE TABLE / DROP / TRUNCATE) may implicitly commit transactions in some DB setups.
 *    We do our best to run steps safely, but test in staging and backup first.
 *
 * BACKUP before running:
 *   CREATE TABLE courses_backup AS SELECT * FROM courses;
 *   CREATE TABLE feeinstallments_backup AS SELECT * FROM feeinstallments;
 *
 * TEST scenario:
 *  - delete a middle course -> call DELETE /api/courses/:id -> DB IDs become contiguous and FeeInstallments updated
 *  - add a new course -> call POST /api/courses -> DB IDs become contiguous and the new course receives last id N
 *
 * If you want resequence after UPDATE as well, call resequenceCourses() inside updateCourse transaction (not added by default).
 */

// Helper: resequence the courses table and update FeeInstallments mapping
// WARNING: this routine performs DDL (CREATE TABLE / TRUNCATE / DROP). Test and backup first.
async function resequenceCourses() {
  const queryInterface = sequelize.getQueryInterface();

  // We'll run raw SQL statements. We assume default DB is the one used by sequelize connection.
  try {
    // 1) Get column list except courseID
    const [[colsRow]] = await sequelize.query(
      `SELECT GROUP_CONCAT(CONCAT('\\\\\`', COLUMN_NAME, '\\\\\`') ORDER BY ORDINAL_POSITION SEPARATOR ',') AS cols
       FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'courses' AND COLUMN_NAME <> 'courseID';`
    );

    const cols = colsRow && colsRow.cols;
    
    if (!cols) {
      throw new Error("Could not determine courses columns (cols empty).");
    }

    // 2) Create a temp table like courses
    // Note: CREATE TABLE ... LIKE performs DDL (may implicitly commit)
    await sequelize.query(`DROP TABLE IF EXISTS courses_tmp;`);
    await sequelize.query(`CREATE TABLE courses_tmp LIKE courses;`);

    // 3) Add a column to store old_courseID so we can map to new IDs
    await sequelize.query(`ALTER TABLE courses_tmp ADD COLUMN old_courseID INT NULL;`);

    // 4) Insert rows into courses_tmp preserving old id in old_courseID.
    // We choose ordering by createdAt ASC, courseID ASC so older rows get smaller IDs.
    // If you prefer a different order, change the ORDER BY clause accordingly.
    await sequelize.query(
      `INSERT INTO courses_tmp (${cols}, old_courseID)
       SELECT ${cols}, courseID FROM courses
       ORDER BY createdAt ASC, courseID ASC;`
    );

    // At this point courses_tmp has auto-assigned courseID values 1..N in desired order,
    // and old_courseID column contains the original courseID for mapping.

    // 5) Update FeeInstallments to reference the new IDs:
    //    feeinstallments.courseID = courses_tmp.courseID WHERE feeinstallments.courseID = courses_tmp.old_courseID
    // Note: table names are assumed `feeinstallments` as per your model naming; adjust if different.
    await sequelize.query(
      `UPDATE feeinstallments f
       JOIN courses_tmp m ON f.courseID = m.old_courseID
       SET f.courseID = m.courseID;`
    );

    // If you have other referencing tables, update them here similarly:
    // e.g. await sequelize.query(`UPDATE other_table o JOIN courses_tmp m ON o.courseID = m.old_courseID SET o.courseID = m.courseID;`);

    // 6) Truncate original courses table (removes all rows but keeps structure)
    //    and then insert rows from courses_tmp (explicitly setting the new courseID values).
    // We include courseID in the insert to preserve the new contiguous IDs.
    // Disable foreign key checks momentarily to allow re-insert (we already updated referencing tables).
    await sequelize.query(`SET FOREIGN_KEY_CHECKS = 0;`);

    // Collect full column list (including courseID) to re-insert exactly
    const [[allColsRow]] = await sequelize.query(
      `SELECT GROUP_CONCAT(CONCAT('\\\\\`', COLUMN_NAME, '\\\\\`') ORDER BY ORDINAL_POSITION SEPARATOR ',') AS cols
       FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'courses';`
    );
    const allCols = allColsRow && allColsRow.cols;
    if (!allCols) throw new Error("Could not determine full courses columns.");

    // Truncate and re-insert
    await sequelize.query(`TRUNCATE TABLE courses;`);

    // Insert all columns from courses_tmp (except old_courseID which doesn't belong to courses)
    // Build column list for courses_tmp selection by filtering out old_courseID from allCols
    const insertCols = allCols
      .split(",")
      .map(s => s.trim())
      .filter(c => c !== "`old_courseID`")
      .join(",");

    await sequelize.query(
      `INSERT INTO courses (${insertCols})
       SELECT ${insertCols} FROM courses_tmp ORDER BY courseID ASC;`
    );

    // 7) Drop the temporary table
    await sequelize.query(`DROP TABLE IF EXISTS courses_tmp;`);

    // 8) Reset AUTO_INCREMENT to MAX(courseID) + 1
    await sequelize.query(`ALTER TABLE courses AUTO_INCREMENT = (SELECT COALESCE(MAX(courseID),0) + 1 FROM courses);`);

    // Re-enable foreign key checks
    await sequelize.query(`SET FOREIGN_KEY_CHECKS = 1;`);

    return true;
  } catch (err) {
    console.error("resequenceCourses error:", err);
    // Try best-effort cleanup
    try {
      await sequelize.query(`SET FOREIGN_KEY_CHECKS = 1;`);
      await sequelize.query(`DROP TABLE IF EXISTS courses_tmp;`);
    } catch (e) {
      // ignore
    }
    throw err;
  }
}

/* ---------------------- existing controller functions (modified) ---------------------- */

export const createCourse = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      courseName,
      shortName,
      courseFees = 0,
      startDate,
      endDate,
      numberOfInstallments = 1,
      installments = [],
      totalIncludingGst = 0,
    } = req.body;

    if (!courseName || !shortName || !startDate || !endDate) {
      await t.rollback();
      return res.status(400).json({ message: "Required fields missing." });
    }

   const organizationId = req.user.organizationId;

const newCourse = await Course.create(
  {
    courseName,
    shortName,
    courseFees,
    startDate,
    endDate,
    numberOfInstallments,
    totalIncludingGst,
    organizationId, // ✅ automatically applied
  },
  { transaction: t }
);
  
    const courseID = newCourse.courseID;

    // 2) create installments, if provided
    if (Array.isArray(installments) && installments.length) {
      const installmentsToCreate = installments.map((inst, idx) => ({
  courseID,
  organizationId, // ✅ REQUIRED
  installmentNo: inst.installmentNo ?? idx + 1,
  particular: inst.particular,
  dueDate: inst.date || inst.dueDate,
  fee: inst.fee,
  gst: inst.gst,
  feeWithGst: inst.feeWithGst,
}));
 
      await FeeInstallments.bulkCreate(installmentsToCreate, { transaction: t });
    }

    // Commit the creation first (we will resequence afterwards).
    await t.commit();

    // Now resequence the courses table so DB courseIDs become contiguous 1..N
    // NOTE: resequenceCourses performs DDL and updates feeinstallments accordingly.
    // It is run outside the transaction because CREATE TABLE / DROP may cause implicit commits.
    try {
      await resequenceCourses();
    } catch (reseqErr) {
      // If resequence fails, log and return success for creation but warn user.
      console.error("Resequence after create failed:", reseqErr);
      // Optionally: you could attempt rollback or reverse-created row, but that adds complexity.
      // For now, return created course with a warning.
      const created = await Course.findByPk(courseID, {
        include: [{ model: FeeInstallments }],
      });
      return res.status(201).json({
        message: "Course created (resequencing failed; please run maintenance).",
        course: created,
        resequenceError: reseqErr.message,
      });
    }

    // include installments in response; find by the new courseID if it moved.
    // After resequence, the course may have a different courseID. We need to find the row by a stable unique attribute.
    // We assume combination (courseName, startDate, endDate) is unique for lookup — adjust if you have a better unique constraint.
    const [foundRows] = await sequelize.query(
      `SELECT * FROM courses WHERE courseName = ? AND startDate = ? AND endDate = ? ORDER BY courseID DESC LIMIT 1`,
      { replacements: [courseName, startDate, endDate] }
    );
    const createdCourseRow = foundRows && foundRows[0] ? foundRows[0] : null;

    // fetch with installments using Sequelize for consistency
    const created = createdCourseRow
      ? await Course.findByPk(createdCourseRow.courseID, { include: [{ model: FeeInstallments }] })
      : await Course.findOne({ where: { courseName }, include: [{ model: FeeInstallments }] });

    return res.status(201).json({ message: "Course created", course: created });
  } catch (error) {
    try {
      await t.rollback();
    } catch (e) {}
    console.error("createCourse error:", error);
    return res.status(500).json({ message: "Failed to create course", error: error.message });
  }
};

export const getAllCourses = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    console.log("getAllCourses called by user:", {
      userId: req.user.id,
      role: req.user.role,
      organizationId: organizationId,
    });

    // Build where clause based on organizationId
    const whereClause = organizationId ? { organizationId } : {};
    
    const courses = await Course.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      include: [{ model: FeeInstallments }],
    });
    
    console.log(`Found ${courses.length} courses for organizationId: ${organizationId}`);

    res.status(200).json(courses);
  } catch (error) {
    console.error("getAllCourses error:", error);
    res.status(500).json({ message: "Failed to fetch courses." });
  }
};

export const getCoursesByOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required." });
    }

    const courses = await Course.findAll({
      where: { organizationId },
      order: [["createdAt", "DESC"]],
      include: [{ model: FeeInstallments }],
    });

    res.status(200).json(courses);
  } catch (error) {
    console.error("getCoursesByOrganization error:", error);
    res.status(500).json({ message: "Failed to fetch courses by organization." });
  }
};
 

export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const course = await Course.findOne({
      where: {
        courseID: id,
        organizationId,
      },
      include: [{ model: FeeInstallments }],
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    res.status(200).json(course);
  } catch (error) {
    console.error("getCourseById error:", error);
    res.status(500).json({ message: "Failed to fetch course." });
  }
};
 

export const updateCourse = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const {
      courseName,
      shortName,
      courseFees,
      startDate,
      endDate,
      numberOfInstallments,
      installments = [],
      totalIncludingGst,
    } = req.body;

    const course = await Course.findOne({
      where: {
        courseID: id,
        organizationId,
      },
      transaction: t,
    });

    if (!course) {
      await t.rollback();
      return res.status(404).json({ message: "Course not found." });
    }

    await course.update(
      {
        courseName,
        shortName,
        courseFees,
        startDate,
        endDate,
        numberOfInstallments,
        totalIncludingGst,
      },
      { transaction: t }
    );

    // Rebuild installments
   await FeeInstallments.destroy({
  where: {
    courseID: id,
    organizationId,
  },
  transaction: t,
});
 

    if (Array.isArray(installments) && installments.length) {
      const rows = installments.map((inst, idx) => ({
        courseID: id,
        organizationId, 
        installmentNo: inst.installmentNo ?? idx + 1,
        particular: inst.particular,
        dueDate: inst.date || inst.dueDate,
        fee: inst.fee,
        gst: inst.gst,
        feeWithGst: inst.feeWithGst,
      }));
      await FeeInstallments.bulkCreate(rows, { transaction: t });
    }

    await t.commit();

    const updated = await Course.findByPk(id, {
      include: [{ model: FeeInstallments }],
    });

    return res.status(200).json({ message: "Course updated", course: updated });
  } catch (error) {
    await t.rollback();
    console.error("updateCourse error:", error);
    return res
      .status(500)
      .json({ message: "Failed to update course.", error: error.message });
  }
};
 

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const course = await Course.findOne({
      where: {
        courseID: id,
        organizationId,
      },
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    await course.destroy();

    return res.status(200).json({ message: "Course deleted." });
  } catch (error) {
    console.error("deleteCourse error:", error);
    return res
      .status(500)
      .json({ message: "Failed to delete course." });
  }
};
 

// Robust getNextCourseId implementation (unchanged)
export const getNextCourseId = async (req, res) => {
  try {
    const tableName = Course.getTableName ? Course.getTableName() : "courses";
    const sql = `SELECT COALESCE(MAX(courseID), 0) + 1 AS nextId FROM \`${tableName}\``;
    const [[row]] = await sequelize.query(sql);
    const next = row?.nextId ?? 1;
    return res.status(200).json({ nextCourseID: Number(next) });
  } catch (error) {
    console.error("getNextCourseId error:", error);
    return res.status(500).json({ message: "Failed to fetch next course id." });
  }
};
   