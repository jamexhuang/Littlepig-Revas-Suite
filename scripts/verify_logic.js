
const assert = require('assert');

// Mock Data
const rawRows = [
    ["Supplier", "Resource name", "Quality", "Price", "Order", "Value", "InputID"],
    ["Bis", "Bus - trip to the beach 50 seats", 1, 1300, 0, 0, "partSupplierHasPartID_1480"],
    ["Bis", "Bus - horse riding camp 40 seats", 1, 1248, 0, 0, "partSupplierHasPartID_946"]
];

// Logic extracted from PurchasingModule.js
const processRawRows = (rawRows, fileName) => {
    if (!rawRows || rawRows.length < 1) return [];
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(15, rawRows.length); i++) {
        const row = rawRows[i];
        const rowStr = row.map(c => String(c).toLowerCase()).join(' ');
        if (rowStr.includes('price') && (rowStr.includes('quality') || rowStr.includes('resource') || rowStr.includes('item'))) {
            headerRowIndex = i;
            break;
        }
    }
    if (headerRowIndex === -1) return [];

    const headerRow = rawRows[headerRowIndex].map(h => String(h).replace(/^"|"$/g, '').trim().toLowerCase());
    const nameIdx = headerRow.findIndex(h => h.includes('resource') || h.includes('item') || h.includes('name'));
    const qualityIdx = headerRow.findIndex(h => h.includes('quality'));
    const priceIdx = headerRow.findIndex(h => h.includes('price') || h.includes('unit price'));

    if (nameIdx === -1 || priceIdx === -1) return [];

    const items = rawRows.slice(headerRowIndex + 1).map(row => {
        if (!row || row.length === 0) return null;
        const name = row[nameIdx];
        if (!name) return null;
        let priceVal = row[priceIdx];
        let price = 0;
        if (typeof priceVal === 'number') {
            price = priceVal;
        } else {
            const priceStr = String(priceVal || '0').replace(/[^\d.,]/g, '').replace(/,/g, '');
            price = parseFloat(priceStr);
        }
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

        return { name: String(name).trim(), quality, price, capacity };
    }).filter(item => item && item.price > 0);

    return items;
};

// Test Parsing
const items = processRawRows(rawRows, "test.csv");
console.log("Parsed Items:", items);

const bus50 = items.find(i => i.name.includes("50 seats"));
const bus40 = items.find(i => i.name.includes("40 seats"));

assert.strictEqual(bus50.capacity, 50, "Bus 50 capacity should be 50");
assert.strictEqual(bus40.capacity, 40, "Bus 40 capacity should be 40");

// Logic extracted from AnalyzerModule.js (simplified for test)
const calculateCost = (pax, unitCost, capacity, ruleType, ruleVal) => {
    let totalItemCost = 0;
    if (ruleType === 'per_group') {
        // Use parsed capacity if available, otherwise use rule default
        const groupSize = capacity || ruleVal;
        const groups = Math.ceil(pax / groupSize);
        totalItemCost = unitCost * groups;
    }
    return totalItemCost;
};

// Test Calculation
const pax = 45;

// Case 1: 50 seats bus
// 45 pax / 50 capacity = 1 bus
// Cost = 1300 * 1 = 1300
const cost50 = calculateCost(pax, bus50.price, bus50.capacity, 'per_group', 50);
console.log(`Cost for 50 seats bus (Pax ${pax}):`, cost50);
assert.strictEqual(cost50, 1300, "Cost for 50 seats bus should be 1300");

// Case 2: 40 seats bus
// 45 pax / 40 capacity = 2 buses
// Cost = 1248 * 2 = 2496
const cost40 = calculateCost(pax, bus40.price, bus40.capacity, 'per_group', 40); // ruleVal doesn't matter if capacity is present
console.log(`Cost for 40 seats bus (Pax ${pax}):`, cost40);
assert.strictEqual(cost40, 2496, "Cost for 40 seats bus should be 2496");

console.log("All tests passed!");
