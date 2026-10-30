const STAGES = ["รับสินค้า", "ขึ้นตู้", "ขนส่งทางเรือ", "ถึงท่าปลายทาง", "ส่งมอบแล้ว"];
const db = supabase.createClient(APP.url, APP.key);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const br = s => esc(s).replace(/\n/g, "<br>");
const when = a => new Date(a).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
const num = n => (n == null || n === "") ? "-" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const linkOf = c => APP.base + "?t=" + c;

// รับลิงก์เต็มหรือรหัสล้วน แล้วคืนรหัส 12 ตัว
function codeFrom(raw) {
  raw = String(raw || "").trim();
  try { const t = new URL(raw).searchParams.get("t"); if (t) return t.toLowerCase(); } catch (e) {}
  return raw.toLowerCase();
}

function qr(text) {
  const q = qrcode(0, "M");
  q.addData(text); q.make();
  return q.createSvgTag(3, 0);
}

const FONTS = "https://fonts.googleapis.com/css2?family=Prompt:wght@500;600;700&family=Sarabun:wght@400;600&display=swap";
const LABEL_CSS = `
.lb{width:100%;min-width:600px;border-collapse:collapse;table-layout:fixed;background:#fff;color:#2B3438;border:1px solid #2F3A3E;font:400 13px/1.4 Prompt,Sarabun,"Noto Sans Thai",Tahoma,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.lb td{border:1px solid #2F3A3E;padding:9px 14px;vertical-align:top;overflow-wrap:anywhere}
.lb .hdr{background:#2F3A3E;box-shadow:inset 0 0 0 1000px #2F3A3E;color:#fff;padding:14px 20px}
.lb .hdr div{display:flex;justify-content:space-between;align-items:center}
.lb .hdr b{font-size:26px;font-weight:700;letter-spacing:3px}
.lb .hdr span{text-align:right;font-size:10px;font-weight:600;letter-spacing:1px}
.lb .hdr i{display:block;font-style:normal;font-size:24px;font-weight:600;letter-spacing:0}
.lb .k{font-size:9.5px;font-weight:700;letter-spacing:1px;color:#2F3A3E;margin-bottom:3px}
.lb .v{font-size:15px;font-weight:600}
.lb .n{font-size:13px}
.lb .big{font-size:19px;font-weight:700}
.lb .sm{font-size:11.5px;margin-top:4px}
.lb .t1 td{height:88px}
.lb .qrc{text-align:center;vertical-align:middle;padding:6px}
.lb .qrc svg{width:84px;height:84px;display:block;margin:0 auto}
.lb .pc{font-size:9px;font-weight:600;letter-spacing:.5px;margin-top:2px}`;
(function () { const s = document.createElement("style"); s.textContent = LABEL_CSS; document.head.appendChild(s); })();

const K = t => `<div class="k">${t}</div>`;
function label(d) {
  const e = x => esc(x) || "—";
  return `<table class="lb"><colgroup>${"<col>".repeat(24)}</colgroup>
<tr><td colspan="24" class="hdr"><div><b>FREEDMILL</b><span>PACKAGE NO.<i>${e(d.pkg_no)}</i></span></div></td></tr>
<tr class="t1"><td colspan="12">${K("FROM / SHIPPER")}<div class="n">${br(d.shipper)}</div></td><td colspan="12">${K("TO / CONSIGNEE")}<div class="n">${d.consignee ? br(d.consignee) : "CUSTOMER / DESTINATION"}</div></td></tr>
<tr><td colspan="9">${K("INVOICE NO.")}<div class="v">${e(d.invoice_no)}</div></td><td colspan="7">${K("LIST NO. IN INVOICE")}<div class="v">${e(d.list_no)}</div></td><td colspan="8">${K("POD")}<div class="v">${e(d.pod)}</div></td></tr>
<tr><td colspan="24">${K("DESCRIPTION OF GOODS")}<div class="big">${e(d.description)}</div><div class="sm">PRODUCT CODE: <b>${e(d.product_code)}</b> &nbsp;|&nbsp; BRAND: <b>${e(d.brand)}</b> &nbsp;|&nbsp; COLOR / MODEL: <b>${e(d.color)}</b></div></td></tr>
<tr><td colspan="5">${K("QTY / UNIT")}<div class="v">${e(d.qty)}</div></td><td colspan="5">${K("LINE PKG")}<div class="v">${e(d.line_pkg)}</div></td><td colspan="5">${K("N.W. (KG)")}<div class="v">${num(d.nw)}</div></td><td colspan="5">${K("G.W. (KG)")}<div class="v">${num(d.gw)}</div></td><td colspan="4" rowspan="2" class="qrc">${qr(linkOf(d.public_code))}<div class="pc">${esc(d.public_code)}</div></td></tr>
<tr><td colspan="12">${K("CONTAINER NO.")}<div class="v">${e(d.container_no)}</div><div class="sm">MADE IN THAILAND</div></td><td colspan="8">${K("SEAL NO.")}<div class="v">${e(d.seal_no)}</div><div class="sm">HANDLE WITH CARE · KEEP DRY</div></td></tr>
</table>`;
}

// พิมพ์เฉพาะใบปะหน้า ผ่านหน้าต่างซ่อน (paper = "a5" หรือ "label" 10x15 ซม.)
function printLabel(d, paper) {
  if (!d) return;
  const P = paper === "label" ? { size: "150mm 100mm", m: "4mm", z: 0.76 } : { size: "210mm 148mm", m: "8mm", z: 1.1 };
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const doc = f.contentDocument, w = f.contentWindow;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(d.invoice_no)}</title><link href="${FONTS}" rel="stylesheet"><style>@page{size:${P.size};margin:${P.m}}html,body{margin:0;background:#fff}${LABEL_CSS}.lb{width:700px;min-width:0;zoom:${P.z}}</style></head><body>${label(d)}</body></html>`);
  doc.close();
  setTimeout(() => { w.focus(); w.print(); setTimeout(() => f.remove(), 2000); }, 1000);
}
const printCur = paper => printLabel(window.CUR, paper);

const evHtml = ev => (ev || []).map(e => `<div class="ev"><span class="dot"></span><div><b>${esc(e.title)}</b><small>${when(e.at)}${e.place ? " · " + esc(e.place) : ""}</small></div></div>`).join("") || `<p class="msg">ยังไม่มีประวัติ</p>`;

// หน้าแสดงผลสำหรับลูกค้า
function view(d) {
  window.CUR = d;
  const step = d.step || 0;
  return `<section class="card">
 <div class="top"><div><div class="no">Invoice No. ${esc(d.invoice_no)}</div><div class="status">${esc(d.status)}</div></div>
 <div class="eta"><span>${step >= 4 ? "สถานะ" : "คาดว่าจะถึงท่าปลายทาง"}</span><b>${esc(d.eta) || "-"}</b></div></div>
 <div class="track" style="--p:0%" data-p="${step / (STAGES.length - 1) * 100}"><div class="bar"></div>
 ${STAGES.map((s, i) => `<div class="st ${i <= step ? "on" : ""} ${i === step && step < 4 ? "now" : ""}">${s}</div>`).join("")}
 <div class="truck"><svg viewBox="0 0 24 24" fill="none" stroke="#12262B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h11v10H2zM13 9h4l4 4v3h-8"/></svg></div></div></section>
 <section class="card"><h2>ข้อมูลสินค้า</h2>
 <p class="item">${esc(d.description)}</p><div class="sub">รหัสสินค้า ${esc(d.product_code)} · แบรนด์ ${esc(d.brand)} · สี/รุ่น ${esc(d.color)}</div>
 <div class="grid"><p><small>ปริมาณ</small>${esc(d.qty)}</p><p><small>น้ำหนักสุทธิ (N.W.)</small>${num(d.nw)} กก.</p>
 <p><small>น้ำหนักรวม (G.W.)</small>${num(d.gw)} กก.</p><p><small>หมายเลขตู้ / ซีล</small>${esc(d.container_no) || "-"} / ${esc(d.seal_no) || "-"}</p>
 <p><small>ผู้ส่ง</small>${br(d.shipper)}</p><p><small>ผู้รับ / ปลายทาง</small>${br(d.consignee)}<br>${esc(d.pod)}</p></div></section>
 <section class="card"><div class="hd"><h2>ใบปะหน้า</h2><span><button type="button" class="ghost" onclick="printCur('a5')">พิมพ์ A5</button> <button type="button" class="ghost" onclick="printCur('label')">พิมพ์ 10×15 ซม.</button></span></div><div class="lw">${label(d)}</div></section>
 <section class="card"><h2>ประวัติการขนส่ง</h2>${evHtml(d.events)}</section>`;
}

function animate(root) {
  const t = root.querySelector(".track");
  if (t) requestAnimationFrame(() => requestAnimationFrame(() => t.style.setProperty("--p", t.dataset.p + "%")));
}
