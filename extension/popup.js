// Version: 1.1.4

// Restore state when popup loads
function restoreState(statusDiv, previewContainer, btnPreview, autoClickToggle) {
  chrome.storage.local.get(['pendingOrders', 'statusHTML', 'autoClickerOn'], (result) => {
    if (result.pendingOrders && result.pendingOrders.length > 0) {
      pendingOrders = result.pendingOrders;
      renderPreview(pendingOrders);
      previewContainer.style.display = 'block';
    }
    if (result.statusHTML) {
      statusDiv.innerHTML = result.statusHTML;
    }
    if (result.autoClickerOn !== undefined) {
      autoClickToggle.checked = result.autoClickerOn;
    }
  });
}

function saveState(options) {
  chrome.storage.local.set(options);
}

document.addEventListener('DOMContentLoaded', () => {
  const btnScan = document.getElementById('btnScan');
  const btnPreview = document.getElementById('btnPreview');
  const btnConfirm = document.getElementById('btnConfirm');
  const fileInput = document.getElementById('csvFile');
  const statusDiv = document.getElementById('status');
  const previewContainer = document.getElementById('previewContainer');
  const previewTableBody = document.querySelector('#previewTable tbody');

  let pendingOrders = []; // Store parsed orders for confirmation
  const btnClearState = document.getElementById('btnClearState');

  // Restore state on load
  restoreState(statusDiv, previewContainer, btnPreview, autoClickToggle);

  // 1. 掃描並匯出 CSV
  btnScan.addEventListener('click', async () => {
    statusDiv.textContent = "正在掃描頁面並抓取 AJAX 資料...";

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: scanAndExportSuppliers
    }, (results) => {
      if (chrome.runtime.lastError) {
        statusDiv.textContent = "錯誤: " + chrome.runtime.lastError.message;
      } else if (results && results[0] && results[0].result) {
        statusDiv.textContent = results[0].result;
      }
    });
  });

  // 監聽檔案上傳，啟用按鈕
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      btnPreview.disabled = false;
      statusDiv.textContent = "訂單檔案已載入，請點擊預覽。";
      previewContainer.style.display = 'none';
    }
  });

  // 3. 預覽訂單
  btnPreview.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    statusDiv.textContent = "正在讀取並解析 CSV...";
    const reader = new FileReader();

    reader.onload = async function (e) {
      const csvContent = e.target.result;
      statusDiv.textContent = "正在比對網頁資料...";

      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Execute script to parse and match, returning the list instead of buying
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [csvContent],
        function: parseAndMatchOrders
      }, (results) => {
        if (results && results[0] && results[0].result) {
          const result = results[0].result;
          if (result.error) {
            statusDiv.textContent = result.error;
            return;
          }

          pendingOrders = result.orders;
          renderPreview(pendingOrders);

          // Calculate total estimated cost
          const totalCost = pendingOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
          statusDiv.innerHTML = `解析完成，共 <b>${pendingOrders.length}</b> 筆有效訂單。<br>預估總金額: <b style="color: #d9534f; font-size: 14px;">$${totalCost.toLocaleString()}</b>`;
          previewContainer.style.display = 'block';
          
          saveState({
            pendingOrders: pendingOrders,
            statusHTML: statusDiv.innerHTML
          });
        }
      });
    };

    reader.readAsText(file);
  });

  // 4. 確認並送出
  btnConfirm.addEventListener('click', async () => {
    if (!pendingOrders || pendingOrders.length === 0) return;

    statusDiv.textContent = "正在送出訂單...";
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [pendingOrders],
      function: executeOrders
    }, (results) => {
      if (results && results[0] && results[0].result) {
        statusDiv.textContent = results[0].result;
        previewContainer.style.display = 'none';
        btnPreview.disabled = true;
        fileInput.value = ''; // Reset file input
        
        // Clear pending orders after execution
        pendingOrders = [];
        saveState({
          pendingOrders: [],
          statusHTML: statusDiv.textContent
        });
      }
    });
  });

  // 5. 自動點擊 Cancel 按鈕
  const autoClickToggle = document.getElementById('autoClickToggle');

  autoClickToggle.addEventListener('change', async (e) => {
    const isChecked = e.target.checked;
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (isChecked) {
      statusDiv.textContent = "已啟動自動點擊 (每 100ms)...";
      saveState({ autoClickerOn: true, statusHTML: "已啟動自動點擊 (每 100ms)..." });
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: startAutoClicker
      });
    } else {
      statusDiv.textContent = "已停止自動點擊。";
      saveState({ autoClickerOn: false, statusHTML: "已停止自動點擊。" });
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: stopAutoClicker
      });
    }
  });

  if (btnClearState) {
    btnClearState.addEventListener('click', () => {
      chrome.storage.local.clear(() => {
        pendingOrders = [];
        previewContainer.style.display = 'none';
        statusDiv.textContent = "已清除儲存的狀態。";
        btnPreview.disabled = true;
        fileInput.value = '';
        autoClickToggle.checked = false;
      });
    });
  }

  function renderPreview(orders) {
    previewTableBody.innerHTML = '';
    orders.forEach(order => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #eee';

      const statusColor = order.found ? 'green' : 'red';
      const statusText = order.found ? 'OK' : 'Missing';
      const totalPrice = order.totalPrice ? `$${order.totalPrice.toLocaleString()}` : '-';

      tr.innerHTML = `
        <td style="padding: 4px;">${order.supplierName}</td>
        <td style="padding: 4px;">${order.itemName}</td>
        <td style="padding: 4px;">${order.qty}</td>
        <td style="padding: 4px;">${totalPrice}</td>
        <td style="padding: 4px; color: ${statusColor}; font-weight: bold;">${statusText}</td>
      `;
      previewTableBody.appendChild(tr);
    });
  }
});

/**
 * [Content Script Context]
 * 啟動自動點擊器
 */
function startAutoClicker() {
  if (window.revasAutoClickerId) {
    console.log("[智慧助理] 自動點擊器已經在運行中。");
    return;
  }

  const INTERVAL_TIME_MS = 100;
  const selector = 'button.btn.btn-action-cancel.delete-buy-decision-value:not([data-clicked-by-script="true"])';
  let totalClickedCount = 0;

  console.log(`[智慧助理] 🌟 啟動穩定自動點擊程序 (V7.0.0)。每 ${INTERVAL_TIME_MS} 毫秒檢查一次。`);

  const clicker = () => {
    const buttons = document.querySelectorAll(selector);
    if (buttons.length > 0) {
      buttons.forEach((button) => {
        try {
          button.click();
          totalClickedCount++;
          button.setAttribute('data-clicked-by-script', 'true');
          const decisionId = button.getAttribute('decisionvalueid');
          console.log(`[智慧助理] 點擊並標記按鈕 (Decision ID: ${decisionId || 'N/A'})。`);
        } catch (error) {
          button.setAttribute('data-clicked-by-script', 'true');
          console.error(`[智慧助理] 點擊時發生錯誤，已標記該按鈕:`, error);
        }
      });
      console.log(`[智慧助理] 處理中... 當前點擊了 ${buttons.length} 個新按鈕。累積總數: ${totalClickedCount}`);
    }
  };

  window.revasAutoClickerId = setInterval(clicker, INTERVAL_TIME_MS);
}

/**
 * [Content Script Context]
 * 停止自動點擊器
 */
function stopAutoClicker() {
  if (window.revasAutoClickerId) {
    clearInterval(window.revasAutoClickerId);
    window.revasAutoClickerId = null;
    console.log(`[智慧助理] 🛑 自動點擊程序已手動停止。`);
  } else {
    console.log(`[智慧助理] 自動點擊器未運行。`);
  }
}

/**
 * [Content Script Context]
 * 掃描頁面上的供應商，獲取 AJAX 資料，並下載 CSV
 */
async function scanAndExportSuppliers() {
  const escapeCsv = (text) => {
    if (text === null || text === undefined) return '';
    const str = text.toString();
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  try {
    const supplierButtons = document.querySelectorAll('#supplier_list .light-well-item');
    const suppliers = [];

    supplierButtons.forEach(div => {
      const nameEl = div.querySelector('.light-well-title');
      const dbBtn = div.querySelector('a.btn.btn-more[href*="tab=part_database"]');

      if (nameEl && dbBtn) {
        const supplierName = nameEl.textContent.trim();
        const urlParams = new URLSearchParams(dbBtn.href.split('?')[1]);
        const partSupplierID = urlParams.get('partSupplierID');

        suppliers.push({
          name: supplierName,
          id: partSupplierID,
          url: dbBtn.href
        });
      }
    });

    if (suppliers.length === 0) return "未找到供應商，請確認是否在正確頁面。";

    let csvRows = ["Supplier,Resource name,Quality,Price,Order,Value,InputID"];

    for (const supplier of suppliers) {
      const ajaxUrl = `/ajax.php?mod=suppliers&tab=part_database&partSupplierID=${supplier.id}`;
      const response = await fetch(ajaxUrl);
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');

      const rows = doc.querySelectorAll('#parts_table tbody tr');
      rows.forEach(tr => {
        const nameContainer = tr.querySelector('td:nth-child(1) .container_name_info');
        let resourceName = "";
        if (nameContainer) {
          let html = nameContainer.innerHTML;
          html = html.replace(/<br\s*\/?>/gi, " ");
          const temp = document.createElement('div');
          temp.innerHTML = html;
          resourceName = temp.textContent.trim().replace(/\s+/g, " ");
        }

        const qualityDiv = tr.querySelector('td:nth-child(2) .quality');
        const stars = qualityDiv ? qualityDiv.querySelectorAll('img[src*="/gfx/star.svg"]').length : 0;

        const priceSpan = tr.querySelector('td:nth-child(3) span[style="display: none"]');
        let price = priceSpan ? priceSpan.textContent.replace(',', '.').trim() : "0";
        price = parseFloat(price);

        const input = tr.querySelector('td:nth-child(4) input.part_number');
        const inputId = input ? input.getAttribute('name') : "";

        csvRows.push([
          escapeCsv(supplier.name),
          escapeCsv(resourceName),
          stars,
          price,
          0,
          0,
          inputId
        ].join(','));
      });
    }

    const csvString = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Revas_Resources_Parsed_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return `成功匯出 ${suppliers.length} 個供應商的資料！`;

  } catch (e) {
    console.error(e);
    return "發生錯誤: " + e.message;
  }
}

/**
 * [Content Script Context]
 * 解析 CSV 並與網頁資料比對，回傳預覽資料
 */
async function parseAndMatchOrders(csvContent) {
  try {
    // 1. 重建網頁資料庫
    const supplierButtons = document.querySelectorAll('#supplier_list .light-well-item');
    const suppliersMap = {};

    for (const div of supplierButtons) {
      const nameEl = div.querySelector('.light-well-title');
      const dbBtn = div.querySelector('a.btn.btn-more[href*="tab=part_database"]');
      if (nameEl && dbBtn) {
        const sName = nameEl.textContent.trim();
        const sId = new URLSearchParams(dbBtn.href.split('?')[1]).get('partSupplierID');
        suppliersMap[sName] = { id: sId, items: [] };
      }
    }

    for (const sName in suppliersMap) {
      const sId = suppliersMap[sName].id;
      const ajaxUrl = `/ajax.php?mod=suppliers&tab=part_database&partSupplierID=${sId}`;
      const response = await fetch(ajaxUrl);
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');

      const rows = doc.querySelectorAll('#parts_table tbody tr');
      rows.forEach(tr => {
        const nameContainer = tr.querySelector('.container_name_info');
        let rawName = "";
        if (nameContainer) {
          let html = nameContainer.innerHTML;
          html = html.replace(/<br\s*\/?>/gi, " ");
          const temp = document.createElement('div');
          temp.innerHTML = html;
          rawName = temp.textContent.trim().replace(/\s+/g, " ");
        }

        const qualityDiv = tr.querySelector('.quality');
        const stars = qualityDiv ? qualityDiv.querySelectorAll('img[src*="/gfx/star.svg"]').length : 0;

        const priceSpan = tr.querySelector('td:nth-child(3) span[style="display: none"]');
        let price = priceSpan ? priceSpan.textContent.replace(',', '.').trim() : "0";
        price = parseFloat(price);

        const input = tr.querySelector('input.part_number');
        const paramName = input ? input.getAttribute('name') : "";

        if (paramName) {
          suppliersMap[sName].items.push({
            name: rawName,
            quality: stars,
            price: price, // Capture price
            paramName: paramName,
            qty: 0
          });
        }
      });
    }

    // 2. 解析 CSV
    const rows = csvContent.trim().split(/\r?\n/);
    const headers = rows[0].split(',');

    const idxSupplier = headers.findIndex(h => h.includes('Supplier'));
    const idxItem = headers.findIndex(h => h.includes('Resource name') || h.includes('Resource Item'));
    const idxQuality = headers.findIndex(h => h.includes('Quality'));
    const idxQty = headers.findIndex(h => h.includes('Order') || h.includes('Required Qty'));
    const idxInputID = headers.findIndex(h => h.includes('InputID'));

    if (idxSupplier === -1 || idxItem === -1 || idxQty === -1) {
      return { error: "錯誤：CSV 欄位名稱不符 (需包含 Supplier, Resource name, Order)" };
    }

    const matchedOrders = [];

    for (let i = 1; i < rows.length; i++) {
      // Improved CSV splitting regex: splits by comma only if not inside quotes
      const cols = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      const cleanCols = cols.map(c => c ? c.replace(/^"|"$/g, '').trim() : '');

      if (cleanCols.length < headers.length) continue;

      const orderSupplier = cleanCols[idxSupplier];
      const orderItem = cleanCols[idxItem];
      const orderQuality = parseInt(cleanCols[idxQuality] || "1");
      const orderQty = parseInt(cleanCols[idxQty] || "0");
      const orderInputID = idxInputID !== -1 ? cleanCols[idxInputID] : null;

      if (orderQty <= 0) continue;

      let found = false;
      let targetParamName = null;
      let unitPrice = 0;
      let totalPrice = 0;

      if (suppliersMap[orderSupplier]) {
        const targetItems = suppliersMap[orderSupplier].items;
        let match = null;

        if (orderInputID) {
          match = targetItems.find(item => item.paramName === orderInputID);
        }

        if (!match) {
          match = targetItems.find(item => {
            if (item.quality !== orderQuality) return false;
            const normHtmlName = item.name.toLowerCase().replace(/\s+/g, '');
            const normCsvName = orderItem.toLowerCase().replace(/\s+/g, '');
            return normHtmlName.includes(normCsvName);
          });
        }

        if (match) {
          match.qty = orderQty;
          found = true;
          targetParamName = match.paramName;
          unitPrice = match.price;
          totalPrice = unitPrice * orderQty;
        }
      }

      matchedOrders.push({
        supplierName: orderSupplier,
        itemName: orderItem, // Now should be full name due to better regex
        qty: orderQty,
        found: found,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        paramName: targetParamName,
        supplierId: suppliersMap[orderSupplier] ? suppliersMap[orderSupplier].id : null
      });
    }

    return { orders: matchedOrders };

  } catch (e) {
    console.error(e);
    return { error: "解析錯誤: " + e.message };
  }
}

/**
 * [Content Script Context]
 * 接收確認後的訂單列表，執行購買
 */
async function executeOrders(orders) {
  try {
    // Group by supplier to send batch requests
    const supplierBatches = {};

    orders.forEach(order => {
      if (!order.found || !order.supplierId) return;

      if (!supplierBatches[order.supplierId]) {
        supplierBatches[order.supplierId] = {
          name: order.supplierName,
          items: []
        };
      }
      supplierBatches[order.supplierId].items.push({
        paramName: order.paramName,
        qty: order.qty
      });
    });

    let successCount = 0;
    const totalSuppliers = Object.keys(supplierBatches).length;

    for (const sId in supplierBatches) {
      const batch = supplierBatches[sId];

      const baseUrl = `https://travel.revas.pl/ajax.php`;
      const params = new URLSearchParams();
      params.append('mod', 'suppliers');
      params.append('tab', 'empty');
      params.append('atype', 'json');

      // Note: We only send items we want to buy. 
      // If the requirement is to "reset" other items to 0, we would need the full list again.
      // However, usually sending just the ones to update is safer unless we are sure we want to zero others.
      // The previous logic scanned EVERYTHING and set 0 for non-matches.
      // If we want to maintain that "safety" feature (clearing old values), we need to know all paramNames for that supplier.
      // But since we are doing a fresh "Preview -> Buy" flow, maybe we just send what we want.
      // Let's assume we just send what we want to buy for now to be safe and efficient, 
      // UNLESS the user explicitly wants to clear others. 
      // The previous code did: `supplierData.items.forEach... params.append(item.paramName, item.qty);` where qty defaulted to 0.
      // This implies a "full state update".
      // To support "full state update", we would need to re-scan or pass the full map.
      // Re-scanning inside execute might be redundant but safer to ensure we have all keys.
      // Let's do a quick re-scan of that specific supplier to get ALL keys, then apply our orders.

      // Re-fetch supplier page to get ALL input IDs (to set non-ordered to 0)
      const ajaxUrl = `/ajax.php?mod=suppliers&tab=part_database&partSupplierID=${sId}`;
      const response = await fetch(ajaxUrl);
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');

      const inputs = doc.querySelectorAll('input.part_number');
      inputs.forEach(input => {
        const pName = input.getAttribute('name');
        // Check if this pName is in our buy list
        const buyItem = batch.items.find(i => i.paramName === pName);
        const qtyToBuy = buyItem ? buyItem.qty : 0;
        params.append(pName, qtyToBuy);
      });

      params.append('action', 'save-buy-decision-value');
      const fullUrl = `${baseUrl}?${params.toString()}`;

      try {
        const res = await fetch(fullUrl);
        const json = await res.json();
        if (json.success) {
          successCount++;
          console.log(`[${batch.name}] 訂單已送出。`);
        } else {
          console.error(`[${batch.name}] 失敗:`, json);
        }
      } catch (err) {
        console.error(`[${batch.name}] 網路錯誤:`, err);
      }
    }

    return `執行完成！成功送出 ${successCount} / ${totalSuppliers} 個供應商的請求。`;

  } catch (e) {
    console.error(e);
    return "執行錯誤: " + e.message;
  }
}
