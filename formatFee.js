//created by harminder
/**
 * Formats a fee amount for display.
 * - If the value is a whole number, shows no decimal places (e.g., 15000 → "15000")
 * - If the value has decimals, shows up to 2 decimal places (e.g., 15333.33 → "15333.33")
 * This avoids the year-end accounting discrepancy caused by rounding up every installment.
 *
 * @param {number|string} value - The fee amount
 * @returns {string} - Formatted fee string
 */
export const formatFee = (value) => {
    const num = Number(value || 0);
    if (isNaN(num)) return "0";
    // If it's a whole number, show no decimals
    if (Number.isInteger(num)) return num.toString();
    // Otherwise show up to 2 decimal places (trim trailing zeros)
    return parseFloat(num.toFixed(2)).toString();
};
