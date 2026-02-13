/**
 * Utility functions for date handling in the application.
 */

/**
 * Normalizes varied date inputs (Excel serial numbers, strings, Date objects) into a valid JS Date object.
 * @param {any} value - The input value to convert to a Date.
 * @returns {Date|null} - The valid Date object or null if invalid.
 */
export const normalizeDate = (value) => {
    if (!value) return null;

    // Excel serial date format (numbers)
    if (typeof value === 'number') {
        // Excel base date is Dec 30, 1899. 
        // 25569 is the offset to Unix epoch (Jan 1, 1970).
        // 86400 * 1000 is milliseconds per day.
        return new Date(Math.round((value - 25569) * 86400 * 1000));
    }

    // Try parsing as standard date string/object
    const date = new Date(value);
    
    // Check if valid date
    if (Object.prototype.toString.call(date) === "[object Date]" && !isNaN(date)) {
        return date;
    }

    return null;
};

/**
 * Generates a consistent week identifier string from a Date object.
 * Format: "Semana X - YYYY"
 * @param {Date} date - The date to get the week for.
 * @returns {string} - The week identifier.
 */
export const getWeekIdentifier = (date) => {
    if (!date) return '';
    
    const oneJan = new Date(date.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((date - oneJan) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((date.getDay() + 1 + numberOfDays) / 7);
    
    return `Semana ${weekNum} - ${date.getFullYear()}`;
};

/**
 * Generates a consistent month identifier string from a Date object.
 * Format: "MonthName YYYY" (e.g., "enero 2024")
 * @param {Date} date - The date to get the month for.
 * @returns {string} - The month identifier.
 */
export const getMonthIdentifier = (date) => {
    if (!date) return '';
    return date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
};
