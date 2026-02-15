import { db } from "./firebase.js";
import { ref, onValue, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const reportOutlet = document.getElementById("reportOutlet");
const reportProduct = document.getElementById("reportProduct");
const reportStartDate = document.getElementById("reportStartDate");
const reportEndDate = document.getElementById("reportEndDate");
const reportList = document.getElementById("reportList");
const exportCsvBtn = document.getElementById("exportCsv");

const reportMonth = document.getElementById("reportMonth");
const reportYear = document.getElementById("reportYear");
const exportMonthlyCsvBtn = document.getElementById("exportMonthlyCsv");

const redAlertBadge = document.getElementById("redAlertBadge");

let outletsCache = {};
let productsCache = {};

/* ---------- EXPIRY COLOR HELPERS ---------- */
function monthsToExpiry(dateStr) {
  const today = new Date();
  const exp = new Date(dateStr);
  return (exp.getFullYear() - today.getFullYear()) * 12 +
         (exp.getMonth() - today.getMonth());
}

function expiryClass(dateStr) {
  const m = monthsToExpiry(dateStr);
  if (m <= 1) return "exp-red";
  if (m <= 2) return "exp-green";
  return "exp-normal";
}

/* ---------- LOAD OUTLETS ---------- */
onValue(ref(db, "outlets"), snapshot => {
  reportOutlet.innerHTML = `<option value="all" selected>All Outlets</option>`;
  snapshot.forEach(snap => {
    const outlet = snap.val();
    outletsCache[snap.key] = outlet;
    const option = document.createElement("option");
    option.value = snap.key;
    option.textContent = outlet.name;
    reportOutlet.appendChild(option);
  });
});

/* ---------- LOAD PRODUCTS ---------- */
onValue(ref(db, "products"), snapshot => {
  reportProduct.innerHTML = `<option value="all" selected>All Products</option>`;
  snapshot.forEach(snap => {
    const product = snap.val();
    productsCache[snap.key] = product;
    const option = document.createElement("option");
    option.value = snap.key;
    option.textContent = `${product.name} (SKU: ${product.sku})`;
    reportProduct.appendChild(option);
  });
});

/* ---------- GENERATE REPORT TABLE ---------- */
async function generateReport() {
  reportList.innerHTML = "";
  const snapshot = await get(ref(db, "expiries"));

  let hasRed = false; // for flashing badge

  if (!snapshot.exists()) {
    reportList.innerHTML = `<tr><td colspan="6">No expiry records found</td></tr>`;
    redAlertBadge.style.display = "none";
    return;
  }

  const entries = Object.entries(snapshot.val());

  // Group by outlet + product + batch
  const grouped = {};

  for (const [id, e] of entries) {
    if ((reportOutlet.value !== "all" && e.outletId !== reportOutlet.value) ||
        (reportProduct.value !== "all" && e.productId !== reportProduct.value)) continue;

    const expiryDate = e.expiryDate;
    if (reportStartDate.value && expiryDate < reportStartDate.value) continue;
    if (reportEndDate.value && expiryDate > reportEndDate.value) continue;

    const key = `${e.outletId}_${e.productId}_${e.batchNo}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);

    // Check if any expiry is red (<=1 month)
    if (!hasRed && monthsToExpiry(expiryDate) <= 1) hasRed = true;
  }

  // Show or hide flashing badge
  redAlertBadge.style.display = hasRed ? "block" : "none";

  // Render table rows
  for (const key in grouped) {
    const group = grouped[key];
    const first = group[0];

    const outletName = outletsCache[first.outletId]?.name || "Unknown";
    const productName = productsCache[first.productId]?.name || "Unknown";
    const sku = first.sku || "";
    const batchNo = first.batchNo;

    const expiryInfo = group.map(e => `
      <span class="expiry-chip ${expiryClass(e.expiryDate)}">
        ${e.expiryDate} (Qty: ${e.quantity})
      </span>
    `).join(" ");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Outlet">${outletName}</td>
      <td data-label="Product">${productName}</td>
      <td data-label="SKU">${sku}</td>
      <td data-label="Batch">${batchNo}</td>
      <td data-label="Expiries & Qty">${expiryInfo}</td>
      <td data-label="Notes">${first.notes || ""}</td>
    `;
    reportList.appendChild(tr);
  }

  if (!reportList.innerHTML) {
    reportList.innerHTML = `<tr><td colspan="6">No records match the selected filters</td></tr>`;
  }
}

/* ---------- EXPORT FILTERED CSV ---------- */
exportCsvBtn.addEventListener("click", async () => {
  const snapshot = await get(ref(db, "expiries"));
  if (!snapshot.exists()) { alert("No data to export!"); return; }

  const entries = Object.entries(snapshot.val());
  let csvContent = "OUTLET,PRODUCT,SKU,BATCHNO,EXPIRY,QTY\n";

  for (const [id, e] of entries) {
    if ((reportOutlet.value !== "all" && e.outletId !== reportOutlet.value) ||
        (reportProduct.value !== "all" && e.productId !== reportProduct.value)) continue;

    const expiryDate = e.expiryDate;
    if (reportStartDate.value && expiryDate < reportStartDate.value) continue;
    if (reportEndDate.value && expiryDate > reportEndDate.value) continue;

    const outletName = outletsCache[e.outletId]?.name || "Unknown";
    const productName = productsCache[e.productId]?.name || "Unknown";
    const sku = e.sku || "";
    const batchNo = e.batchNo || "";
    const qty = e.quantity || "";

    csvContent += `"${outletName}","${productName}","${sku}","${batchNo}","${expiryDate}","${qty}"\n`;
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Short Expiry Reports.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

/* ---------- EXPORT MONTHLY/YEARLY CSV ---------- */
exportMonthlyCsvBtn.addEventListener("click", async () => {
  const snapshot = await get(ref(db, "expiries"));
  if (!snapshot.exists()) { alert("No data to export!"); return; }

  const entries = Object.entries(snapshot.val());
  let groupedMonthly = {};

  for (const [id, e] of entries) {
    if ((reportOutlet.value !== "all" && e.outletId !== reportOutlet.value) ||
        (reportProduct.value !== "all" && e.productId !== reportProduct.value)) continue;

    const [year, month] = e.expiryDate.split("-");
    if (reportYear.value && reportYear.value !== year) continue;
    if (reportMonth.value && reportMonth.value !== month) continue;

    const key = `${e.outletId}_${e.productId}_${e.batchNo}`;
    if (!groupedMonthly[key]) groupedMonthly[key] = { ...e, totalQty: 0 };
    groupedMonthly[key].totalQty += Number(e.quantity);
  }

  let csvContent = "OUTLET,PRODUCT,SKU,BATCHNO,TOTAL QTY\n";
  for (const key in groupedMonthly) {
    const e = groupedMonthly[key];
    const outletName = outletsCache[e.outletId]?.name || "Unknown";
    const productName = productsCache[e.productId]?.name || "Unknown";
    const sku = e.sku || "";
    const batchNo = e.batchNo || "";
    const qty = e.totalQty;

    csvContent += `"${outletName}","${productName}","${sku}","${batchNo}","${qty}"\n`;
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Monthly_Expiry_Report.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

/* ---------- REGENERATE ON FILTER CHANGE ---------- */
reportOutlet.addEventListener("change", generateReport);
reportProduct.addEventListener("change", generateReport);
reportStartDate.addEventListener("change", generateReport);
reportEndDate.addEventListener("change", generateReport);

/* ---------- INITIAL LOAD ---------- */
generateReport();
