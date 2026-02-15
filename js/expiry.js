import { db } from "./firebase.js";
import { ref, push, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const expiryForm = document.getElementById("expiryForm");
const expiryOutlet = document.getElementById("expiryOutlet");
const expiryProduct = document.getElementById("expiryProduct");
const expirySKU = document.getElementById("expirySKU");
const expiryBatch = document.getElementById("expiryBatch");
const expiryDate = document.getElementById("expiryDate");
const expiryQuantity = document.getElementById("expiryQuantity");
const expiryNotes = document.getElementById("expiryNotes");

const expiryList = document.getElementById("expiryList");
let editId = null;

// Load outlets
onValue(ref(db, "outlets"), snapshot => {
  expiryOutlet.innerHTML = `<option value="" disabled selected>Select Outlet</option>`;
  snapshot.forEach(snap => {
    const outlet = snap.val();
    const option = document.createElement("option");
    option.value = snap.key;
    option.textContent = outlet.name;
    expiryOutlet.appendChild(option);
  });
});

// Load products
let productsCache = {};
onValue(ref(db, "products"), snapshot => {
  expiryProduct.innerHTML = `<option value="" disabled selected>Select Product</option>`;
  productsCache = {};
  snapshot.forEach(snap => {
    const product = snap.val();
    productsCache[snap.key] = product;
    const option = document.createElement("option");
    option.value = snap.key;
    option.textContent = `${product.name} (SKU: ${product.sku})`;
    expiryProduct.appendChild(option);
  });
});

// When product changes, fill SKU and batch number select
expiryProduct.addEventListener("change", () => {
  const productId = expiryProduct.value;
  if (!productId) return;

  const product = productsCache[productId];
  expirySKU.value = product.sku || "";

  // Batch number dropdown (supports multiple batch numbers later)
  expiryBatch.innerHTML = `<option value="" disabled selected>Select Batch No</option>`;
  if (product.batchNo) {
    const option = document.createElement("option");
    option.value = product.batchNo;
    option.textContent = product.batchNo;
    expiryBatch.appendChild(option);
  }
});

// Save or update expiry
expiryForm.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!expiryOutlet.value || !expiryProduct.value || !expiryBatch.value || !expiryDate.value || !expiryQuantity.value) {
    alert("Please fill all required fields.");
    return;
  }

  const data = {
    outletId: expiryOutlet.value,
    productId: expiryProduct.value,
    sku: expirySKU.value,
    batchNo: expiryBatch.value,
    expiryDate: expiryDate.value,
    quantity: Number(expiryQuantity.value),
    notes: expiryNotes.value.trim()
  };

  if (editId) {
    update(ref(db, `expiries/${editId}`), data)
      .then(() => { expiryForm.reset(); editId = null; });
  } else {
    push(ref(db, "expiries"), data)
      .then(() => expiryForm.reset());
  }
});

// Display expiry list grouped by Outlet + Product + Batch
onValue(ref(db, "expiries"), async snapshot => {
  expiryList.innerHTML = "";
  if (!snapshot.exists()) {
    expiryList.innerHTML = `<tr><td colspan="8">No expiry records yet</td></tr>`;
    return;
  }

  const entries = Object.entries(snapshot.val());

  // Group by outletId + productId + batchNo
  const grouped = {};
  for (const [id, e] of entries) {
    const key = `${e.outletId}_${e.productId}_${e.batchNo}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ id, ...e });
  }

  for (const groupKey in grouped) {
    const group = grouped[groupKey];
    const first = group[0];

    // Get product and outlet names
    const product = productsCache[first.productId];
    const productName = product ? product.name : "Unknown";
    const outletSnap = await get(ref(db, `outlets/${first.outletId}`));
    const outletName = outletSnap.exists() ? outletSnap.val().name : "Unknown";

    const tr = document.createElement("tr");

    // Prepare all expiry date + quantity list as buttons for edit/delete
    const expiryButtons = group.map(e => `
      <div class="expiry-item">
        ${e.expiryDate} (Qty: ${e.quantity})
        <button class="editExpiryBtn" data-id="${e.id}">Edit</button>
        <button class="deleteExpiryBtn" data-id="${e.id}">Delete</button>
      </div>
    `).join("");

    tr.innerHTML = `
      <td data-label="Outlet">${outletName}</td>
      <td data-label="Product">${productName} (SKU: ${first.sku})</td>
      <td data-label="SKU">${first.sku}</td>
      <td data-label="Batch No">${first.batchNo}</td>
      <td data-label="Expiry & Qty">${expiryButtons}</td>
      <td data-label="Notes">${first.notes || ""}</td>
      <td data-label="Actions">Multiple</td>
    `;

    // Handle editing a specific expiry
    tr.querySelectorAll(".editExpiryBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const eId = btn.dataset.id;
        const e = group.find(x => x.id === eId);
        expiryOutlet.value = e.outletId;
        expiryProduct.value = e.productId;
        expirySKU.value = e.sku;
        expiryBatch.value = e.batchNo;
        expiryDate.value = e.expiryDate;
        expiryQuantity.value = e.quantity;
        expiryNotes.value = e.notes;
        editId = e.id;
      });
    });

    // Handle deleting a specific expiry
    tr.querySelectorAll(".deleteExpiryBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const eId = btn.dataset.id;
        showConfirm("Delete all expiry records for this product/batch?").then(ok => {
  if(ok) group.forEach(e => remove(ref(db, `expiries/${e.id}`)));
});

      });
    });

    expiryList.appendChild(tr);
  }
});

function showConfirm(message) {
  return new Promise(resolve => {
    const modal = document.getElementById("confirmModal");
    const msg = document.getElementById("confirmMessage");
    const yesBtn = document.getElementById("confirmYes");
    const noBtn = document.getElementById("confirmNo");

    msg.textContent = message;
    modal.style.display = "flex";

    yesBtn.onclick = () => { modal.style.display = "none"; resolve(true); };
    noBtn.onclick = () => { modal.style.display = "none"; resolve(false); };
  });
}
