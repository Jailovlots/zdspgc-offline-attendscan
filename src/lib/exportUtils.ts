/**
 * Utility for exporting data to CSV with support for metadata sections
 * and UTF-8 BOM for Excel compatibility.
 */

export type CSVRow = (string | number | boolean | null | undefined)[];

export interface CSVSection {
  title?: string;
  headers?: string[];
  rows: CSVRow[];
}

/**
 * Format a single value for CSV (quoting and escaping)
 */
const formatValue = (val: any): string => {
  if (val === null || val === undefined) return "";
  const str = String(val);
  // If value contains comma, newline or double quote, wrap it in double quotes
  if (/[,\n"]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Export data to a CSV file
 */
export const exportToCsv = (
  filename: string,
  sections: CSVSection[]
) => {
  let csvContent = "";

  sections.forEach((section, index) => {
    // Add title if present
    if (section.title) {
      csvContent += `${formatValue(section.title)}\n`;
    }

    // Add headers if present
    if (section.headers) {
      csvContent += section.headers.map(formatValue).join(",") + "\n";
    }

    // Add rows
    section.rows.forEach((row) => {
      csvContent += row.map(formatValue).join(",") + "\n";
    });

    // Add spacing between sections
    if (index < sections.length - 1) {
      csvContent += "\n";
    }
  });

  // Create blob with BOM for UTF-8 (Excel compatibility)
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  
  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
