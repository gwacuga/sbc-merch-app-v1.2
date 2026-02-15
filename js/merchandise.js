import { db } from "./firebase.js";
import { ref, onValue } 
from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// ===============================
// DOM
// ===============================
const outletSelect = document.getElementById("merchandiseOutlet");
const productsTable = document
  .getElementById("merchProductsTable")
  .querySelector("tbody");

const finishBtn = document.getElementById("finishMerchandising");

// MODAL
const finishModal = document.getElementById("finishModal");
const confirmFinish = document.getElementById("confirmFinish");
const cancelFinish = document.getElementById("cancelFinish");

// ALL KPI CHECKBOXES (AUTO)
const kpis = document.querySelectorAll('.kpi-table input[type="checkbox"]');

// ===============================
// KPI STORAGE SYSTEM
// ===============================
function getKPIKey(outletId){
  return `kpis_${outletId}`;
}

function saveKPIs(outletId){
  const data = {};
  kpis.forEach(kpi=>{
    data[kpi.id] = kpi.checked;
  });
  localStorage.setItem(getKPIKey(outletId), JSON.stringify(data));
}

function loadKPIs(outletId){
  const data = JSON.parse(localStorage.getItem(getKPIKey(outletId)));
  if(!data) return;

  kpis.forEach(kpi=>{
    kpi.checked = data[kpi.id] || false;
  });
}

function clearKPIs(outletId){
  localStorage.removeItem(getKPIKey(outletId));
  kpis.forEach(kpi=>{
    kpi.checked = false;
  });
}

// Auto-save KPIs
kpis.forEach(kpi=>{
  kpi.addEventListener("change", ()=>{
    const outletId = localStorage.getItem("activeOutlet");
    if(outletId) saveKPIs(outletId);
  });
});

// ===============================
// CACHES
// ===============================
let outletsCache = {};
let productsCache = {};

// ===============================
// LOAD OUTLETS
// ===============================
onValue(ref(db, "outlets"), snapshot => {

  outletSelect.innerHTML =
    `<option value="" disabled>Select Outlet</option>`;

  outletsCache = {};

  snapshot.forEach(snap => {
    const outlet = snap.val();
    outletsCache[snap.key] = outlet;

    const option = document.createElement("option");
    option.value = snap.key;
    option.textContent = outlet.name;
    outletSelect.appendChild(option);
  });

  // Restore session if exists
  const savedOutlet = localStorage.getItem("activeOutlet");

  if(savedOutlet && outletsCache[savedOutlet]){
    outletSelect.value = savedOutlet;
    loadProducts(savedOutlet);
    loadKPIs(savedOutlet);
  }
});

// ===============================
// LOAD PRODUCTS FOR OUTLET
// ===============================
function loadProducts(outletId){

  productsTable.innerHTML = "";

  if (!outletId || !outletsCache[outletId]) return;

  onValue(ref(db, "products"), snapshot => {

    productsCache = {};
    productsTable.innerHTML = "";

    snapshot.forEach(snap => {

      const product = snap.val();
      productsCache[snap.key] = product;

      // Only show products listed in outlet
      if (outletsCache[outletId].products?.[snap.key]) {

        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${product.name || ""}</td>
          <td>${product.sku || ""}</td>
          <td>${product.batchNo || ""}</td>
        `;

        productsTable.appendChild(tr);
      }
    });

  });
}

// ===============================
// OUTLET CHANGE
// ===============================
outletSelect.addEventListener("change", () => {

  const outletId = outletSelect.value;
  if(!outletId) return;

  localStorage.setItem("activeOutlet", outletId);

  loadProducts(outletId);
  loadKPIs(outletId);
});

// ===============================
// FINISH MERCH → SHOW MODAL
// ===============================
finishBtn.addEventListener("click", ()=>{

  const outletId = localStorage.getItem("activeOutlet");

  if(!outletId){
    showToast("Select an outlet first", "error");

    return;
  }

  finishModal.classList.add("show");
});

// ===============================
// CONFIRM FINISH
// ===============================
confirmFinish.addEventListener("click", ()=>{

  const outletId = localStorage.getItem("activeOutlet");
  if(!outletId) return;

  clearKPIs(outletId);
  localStorage.removeItem("activeOutlet");

  outletSelect.value = "";
  productsTable.innerHTML = "";

  finishModal.classList.remove("show");

  showToast("Merchandising session completed ✅");


});

function showToast(message, type = "default"){
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.className = "toast"; // reset previous styles

  if(type === "error"){
    toast.classList.add("error");
  }

  toast.classList.add("show");

  setTimeout(()=>{
    toast.classList.remove("show");
  }, 2500);
}



// ===============================
// CANCEL FINISH
// ===============================
cancelFinish.addEventListener("click", ()=>{
  finishModal.classList.remove("show");
});




function requireOutletAndGo(path){

  const outletId = localStorage.getItem("activeOutlet");

  if(!outletId){
    showToast("Select an outlet first", "error");
    return;
  }

  window.location.href = path;
}

document.getElementById("merchAddExpiry")
.addEventListener("click", (e)=>{
  e.preventDefault();
  requireOutletAndGo("expiry.html");
});

document.getElementById("merchAddOccurrence")
.addEventListener("click", (e)=>{
  e.preventDefault();
  requireOutletAndGo("occurrence.html");
});

document.getElementById("merchAddGRN")
.addEventListener("click", (e)=>{
  e.preventDefault();
  requireOutletAndGo("grn.html");
});

document.getElementById("merchViewAnalysis")
.addEventListener("click", (e)=>{
  e.preventDefault();
  requireOutletAndGo("analysis.html");
});

document.getElementById("merchViewReports")
.addEventListener("click", (e)=>{
  e.preventDefault();
  requireOutletAndGo("reports.html");
});

document.getElementById("merchViewExpiries")
.addEventListener("click", (e)=>{
  e.preventDefault();
  requireOutletAndGo("expiry.html");
});

