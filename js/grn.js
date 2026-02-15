import { db } from "./firebase.js";
import { ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const form = document.getElementById("grnForm");
const outletId = document.getElementById("outletId");
const reason = document.getElementById("reason");
const date = document.getElementById("date");
const docUrl = document.getElementById("docUrl");
const notes = document.getElementById("notes");

const grnList = document.getElementById("grnList");

let editId = null; // Track if we are editing

// Save or update GRN
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = {
    outletId: outletId.value.trim(),
    reason: reason.value.trim(),
    date: date.value,
    docUrl: docUrl.value.trim(),
    notes: notes.value.trim(),
    createdAt: Date.now()
  };

  if (editId) {
    // Update existing
    update(ref(db, `grns/${editId}`), data)
      .then(() => {
        form.reset();
        editId = null;
      })
      .catch(err => alert(err.message));
  } else {
    // Create new
    push(ref(db, "grns"), data)
      .then(() => form.reset())
      .catch(err => alert(err.message));
  }
});

// Load & display GRNs
onValue(ref(db, "grns"), (snapshot) => {
  grnList.innerHTML = "";

  if (!snapshot.exists()) {
    grnList.innerHTML = `<p class="empty">No GRN records yet</p>`;
    return;
  }

  const grns = Object.entries(snapshot.val())
    .map(([id, g]) => ({ id, ...g }))
    .sort((a, b) => b.createdAt - a.createdAt);

  grns.forEach(grn => {
    const div = document.createElement("div");
    div.className = "grn-card";

    div.innerHTML = `
      <strong>Outlet:</strong> ${grn.outletId}<br>
      <strong>Date:</strong> ${grn.date}<br>
      <strong>Reason:</strong> ${grn.reason}<br>
      ${grn.notes ? `<strong>Notes:</strong> ${grn.notes}<br>` : ""}
      <a href="${grn.docUrl}" target="_blank">
        <img src="${grn.docUrl}" alt="GRN Document" style="max-width:140px;margin-top:6px;border:1px solid #00ffff;cursor:pointer;">
      </a>
      <br>
      <button class="editBtn" style="margin-top:5px;">Edit</button>
      <button class="deleteBtn" style="margin-top:5px;background:red;color:white;">Delete</button>
    `;

    // Delete GRN with modal confirmation
div.querySelector(".deleteBtn").addEventListener("click", () => {
  showConfirm("Are you sure you want to delete this GRN?").then(ok => {
    if(ok) {
      remove(ref(db, `grns/${grn.id}`));
    }
  });
});


    // Edit GRN
    div.querySelector(".editBtn").addEventListener("click", () => {
      outletId.value = grn.outletId;
      reason.value = grn.reason;
      date.value = grn.date;
      docUrl.value = grn.docUrl;
      notes.value = grn.notes;
      editId = grn.id;
    });

    grnList.appendChild(div);
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
