import { db } from "./firebase.js";
import { ref, push, onValue, remove, update, get } 
from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

/* ---------- DOM ELEMENTS ---------- */
const outletForm = document.getElementById("outletForm");
const outletName = document.getElementById("outletName");
const outletLocation = document.getElementById("outletLocation");
const outletNotes = document.getElementById("outletNotes");
const outletList = document.getElementById("outletList");
const productCheckboxList = document.getElementById("productCheckboxList");

/* ---------- STATE ---------- */
let editId = null;
let productsCache = {};

/* ---------- LOAD PRODUCTS ---------- */
onValue(ref(db, "products"), snapshot => {
  productsCache = snapshot.exists() ? snapshot.val() : {};
  renderProductCheckboxes();
});

/* ---------- RENDER PRODUCT CHECKBOXES ---------- */
function renderProductCheckboxes(selectedProducts = {}) {
  productCheckboxList.innerHTML = "";

  if (!Object.keys(productsCache).length) {
    productCheckboxList.innerHTML = "<p>No products found</p>";
    return;
  }

  Object.entries(productsCache).forEach(([id, p]) => {
    const label = document.createElement("label");

    label.innerHTML = `
      <input type="checkbox" value="${id}" ${selectedProducts[id] ? "checked" : ""}>
      ${p.name} (SKU: ${p.sku})
    `;

    productCheckboxList.appendChild(label);
  });
}

/* ---------- GET SELECTED PRODUCTS ---------- */
function getSelectedProducts() {
  const selected = {};
  productCheckboxList.querySelectorAll("input:checked")
    .forEach(cb => selected[cb.value] = true);
  return selected;
}

/* ---------- SAVE / UPDATE OUTLET ---------- */
outletForm.addEventListener("submit", e => {
  e.preventDefault();

  const data = {
    name: outletName.value.trim(),
    location: outletLocation.value.trim(),
    notes: outletNotes.value.trim(),
    products: getSelectedProducts()
  };

  if (!data.name) {
    alert("Outlet name is required");
    return;
  }

  if (editId) {
    update(ref(db, `outlets/${editId}`), data).then(resetForm);
  } else {
    push(ref(db, "outlets"), data).then(resetForm);
  }
});

/* ---------- RESET FORM ---------- */
function resetForm() {
  outletForm.reset();
  editId = null;
  renderProductCheckboxes();
}

/* ---------- LIST OUTLETS ---------- */
onValue(ref(db, "outlets"), snapshot => {
  outletList.innerHTML = "";

  if (!snapshot.exists()) {
    outletList.innerHTML = "<p>No outlets added</p>";
    return;
  }

  Object.entries(snapshot.val()).forEach(([id, outlet]) => {
    const div = document.createElement("div");
    div.className = "card";

    const productCount = outlet.products 
      ? Object.keys(outlet.products).length 
      : 0;

    div.innerHTML = `
      <strong>${outlet.name}</strong><br>
      <small>${outlet.location || ""}</small><br>
      <small>Products Listed: ${productCount}</small><br><br>
      <button class="editBtn">Edit</button>
      <button class="deleteBtn">Delete</button>
    `;

    /* EDIT */
    div.querySelector(".editBtn").onclick = () => {
      outletName.value = outlet.name;
      outletLocation.value = outlet.location || "";
      outletNotes.value = outlet.notes || "";
      editId = id;
      renderProductCheckboxes(outlet.products || {});
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    /* DELETE */
    div.querySelector(".deleteBtn").onclick = () => {
      if (confirm("Delete this outlet?")) {
        remove(ref(db, `outlets/${id}`));
      }
    };

    outletList.appendChild(div);
  });
});
