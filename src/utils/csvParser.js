import { read, utils } from 'xlsx';

/**
 * Parses a supplier CSV/Excel file and returns the structured data.
 * @param {File} file - The file object to parse.
 * @returns {Promise<Array>} - A promise that resolves to an array of supplier objects.
 */
export const parseSupplierCSV = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawRows = utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                const result = processRawRows(rawRows, file.name);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

const processRawRows = (rawRows, fileName) => {
    if (!rawRows || rawRows.length < 1) {
        throw new Error("The uploaded file appears to be empty.");
    }

    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(15, rawRows.length); i++) {
        const row = rawRows[i];
        const rowStr = row.map(c => String(c).toLowerCase()).join(' ');
        if (rowStr.includes('price') && (rowStr.includes('quality') || rowStr.includes('resource') || rowStr.includes('item'))) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        throw new Error("Could not find a valid header row. Please ensure the CSV has 'Price' and 'Resource Name' columns.");
    }

    const headerRow = rawRows[headerRowIndex].map(h => String(h).replace(/^"|"$/g, '').trim().toLowerCase());
    const supplierIdx = headerRow.findIndex(h => h.includes('supplier'));
    // Prioritize 'resource' or 'item' to avoid matching 'supplier name'
    const nameIdx = headerRow.findIndex(h => (h.includes('resource') || h.includes('item')) || (h.includes('name') && !h.includes('supplier')));
    const qualityIdx = headerRow.findIndex(h => h.includes('quality'));
    const priceIdx = headerRow.findIndex(h => h.includes('price') || h.includes('unit price'));
    const inputIdIdx = headerRow.findIndex(h => h.includes('inputid'));

    if (nameIdx === -1 || priceIdx === -1) {
        throw new Error("Could not find 'Resource Name' or 'Price' columns.");
    }

    // Group items by supplier
    const supplierMap = {};
    let itemCount = 0;

    rawRows.slice(headerRowIndex + 1).forEach(row => {
        if (!row || row.length === 0) return;
        const name = row[nameIdx];
        if (!name) return;

        let priceVal = row[priceIdx];
        let price = 0;
        if (typeof priceVal === 'number') {
            price = priceVal;
        } else {
            const priceStr = String(priceVal || '0').replace(/[^\d.,]/g, '').replace(/,/g, '');
            price = parseFloat(priceStr);
        }

        if (price <= 0) return;

        let quality = 1;
        if (qualityIdx !== -1 && row[qualityIdx] !== undefined) {
            const qStr = String(row[qualityIdx]);
            if (qStr.includes('★')) {
                quality = (qStr.match(/★/g) || []).length;
            } else {
                quality = parseInt(qStr.replace(/\D/g, '')) || 1;
            }
        }

        let capacity = null;
        const capacityMatch = String(name).match(/(\d+)\s*seats?/i);
        if (capacityMatch) {
            capacity = parseInt(capacityMatch[1]);
        }

        let inputId = "";
        if (inputIdIdx !== -1 && row[inputIdIdx]) {
            inputId = String(row[inputIdIdx]).trim();
        }

        // Extract supplier name from CSV or fallback to filename
        let supplierName;
        if (supplierIdx !== -1 && row[supplierIdx]) {
            supplierName = String(row[supplierIdx]).trim();
        } else {
            supplierName = fileName.split('.')[0].replace("Supplier-", "").replace(" - Worksheet", "");
        }

        if (!supplierMap[supplierName]) {
            supplierMap[supplierName] = [];
        }

        supplierMap[supplierName].push({ name: String(name).trim(), quality, price, capacity, inputId });
        itemCount++;
    });

    if (itemCount === 0) {
        throw new Error("Warning: No valid items found in the file. Please check the data format.");
    }

    const result = [];
    Object.entries(supplierMap).forEach(([supplierName, items]) => {
        result.push({ supplierName, items });
    });

    return result;
};
