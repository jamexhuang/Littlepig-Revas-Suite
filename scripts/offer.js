(async () => {
    const startID = 1;
    const endID = 99;

    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const fileBuffers = []; // 暫存所有檔案

    // 從 Content-Disposition 抓檔名的小工具
    const getFilenameFromHeader = (header) => {
        if (!header) return null;
        const match = header.match(/filename\*?=(UTF-8'')?([^;]+)/i);
        if (match) {
            return decodeURIComponent(match[2].replace(/"/g, '').trim());
        }
        return null;
    };

    for (let id = startID; id <= endID; id++) {
        const url = `https://travel.revas.pl/ajax.php?mod=offer&action=offer-export-to-exel&serviceID=${id}&tab=empty&atype=json`;

        console.log(`嘗試下載 serviceID = ${id}`);

        try {
            const res = await fetch(url, { credentials: "include" });
            const type = res.headers.get("content-type") || "";

            // 判斷是否為 Excel
            if (
                type.includes("application/vnd.ms-excel") ||
                type.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            ) {
                const blob = await res.blob();
                if (blob.size === 0) {
                    console.log(`⚠ serviceID=${id} 空檔案，略過`);
                    continue;
                }

                // 優先從 Content-Disposition 抓
                const cd = res.headers.get("content-disposition");
                let filename = getFilenameFromHeader(cd);

                // 若伺服器沒有給檔名 → fallback
                if (!filename) {
                    filename = `offer-${id}.xlsx`;
                }

                fileBuffers.push({ id, blob, filename });
                console.log(`✅ 已取得資料：${filename}`);
            } else {
                console.log(`⚠ serviceID=${id} 非 Excel (${type})，略過`);
            }
        } catch (err) {
            console.error(`❌ serviceID=${id} 錯誤`, err);
        }

        await sleep(100); // 0.1 秒
    }

    console.log(`全部完成，共 ${fileBuffers.length} 個檔案`);

    // --- 建立 UI ---
    const container = document.createElement("div");
    container.style = `
    position: fixed; top: 20px; right: 20px;
    background: #fff; padding: 20px;
    border: 1px solid #ccc; border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 999999;
  `;

    container.innerHTML = `
    <div style="font-size:16px; margin-bottom:10px;">
      下載完成，共 ${fileBuffers.length} 個檔案<br>
      要存在哪？
    </div>
    <button id="saveAllBtn" style="padding: 8px 12px; margin-right:10px;">下載全部</button>
    <button id="closeBtn" style="padding: 8px 12px;">關閉</button>
  `;

    document.body.appendChild(container);

    // 下載全部
    document.getElementById("saveAllBtn").onclick = () => {
        fileBuffers.forEach(({ blob, filename }) => {
            const blobURL = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobURL;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(blobURL);
        });
    };

    document.getElementById("closeBtn").onclick = () => container.remove();
})();