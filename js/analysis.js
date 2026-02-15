import { db } from "./firebase.js";
import { ref, get, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const analysisOutlet = document.getElementById("analysisOutlet");
const analysisProduct = document.getElementById("analysisProduct");
const analysisStartDate = document.getElementById("analysisStartDate");
const analysisEndDate = document.getElementById("analysisEndDate");
const analysisList = document.getElementById("analysisList");
const exportCsvBtn = document.getElementById("exportCsv");
const nearExpiryList = document.getElementById("nearExpiryList");
const stockSummaryList = document.getElementById("stockSummaryList");

const categoryCtx = document.getElementById("categoryChart").getContext("2d");
const outletCtx = document.getElementById("outletChart").getContext("2d");

let outletsCache = {};
let productsCache = {};

/* ---------- HELPERS ---------- */
function monthsToExpiry(dateStr){
  const today = new Date();
  const exp = new Date(dateStr);
  return (exp.getFullYear()-today.getFullYear())*12 + (exp.getMonth()-today.getMonth());
}
function expiryClass(dateStr){
  const m = monthsToExpiry(dateStr);
  if(m<=1) return "exp-red flash";
  if(m<=2) return "exp-green";
  return "exp-normal";
}

/* ---------- LOAD OUTLETS ---------- */
onValue(ref(db,"outlets"), snap=>{
  analysisOutlet.innerHTML=`<option value="all" selected>All Outlets</option>`;
  snap.forEach(s=>{
    outletsCache[s.key]=s.val();
    const opt=document.createElement("option");
    opt.value=s.key; opt.textContent=s.val().name;
    analysisOutlet.appendChild(opt);
  });
});

/* ---------- LOAD PRODUCTS ---------- */
onValue(ref(db,"products"), snap=>{
  analysisProduct.innerHTML=`<option value="all" selected>All Products</option>`;
  productsCache={};
  snap.forEach(s=>{
    productsCache[s.key]=s.val();
    const opt=document.createElement("option");
    opt.value=s.key;
    opt.textContent=`${s.val().name} (SKU: ${s.val().sku})`;
    analysisProduct.appendChild(opt);
  });
});

/* ---------- GENERATE ANALYSIS ---------- */
async function generateAnalysis(){
  analysisList.innerHTML="";
  nearExpiryList.innerHTML="";
  stockSummaryList.innerHTML="";

  const snap = await get(ref(db,"expiries"));
  if(!snap.exists()) return;

  const entries = Object.entries(snap.val());
  const grouped={};
  const categoryStock={}, outletStock={};

  for(const [id,e] of entries){
    if(e.quantity<=0) continue; // ignore expired/out of stock
    if(analysisOutlet.value!=="all" && e.outletId!==analysisOutlet.value) continue;
    if(analysisProduct.value!=="all" && e.productId!==analysisProduct.value) continue;
    if(analysisStartDate.value && e.expiryDate<analysisStartDate.value) continue;
    if(analysisEndDate.value && e.expiryDate>analysisEndDate.value) continue;

    const key = `${e.outletId}_${e.productId}_${e.batchNo}`;
    if(!grouped[key]) grouped[key]=[];
    grouped[key].push(e);

    const cat=productsCache[e.productId]?.category||"Unknown";
    categoryStock[cat]= (categoryStock[cat]||0)+e.quantity;
    outletStock[e.outletId]= (outletStock[e.outletId]||0)+e.quantity;
  }

  // Table
  for(const key in grouped){
    const group = grouped[key];
    const first = group[0];
    const outletName = outletsCache[first.outletId]?.name || "Unknown";
    const productName = productsCache[first.productId]?.name || "Unknown";

    // expiry text
    const expiryText = group.map(e=>`<span class="${expiryClass(e.expiryDate)}">${e.expiryDate} (Qty:${e.quantity})</span>`).join("<br>");

    const tr = document.createElement("tr");
    tr.innerHTML=`
      <td data-label="Outlet">${outletName}</td>
      <td data-label="Product">${productName}</td>
      <td data-label="SKU">${first.sku}</td>
      <td data-label="Batch">${first.batchNo}</td>
      <td data-label="Quantity">${group.reduce((a,b)=>a+b.quantity,0)}</td>
      <td data-label="Expiry Dates">${expiryText}</td>
    `;
    analysisList.appendChild(tr);

    // Near expiry cards
    group.forEach(e=>{
      if(monthsToExpiry(e.expiryDate)<=2){
        const li=document.createElement("li");
        li.innerHTML=`${outletName} - ${productName} - ${e.batchNo} - ${e.expiryDate} (Qty:${e.quantity})`;
        li.className=expiryClass(e.expiryDate);
        nearExpiryList.appendChild(li);
      }
    });
  }

  // Stock summary
  for(const cat in categoryStock){
    const li=document.createElement("li");
    li.textContent=`${cat}: ${categoryStock[cat]} units`;
    stockSummaryList.appendChild(li);
  }

  // Charts
  if(window.categoryChart) window.categoryChart.destroy();
  if(window.outletChart) window.outletChart.destroy();

  window.categoryChart=new Chart(categoryCtx,{
    type:'pie',
    data:{
      labels:Object.keys(categoryStock),
      datasets:[{data:Object.values(categoryStock),backgroundColor:['#00ffff','#a0ff00','#ff0044','#ffaa00']}]
    }
  });

  window.outletChart=new Chart(outletCtx,{
    type:'bar',
    data:{
      labels:Object.keys(outletStock).map(k=>outletsCache[k]?.name||"Unknown"),
      datasets:[{label:'Stock Qty',data:Object.values(outletStock),backgroundColor:'#00f0ff'}]
    },
    options:{scales:{y:{beginAtZero:true}}}
  });
}

/* ---------- EXPORT CSV ---------- */
exportCsvBtn.addEventListener("click", ()=>{
  const rows = analysisList.querySelectorAll("tr");
  if(!rows.length){
 showToast("No data to export", "warning");

  return;
}


  let csv="OUTLET,PRODUCT,SKU,BATCHNO,TOTAL QTY,EXPIRY DATES\n";
  rows.forEach(tr=>{
    const tds = tr.querySelectorAll("td");
    const expDates = tds[5].innerText.replace(/\n/g," | ");
    csv+=`"${tds[0].innerText}","${tds[1].innerText}","${tds[2].innerText}","${tds[3].innerText}","${tds[4].innerText}","${expDates}"\n`;
  });

  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const link=document.createElement("a");
  link.href=URL.createObjectURL(blob);
  link.download="Merchandising_Analysis.csv";
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
});

function showToast(message, type = "default"){
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.className = "toast";

  if(type === "error") toast.classList.add("error");
  if(type === "warning") toast.classList.add("warning");
  if(type === "success") toast.classList.add("success");

  toast.classList.add("show");

  setTimeout(()=>{
    toast.classList.remove("show");
  }, 2500);
}


/* ---------- FILTER CHANGE ---------- */
analysisOutlet.addEventListener("change", generateAnalysis);
analysisProduct.addEventListener("change", generateAnalysis);
analysisStartDate.addEventListener("change", generateAnalysis);
analysisEndDate.addEventListener("change", generateAnalysis);

/* ---------- INITIAL LOAD ---------- */
generateAnalysis();
