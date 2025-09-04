declare global {
  interface Window {
    ExcelJS: any;
    saveAs: any;
  }
}

export async function exportToExcel(data: any[], filename: string): Promise<void> {
  if (typeof window === 'undefined' || !window.ExcelJS || !window.saveAs) {
    throw new Error('ExcelJS or FileSaver library not available');
  }

  try {
    const workbook = new window.ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Business Data');

    // Define columns based on data structure
    const columns = [
      { header: 'Company Name', key: 'companyName', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Website', key: 'website', width: 30 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Industry', key: 'industry', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Verification Date', key: 'updatedAt', width: 20 },
    ];

    worksheet.columns = columns;

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }
    };

    // Add data rows
    data.forEach((record, index) => {
      const row = worksheet.addRow({
        companyName: record.companyName || '',
        email: record.email || '',
        phone: record.phone || '',
        website: record.website || '',
        address: record.address || '',
        industry: record.industry || '',
        status: record.status || '',
        updatedAt: record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : ''
      });

      // Color code rows based on status
      switch (record.status) {
        case 'verified':
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0FDF4' }
          };
          break;
        case 'updated':
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFBEB' }
          };
          break;
        case 'error':
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEF2F2' }
          };
          break;
        case 'new':
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEFF6FF' }
          };
          break;
      }
    });

    // Add borders to all cells
    worksheet.eachRow((row: any, rowNumber: number) => {
      row.eachCell((cell: any) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Create blob and save
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    window.saveAs(blob, filename);
  } catch (error) {
    console.error('Excel export error:', error);
    throw new Error('Failed to export Excel file');
  }
}
