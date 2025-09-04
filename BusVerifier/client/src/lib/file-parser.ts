// Note: In a real application, you would install and import these libraries
// For now, we'll assume they're available globally via CDN
declare global {
  interface Window {
    Papa: any;
    ExcelJS: any;
  }
}

export async function parseFileData(file: File): Promise<Record<string, any>[]> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  if (fileExtension === 'csv') {
    return parseCSV(file);
  } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    return parseExcel(file);
  } else {
    throw new Error('Unsupported file format');
  }
}

async function parseCSV(file: File): Promise<Record<string, any>[]> {
  return new Promise(async (resolve, reject) => {
    // Check if Papa Parse is available
    if (typeof window !== 'undefined' && window.Papa) {
      window.Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          if (results.errors.length > 0) {
            reject(new Error('CSV parsing error: ' + results.errors[0].message));
          } else {
            resolve(results.data);
          }
        },
        error: (error: any) => {
          reject(new Error('CSV parsing error: ' + error.message));
        }
      });
    } else {
      // Fallback manual CSV parsing
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        reject(new Error('CSV file must have at least a header and one data row'));
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: Record<string, any> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
      
      resolve(data);
    }
  });
}

async function parseExcel(file: File): Promise<Record<string, any>[]> {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if ExcelJS is available
      if (typeof window !== 'undefined' && window.ExcelJS) {
        const workbook = new window.ExcelJS.Workbook();
        const arrayBuffer = await file.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);
        
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          reject(new Error('No worksheet found in Excel file'));
          return;
        }
        
        const data: Record<string, any>[] = [];
        const headers: string[] = [];
        
        // Get headers from first row
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell: any, colNumber: number) => {
          headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
        });
        
        // Process data rows
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
          const row = worksheet.getRow(rowNumber);
          const rowData: Record<string, any> = {};
          
          row.eachCell((cell: any, colNumber: number) => {
            const header = headers[colNumber - 1];
            if (header) {
              rowData[header] = cell.value?.toString() || '';
            }
          });
          
          // Only add non-empty rows
          if (Object.values(rowData).some(value => value && value.toString().trim())) {
            data.push(rowData);
          }
        }
        
        resolve(data);
      } else {
        reject(new Error('ExcelJS library not available. Please include it via CDN.'));
      }
    } catch (error) {
      reject(new Error('Excel parsing error: ' + (error instanceof Error ? error.message : 'Unknown error')));
    }
  });
}
