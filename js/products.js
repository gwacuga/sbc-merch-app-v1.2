import { db } from "./firebase.js";
import { ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const form = document.getElementById("productForm");
const productName = document.getElementById("productName");
const productSKU = document.getElementById("productSKU");
const productCategory = document.getElementById("productCategory");
const productBatch = document.getElementById("productBatch");
const productNotes = document.getElementById("productNotes");

const productList = document.getElementById("productList");

let editId = null;

// Save or update product
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!productName.value.trim() || !productSKU.value.trim() || !productCategory.value || !productBatch.value.trim()) {
    alert("Please fill all required fields before saving.");
    return;
  }

  const data = {
    name: productName.value.trim(),
    sku: productSKU.value.trim(),
    category: productCategory.value,
    batchNo: productBatch.value.trim(),
    notes: productNotes.value.trim()
  };

  const productsRef = ref(db, "products");

  // Check for FULL duplicate product
  let duplicate = false;

  await onValue(productsRef, (snapshot) => {
    snapshot.forEach((snap) => {
      const p = snap.val();

      const sameProduct =
        (p.name || "").toLowerCase() === data.name.toLowerCase() &&
        (p.sku || "").toLowerCase() === data.sku.toLowerCase() &&
        (p.category || "") === data.category &&
        (p.batchNo || "").toLowerCase() === data.batchNo.toLowerCase() &&
        (p.notes || "").toLowerCase() === (data.notes || "").toLowerCase();

      if (sameProduct && snap.key !== editId) {
        duplicate = true;
      }
    });
  }, { onlyOnce: true });

  if (duplicate) {
    alert("This exact product already exists!");
    return;
  }

  if (editId) {
    update(ref(db, `products/${editId}`), data)
      .then(() => {
        form.reset();
        editId = null;
      })
      .catch(err => alert(err.message));
  } else {
    push(productsRef, data)
      .then(() => form.reset())
      .catch(err => alert(err.message));
  }
});



// Load & display products
onValue(ref(db, "products"), (snapshot) => {
  productList.innerHTML = "";

  if (!snapshot.exists()) {
    productList.innerHTML = `<tr><td colspan="6">No products yet</td></tr>`;
    return;
  }

  const products = Object.entries(snapshot.val())
    .map(([id, p]) => ({ id, ...p }));

  products.forEach(product => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${product.name}</td>
      <td>${product.sku}</td>
      <td>${product.category}</td>
      <td>${product.batchNo}</td>
      <td>${product.notes}</td>
      <td>
        <button class="editBtn">Edit</button>
        <button class="deleteBtn">Delete</button>
      </td>
    `;

    tr.querySelector(".deleteBtn").addEventListener("click", () => {
  showConfirm("Are you sure you want to delete this product?").then(ok => {
    if (ok) {
      remove(ref(db, `products/${product.id}`));
    }
  });
});


    tr.querySelector(".editBtn").addEventListener("click", () => {
      productName.value = product.name;
      productSKU.value = product.sku;
      productCategory.value = product.category;
      productBatch.value = product.batchNo;
      productNotes.value = product.notes;
      editId = product.id;
    });

    productList.appendChild(tr);
  });
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
