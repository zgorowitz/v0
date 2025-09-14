// lib/cogs/csvHandler.js
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data.map(row => ({
          item_id: row.item_id || row['Item ID'] || row['SKU'] || '',
          title: row.title || row['Title'] || row['Product Name'] || '',
          cogs: parseFloat(row.cogs || row['COGS'] || row['Cost'] || 0),
          tags: (row.tags || row['Tags'] || '')
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
        }));
        resolve(parsedData);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

export function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          reject(new Error('Empty file'));
          return;
        }

        // Get headers from first row
        const headers = jsonData[0];
        const rows = jsonData.slice(1);

        // Find column indices
        const itemIdIndex = headers.findIndex(h =>
          /item[_\s]?id|sku/i.test(h)
        );
        const titleIndex = headers.findIndex(h =>
          /title|product[_\s]?name|name/i.test(h)
        );
        const cogsIndex = headers.findIndex(h =>
          /cogs|cost/i.test(h)
        );
        const tagsIndex = headers.findIndex(h =>
          /tags|categories/i.test(h)
        );

        // Parse rows
        const parsedData = rows.map(row => ({
          item_id: row[itemIdIndex] || '',
          title: row[titleIndex] || '',
          cogs: parseFloat(row[cogsIndex] || 0),
          tags: row[tagsIndex]
            ? String(row[tagsIndex]).split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
            : []
        })).filter(row => row.item_id); // Filter out rows without item_id

        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
}

export async function handleFileUpload(file) {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv')) {
    return parseCSV(file);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseExcel(file);
  } else {
    throw new Error('Unsupported file format. Please upload CSV or Excel file.');
  }
}

export function generateCSVTemplate() {
  const template = [
    ['item_id', 'title', 'cogs', 'tags'],
    ['MLB123456789', 'Sample Product 1', '100.50', 'electronics,imported'],
    ['MLB987654321', 'Sample Product 2', '50.25', 'clothing,seasonal']
  ];

  const csv = Papa.unparse(template);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'item_management_template.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToCSV(data) {
  const exportData = data.map(item => ({
    item_id: item.item_id,
    title: item.title,
    cogs: item.cogs || 0,
    tags: (item.tags || []).join(','),
    available_quantity: item.available_quantity || 0,
    status: item.status || ''
  }));

  const csv = Papa.unparse(exportData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `items_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}