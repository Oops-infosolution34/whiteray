import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from './toastUtils';

/**
 * Export data to Excel file
 * @param {Array} data - Array of objects to export
 * @param {String} filename - Name of the file (without extension)
 * @param {String} sheetName - Name of the worksheet
 */
export const exportToExcel = (data, filename, sheetName = 'Sheet1') => {
  if (!data || data.length === 0) {
    toast.warn('No data to export');
    return;
  }

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate filename with current date
  const today = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${today}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, fullFilename);
};

/**
 * Generate PDF from data
 * @param {Array} data - Array of objects to export
 * @param {String} title - Title of the PDF
 * @param {Array} columns - Array of column definitions [{header: 'Name', dataKey: 'name'}]
 * @param {String} filename - Name of the file (without extension)
 */
export const exportToPDF = (data, title, columns, filename) => {
  if (!data || data.length === 0) {
    toast.warn('No data to export');
    return;
  }

  const doc = new jsPDF();

  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 15);

  // Add date
  doc.setFontSize(10);
  const today = new Date().toLocaleDateString('en-GB');
  doc.text(`Generated on: ${today}`, 14, 22);

  // Add table
  doc.autoTable({
    startY: 30,
    head: [columns.map(col => col.header)],
    body: data.map(row => columns.map(col => row[col.dataKey] || '-')),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: 30 },
  });

  // Generate filename with current date
  const dateStr = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${dateStr}.pdf`;

  // Download file
  doc.save(fullFilename);
};

/**
 * Generate PDF blob for viewing
 * @param {Array} data - Array of objects to export
 * @param {String} title - Title of the PDF
 * @param {Array} columns - Array of column definitions
 * @returns {Blob} PDF blob
 */
export const generatePDFBlob = (data, title, columns) => {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 15);

  // Add date
  doc.setFontSize(10);
  const today = new Date().toLocaleDateString('en-GB');
  doc.text(`Generated on: ${today}`, 14, 22);

  // Add table
  doc.autoTable({
    startY: 30,
    head: [columns.map(col => col.header)],
    body: data.map(row => columns.map(col => row[col.dataKey] || '-')),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: 30 },
  });

  return doc.output('blob');
};

/**
 * Format student data for export
 * @param {Array} students - Array of student objects
 * @returns {Array} Formatted data
 */
export const formatStudentDataForExport = (students) => {
  return students.map(s => ({
    'Student ID': s.studentId || '-',
    'Name': s.studentName || '-',
    'Email': s.studentEmail || '-',
    'Phone': s.studentContact || '-',
    'Course': s.courseApplied || '-',
    'City': s.city || '-',
    'Status': s.status || '-',
  }));
};

/**
 * Format receipt data for export
 * @param {Array} receipts - Array of receipt objects
 * @returns {Array} Formatted data
 */
export const formatReceiptDataForExport = (receipts) => {
  return receipts.map(r => ({
    'Receipt No': r.ReceiptNo || '-',
    'Admission No': r.admissionNo || '-',
    'Student Name': r.Admission?.studentName || '-',
    'Phone No': r.Admission?.studentContact || '-',
    'Course': r.course || '-',
    'Base Fee': (Number(r.amount || 0) - (Number(r.CGST || 0) + Number(r.UTGST || 0))).toFixed(2),
    'CGST': Number(r.CGST || 0).toFixed(2),
    'UTGST': Number(r.UTGST || 0).toFixed(2),
    'Grand Total': Number(r.amount || 0).toFixed(2),
    'Total Fees': r.Admission?.StudentFees?.[0]?.totalFeesAfterDiscount ||
      r.Admission?.StudentFees?.[0]?.totalFees || 0,
    'Payment Mode': r.mode || '-',
    'Payment Date': r.paymentDate ? new Date(r.paymentDate).toLocaleDateString('en-GB') : '-',
  }));
};

/**
 * Format refund data for export
 * @param {Array} refunds - Array of refund objects
 * @returns {Array} Formatted data
 */
export const formatRefundDataForExport = (refunds) => {
  return refunds.map(r => ({
    'Admission No': r.admissionNo || '-',
    'Student Name': r.Admission?.studentName || '-',
    'Phone': r.Admission?.studentContact || '-',
    'Father Name': r.Admission?.fatherName || '-',
    'Course': r.Admission?.courseApplied || '-',
    'Refund Amount': Number(r.amount || 0),
    'Reason': r.reason || '-',
    'Refund Date': r.refundDate ? new Date(r.refundDate).toLocaleDateString('en-GB') : '-',
  }));
};
