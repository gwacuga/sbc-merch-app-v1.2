import { db } from "./firebase.js";
import { ref, onValue, push, update, remove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// DOM
const outletSelect = document.getElementById("occurrenceOutlet");
const productSelect = document.getElementById("occurrenceProduct");
const productName = document.getElementById("productName");
const productSKU = document.getElementById("productSKU");
const occurrenceForm = document.getElementById("occurrenceForm");
const occurrenceTableBody = document.querySelector("#occurrenceTable tbody");

const filterOutlet = document.getElementById("filterOutlet");
const filterStatus = document.getElementById("filterStatus");
const editIdInput = document.getElementById("editOccurrenceId");

const confirmModal = document.getElementById("confirmModal");
const modalText = document.getElementById("modalText");
const modalCancel = document.getElementById("modalCancel");
const modalConfirm = document.getElementById("modalConfirm");

// Cache
let outletsCache = {};
let productsCache = {};
let occurrencesCache = {};
let currentEditId = null;

// ================= LOAD OUTLETS =================
function listenToOutlets() {
  onValue(ref(db, "outlets"), snapshot => {
    outletSelect.innerHTML = `<option value="" disabled selected>Select Outlet</option>`;
    filterOutlet.innerHTML = `<option value="all">All Outlets</option>`;
    outletsCache = {};

    snapshot.forEach(snap => {
      const outlet = snap.val();
      outletsCache[snap.key] = outlet;

      const opt = document.createElement("option");
      opt.value = snap.key;
      opt.textContent = outlet.name;
      outletSelect.appendChild(opt);

      const filterOpt = document.createElement("option");
      filterOpt.value = snap.key;
      filterOpt.textContent = outlet.name;
      filterOutlet.appendChild(filterOpt);
    });

    renderOccurrences();
  });
}

// ================= LOAD PRODUCTS =================
function listenToProducts() {
  onValue(ref(db, "products"), snapshot => {
    productSelect.innerHTML = `<option value="">None</option>`;
    productsCache = {};

    snapshot.forEach(snap => {
      const product = snap.val();
      productsCache[snap.key] = product;

      const opt = document.createElement("option");
      opt.value = snap.key;
      opt.textContent = product.sku ? `[${product.sku}] ${product.name}` : product.name;

      productSelect.appendChild(opt);
    });

    renderOccurrences();
  });

  // Update name & SKU when selection changes
  productSelect.onchange = () => {
    const selectedKey = productSelect.value;
    if (selectedKey && productsCache[selectedKey]) {
      productName.value = productsCache[selectedKey].name || "";
      productSKU.value = productsCache[selectedKey].sku || "";
    } else {
      productName.value = "";
      productSKU.value = "";
    }
  };
}

// ================= LOAD OCCURRENCES =================
function listenToOccurrences() {
  onValue(ref(db, "occurrences"), snapshot => {
    occurrencesCache = {};
    snapshot.forEach(snap => {
      const occ = snap.val();
      occ.id = snap.key;
      occurrencesCache[snap.key] = occ;
    });
    renderOccurrences();
  });
}

// ================= RENDER TABLE =================
function renderOccurrences() {
  occurrenceTableBody.innerHTML = "";
  Object.values(occurrencesCache).forEach(occ => {
    if (filterOutlet.value !== "all" && occ.outlet !== filterOutlet.value) return;
    if (filterStatus.value !== "all" && occ.status !== filterStatus.value) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${outletsCache[occ.outlet]?.name || ""}</td>
      <td>${productsCache[occ.product]?.name || ""}</td>
      <td>${occ.type}</td>
      <td>${occ.severity}</td>
      <td>${occ.date}</td>
      <td>${occ.description}</td>
      <td>${occ.actionTaken}</td>
      <td>${occ.status}</td>
      <td>
        <button class="action-btn edit-btn" data-id="${occ.id}">Edit</button>
        <button class="action-btn delete-btn" data-id="${occ.id}">Delete</button>
      </td>
    `;
    occurrenceTableBody.appendChild(tr);
  });

  attachActionListeners();
}

// ================= ACTION BUTTONS =================
function attachActionListeners() {
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const occ = occurrencesCache[id];
      if (!occ) return;

      outletSelect.value = occ.outlet;
      productSelect.value = occ.product || "";
      productName.value = productsCache[occ.product]?.name || "";
      productSKU.value = productsCache[occ.product]?.sku || "";
      document.getElementById("occurrenceTypeInput").value = occ.type;
      document.getElementById("occurrenceSeverity").value = occ.severity;
      document.getElementById("occurrenceDate").value = occ.date;
      document.getElementById("occurrenceDescription").value = occ.description;
      document.getElementById("occurrenceAction").value = occ.actionTaken;
      document.getElementById("occurrenceStatus").value = occ.status;

      editIdInput.value = id;
    };
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = () => {
      currentEditId = btn.dataset.id;
      modalText.textContent = "Are you sure you want to delete this occurrence?";
      confirmModal.classList.add("show");
    };
  });
}

// ================= SAVE / UPDATE =================
function handleOccurrenceSubmit(e) {
  e.preventDefault();
  const data = {
    outlet: outletSelect.value,
    product: productSelect.value || "",
    type: document.getElementById("occurrenceTypeInput").value,
    severity: document.getElementById("occurrenceSeverity").value,
    date: document.getElementById("occurrenceDate").value,
    description: document.getElementById("occurrenceDescription").value,
    actionTaken: document.getElementById("occurrenceAction").value,
    status: document.getElementById("occurrenceStatus").value
  };

  if (editIdInput.value) {
    update(ref(db, `occurrences/${editIdInput.value}`), data);
    alert("Occurrence updated ✅");
  } else {
    push(ref(db, "occurrences"), data);
    alert("Occurrence saved ✅");
  }

  occurrenceForm.reset();
  editIdInput.value = "";
  productName.value = "";
  productSKU.value = "";
}

// ================= DELETE CONFIRM =================
function confirmDelete() {
  if (currentEditId) {
    remove(ref(db, `occurrences/${currentEditId}`));
    alert("Occurrence deleted ✅");
  }
  confirmModal.classList.remove("show");
  currentEditId = null;
}

// ================= FILTER HANDLERS =================
function setupFilters() {
  filterOutlet.onchange = renderOccurrences;
  filterStatus.onchange = renderOccurrences;
}

// ================= INIT =================
function initOccurrencePage() {
  occurrenceForm.onsubmit = handleOccurrenceSubmit;
  modalCancel.onclick = () => {
    confirmModal.classList.remove("show");
    currentEditId = null;
  };
  modalConfirm.onclick = confirmDelete;

  setupFilters();
  listenToOutlets();
  listenToProducts();
  listenToOccurrences();
}

// ================= START =================
initOccurrencePage();
