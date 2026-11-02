import ExcelJS from 'exceljs';

/**
 * Clean, safe Excel (.xlsx) file exporter using ExcelJS.
 * Free from SheetJS prototype pollution (GHSA-4r6h-8v6p-xvw6)
 * and regular expression denial of service (GHSA-5pgg-2g8v-p4x9) vulnerabilities.
 */

export async function exportJsonToExcel(
  data: Record<string, any>[],
  sheetName: string = 'Sheet1',
  fileName: string = 'export.xlsx'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Baba Fareed Seed Corporation ERP';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName.substring(0, 31));

  if (data && data.length > 0) {
    const keys = Object.keys(data[0]);
    worksheet.columns = keys.map(key => ({
      header: key,
      key: key,
      width: Math.max(15, key.length + 4)
    }));

    // Header styling
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF064E3B' } // emerald-950
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    data.forEach(item => {
      worksheet.addRow(item);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  triggerBlobDownload(buffer, fileName);
}

export async function exportAoaToExcel(
  aoa: any[][],
  sheetName: string = 'Sheet1',
  fileName: string = 'export.xlsx'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Baba Fareed Seed Corporation ERP';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName.substring(0, 31));

  aoa.forEach((row, rowIndex) => {
    const addedRow = worksheet.addRow(row);
    // If it's a section header row
    const firstCell = String(row[0] || '');
    if (firstCell.startsWith('---') || rowIndex === 0) {
      addedRow.font = { bold: true };
      if (rowIndex === 0) {
        addedRow.font = { bold: true, size: 14 };
      }
    } else if (rowIndex === 4) {
      // Table header in Trial Balance
      addedRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      addedRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF064E3B' }
      };
    }
  });

  // Adjust column widths automatically
  worksheet.columns.forEach(column => {
    let maxLen = 12;
    column.eachCell?.({ includeEmpty: false }, cell => {
      const val = cell.value ? String(cell.value) : '';
      if (val.length > maxLen && val.length < 50) {
        maxLen = val.length;
      }
    });
    column.width = maxLen + 2;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  triggerBlobDownload(buffer, fileName);
}

function triggerBlobDownload(buffer: ExcelJS.Buffer, fileName: string) {
  const safeName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
