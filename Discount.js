//developed by Taranjit Singh


// controllers/discountController.js
import Discount from "../models/discount.js";
import Admission from "../models/admission.js";

export const createDiscount = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
 

    const {
      studentId,
      admissionNo,
      courseApplied,
      studentName,
      percent = 0,
      percentAmount = 0,
      fixedAmount = 0,
      totalDiscount = 0,
      targetInstallments = [],
      discountReason,
      otherReason,
    } = req.body;

    // 1️⃣ Validate admission exists

    let admission = null;

    if (studentId) {
      admission = await Admission.findOne({ where: { studentId } });
      
    } else if (admissionNo) {
      admission = await Admission.findOne({ where: { admissionNo } });
    }

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found. Cannot create discount.",
      });
    }

    // 2️⃣ Safe targetInstallments parsing
    let parsedInstallments = [];
    if (Array.isArray(targetInstallments)) {
      parsedInstallments = targetInstallments;
    } else {
      try {
        parsedInstallments = JSON.parse(targetInstallments || "[]");
      } catch {
        parsedInstallments = [];
      }
    }

    // 3️⃣ Create discount (NO duplicate guard here)
    const disc = await Discount.create({
      studentId: admission.studentId ?? null,
      admissionNo: admission.admissionNo ?? null,
      courseApplied: courseApplied ?? admission.courseApplied ?? null,
      studentName: studentName ?? admission.studentName ?? null,
      organizationId,  

      percent: Number(percent) || 0,
      percentAmount: Number(percentAmount) || 0,
      fixedAmount: Number(fixedAmount) || 0,
      totalDiscount: Number(totalDiscount) || 0,

      targetInstallments: parsedInstallments,
      discountReason: discountReason ?? null,
      otherReason: otherReason ?? null,
    });

    return res.status(201).json({
      success: true,
      discount: disc,
    });

  } catch (err) {
    console.error("createDiscount error:", err);
    return res.status(500).json({
      success: false,
      message: "Unable to create discount",
      error: err.message,
    });
  }
};

/* GET /api/discounts/:id */

export const getDiscount = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const id = req.params.id;
    const disc = await Discount.findOne({
  where: {
    id,
    organizationId,
  },
});
 

    if (!disc) {
      return res.status(404).json({
        success: false,
        message: "Not found",
      });
    }

    return res.json({ success: true, discount: disc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* GET /api/discounts?admissionNo=*/
export const listDiscounts = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
 
    const where = { organizationId };

if (req.query.admissionNo) {
  where.admissionNo = req.query.admissionNo;
}

const rows = await Discount.findAll({
  where,
  order: [["createdAt", "DESC"]],
});
 

    return res.json({ success: true, discounts: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const attachAdmissionNoToDiscount = async (
  studentName,
  admissionNo,
  transaction,
  organizationId
) => {
  if (!studentName || !admissionNo || !organizationId) return;  

  await Discount.update(
    { admissionNo },
    {  
      where: {
        studentName,
        admissionNo: null,
        organizationId 
      },
      transaction,
    }
  );
};

// export const attachAdmissionNoToDiscount = async (
//   studentId,
//   admissionNo,
//   transaction
// ) => {
//   if (!studentId || !admissionNo) return;

//   await Discount.update(
//     { admissionNo },
//     {
//       where: {
//         studentId,
//         admissionNo: null, // 🔥 only discounts created before admissionNo
//       },
//       transaction,
//     }
//   );
// };