// ===== REFS =====
const namaEl    = document.getElementById("nama");
const nisEl     = document.getElementById("nis");
const alamatEl  = document.getElementById("alamat");
const teleponEl = document.getElementById("telepon");
const umurEl    = document.getElementById("umur");
const ttlTgl    = document.getElementById("ttlTgl");
const ttlBln    = document.getElementById("ttlBln");
const ttlThn    = document.getElementById("ttlThn");
const list      = document.getElementById("list");
const modal     = document.getElementById("modal");
const btnTambah = document.getElementById("btnTambah");
const btnUpdate = document.getElementById("btnUpdate");

let data              = [];
let editIndex         = -1;
let selectedGender    = "";
let pendingHapusIndex = -1;
let undoBuffer        = null;
let snackTimer        = null;

// ===== HELPER ERROR MSG =====
function showErr(id, msg) {
  const el = document.getElementById("err-" + id);
  if (!el) return;
  if (msg) {
    el.textContent = ""; // reset icon (::before handles it)
    el.innerHTML = msg;
    el.classList.add("show");
  } else {
    el.classList.remove("show");
  }
}

function setInputState(el, isError) {
  // Untuk telepon, ubah border di wrapper .tel-wrap
  if (el === teleponEl) {
    const wrap = document.querySelector(".tel-wrap");
    if (wrap) {
      wrap.classList.remove("wrap-err", "wrap-ok");
      if (isError === true)  wrap.classList.add("wrap-err");
      if (isError === false) wrap.classList.add("wrap-ok");
    }
    return;
  }
  el.classList.remove("err", "ok");
  if (isError === true)  el.classList.add("err");
  if (isError === false) el.classList.add("ok");
}

// ===== VALIDASI REAL-TIME =====

// NAMA – huruf & spasi saja
namaEl.addEventListener("input", () => {
  sanitizeLetter(namaEl);
  const v = namaEl.value.trim();
  if (v === "") {
    setInputState(namaEl, null); showErr("nama", null); return;
  }
  if (/[^a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s]/u.test(v)) {
    setInputState(namaEl, true);
    showErr("nama", "Nama hanya boleh huruf dan spasi, tidak boleh mengandung angka atau simbol");
  } else {
    setInputState(namaEl, false); showErr("nama", null);
  }
});
namaEl.addEventListener("keydown", blockNonLetter);
namaEl.addEventListener("paste",   blockPasteLetter);
namaEl.addEventListener("blur", () => {
  if (namaEl.value.trim() === "") { setInputState(namaEl, true); showErr("nama", "Nama tidak boleh kosong"); }
});

// NIS – angka saja
nisEl.addEventListener("input", () => {
  sanitizeDigit(nisEl);
  const v = nisEl.value;
  const len = v.length;
  document.getElementById("nisCount").textContent = len + "/10";
  document.getElementById("nisCount").style.color = len === 10 ? "#22c55e" : "";
  if (v === "") { setInputState(nisEl, null); showErr("nis", null); return; }
  if (len < 1) {
    setInputState(nisEl, true); showErr("nis", "NIS tidak boleh kosong");
  } else {
    setInputState(nisEl, false); showErr("nis", null);
  }
});
nisEl.addEventListener("keydown", blockNonDigit);
nisEl.addEventListener("paste",   blockPasteDigit);
nisEl.addEventListener("blur", () => {
  if (nisEl.value === "") { setInputState(nisEl, true); showErr("nis", "NIS tidak boleh kosong"); }
});

// ALAMAT – huruf & spasi saja
alamatEl.addEventListener("input", () => {
  sanitizeLetter(alamatEl);
  const v = alamatEl.value.trim();
  if (v === "") { setInputState(alamatEl, null); showErr("alamat", null); return; }
  if (/[^a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s]/u.test(v)) {
    setInputState(alamatEl, true);
    showErr("alamat", "Alamat hanya boleh huruf dan spasi, tidak boleh angka atau simbol");
  } else {
    setInputState(alamatEl, false); showErr("alamat", null);
  }
});
alamatEl.addEventListener("keydown", blockNonLetter);
alamatEl.addEventListener("paste",   blockPasteLetter);
alamatEl.addEventListener("blur", () => {
  if (alamatEl.value.trim() === "") { setInputState(alamatEl, true); showErr("alamat", "Alamat tidak boleh kosong"); }
});

// TELEPON – format +62, diawali 8, min 9 digit setelah +62
function normalizeTelepon() {
  let v = teleponEl.value.replace(/\D/g, "");
  if (v.startsWith("0")) v = v.slice(1);
  if (v.startsWith("62")) v = v.slice(2);
  teleponEl.value = v;
}

function validateTelepon() {
  const v = teleponEl.value;
  const len = v.length;
  const c = document.getElementById("telCount");
  c.textContent = len + "/13";
  c.style.color = len === 0 ? "" : (!v.startsWith("8") || len < 9) ? "#ef4444" : "#22c55e";
  if (v === "") { setInputState(teleponEl, null); showErr("telepon", null); return; }
  if (!v.startsWith("8")) {
    setInputState(teleponEl, true); showErr("telepon", "Nomor harus diawali angka 8 (contoh: 812xxxxxxx)");
  } else if (len < 9) {
    setInputState(teleponEl, true); showErr("telepon", `Nomor terlalu pendek (${len} digit, minimal 9 digit setelah +62)`);
  } else {
    setInputState(teleponEl, false); showErr("telepon", null);
  }
}

teleponEl.addEventListener("input", () => {
  normalizeTelepon();
  validateTelepon();
});
teleponEl.addEventListener("keydown", blockNonDigit);
teleponEl.addEventListener("paste", (e) => {
  blockPasteDigit(e);
  setTimeout(() => { normalizeTelepon(); validateTelepon(); }, 0);
});
teleponEl.addEventListener("blur", () => {
  if (teleponEl.value === "") { setInputState(teleponEl, true); showErr("telepon", "Nomor telepon tidak boleh kosong"); }
});

// UMUR – angka, 1–150
umurEl.addEventListener("input", () => {
  sanitizeDigit(umurEl);
  const v = umurEl.value;
  const n = parseInt(v);
  if (v === "") { setInputState(umurEl, null); showErr("umur", null); return; }
  if (isNaN(n) || n < 1 || n > 150) {
    setInputState(umurEl, true); showErr("umur", "Umur harus angka antara 1 hingga 150");
  } else {
    setInputState(umurEl, false); showErr("umur", null);
  }
});
umurEl.addEventListener("keydown", blockNonDigit);
umurEl.addEventListener("paste",   blockPasteDigit);
umurEl.addEventListener("blur", () => {
  if (umurEl.value === "") { setInputState(umurEl, true); showErr("umur", "Umur tidak boleh kosong"); }
});

// TTL – validasi saat blur atau input
function validateTTL() {
  const tgl = parseInt(ttlTgl.value);
  const bln = parseInt(ttlBln.value);
  const thn = ttlThn.value;
  const allEmpty = !ttlTgl.value && !ttlBln.value && !thn;
  if (allEmpty) { showErr("ttl", null); [ttlTgl,ttlBln,ttlThn].forEach(e => setInputState(e, null)); return; }
  let msg = null;
  if (ttlTgl.value && (tgl < 1 || tgl > 31)) msg = "Tanggal harus antara 1–31";
  else if (ttlBln.value && (bln < 1 || bln > 12)) msg = "Bulan harus antara 1–12";
  else if (thn && thn.length !== 4) msg = "Tahun harus 4 digit (contoh: 2005)";
  if (msg) {
    showErr("ttl", msg);
    [ttlTgl,ttlBln,ttlThn].forEach(e => setInputState(e, true));
  } else {
    showErr("ttl", null);
    [ttlTgl,ttlBln,ttlThn].forEach(e => {
      setInputState(e, e.value ? false : null);
    });
  }
}

[ttlTgl,ttlBln,ttlThn].forEach(el => {
  el.addEventListener("keydown", blockNonDigit);
  el.addEventListener("paste",   blockPasteDigit);
  el.addEventListener("input",   () => { sanitizeDigit(el); validateTTL(); });
  el.addEventListener("blur",    validateTTL);
});
ttlTgl.addEventListener("input", () => { if(ttlTgl.value.length===2) ttlBln.focus(); });
ttlBln.addEventListener("input", () => { if(ttlBln.value.length===2) ttlThn.focus(); });

// ===== INPUT FILTER HELPERS =====
function blockNonLetter(e) {
  const ok = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Enter","Home","End"," "];
  if (ok.includes(e.key)) return;
  if ((e.ctrlKey||e.metaKey) && ["a","c","v","x"].includes(e.key.toLowerCase())) return;
  if (/\p{L}/u.test(e.key) && e.key.length===1) return;
  e.preventDefault();
}
function blockPasteLetter(e) {
  const pasted = (e.clipboardData||window.clipboardData).getData("text");
  const clean  = pasted.replace(/[^\p{L} ]/gu, "");
  if (pasted !== clean) { e.preventDefault(); document.execCommand("insertText", false, clean); }
}
function sanitizeLetter(el) {
  const pos = el.selectionStart;
  const clean = el.value.replace(/[^\p{L} ]/gu, "");
  if (el.value !== clean) { el.value = clean; el.setSelectionRange(pos, pos); }
}
function blockNonDigit(e) {
  const ok = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Enter","Home","End"];
  if (ok.includes(e.key)) return;
  if ((e.ctrlKey||e.metaKey) && ["a","c","v","x"].includes(e.key.toLowerCase())) return;
  if (/^\d$/.test(e.key)) return;
  e.preventDefault();
}
function blockPasteDigit(e) {
  const pasted = (e.clipboardData||window.clipboardData).getData("text");
  const clean  = pasted.replace(/\D/g, "");
  if (pasted !== clean) { e.preventDefault(); document.execCommand("insertText", false, clean); }
}
function sanitizeDigit(el) {
  const pos = el.selectionStart;
  const clean = el.value.replace(/\D/g, "");
  if (el.value !== clean) { el.value = clean; el.setSelectionRange(pos, pos); }
}

// ===== GENDER =====
function pilihGender(g) {
  selectedGender = g;
  document.getElementById("btnLaki").className      = "gender-btn" + (g==="Laki-laki" ? " active-laki" : "");
  document.getElementById("btnPerempuan").className = "gender-btn" + (g==="Perempuan"  ? " active-perempuan" : "");
  document.getElementById("btnLaki").classList.remove("gender-err");
  document.getElementById("btnPerempuan").classList.remove("gender-err");
  showErr("gender", null);
}

// ===== TOAST =====
let toastTimer;
function toast(msg, type="success") {
  const t = document.getElementById("toast");
  clearTimeout(toastTimer);
  t.innerText = msg;
  t.className = "t-"+type+" toast-show";
  toastTimer = setTimeout(() => t.classList.remove("toast-show"), 2600);
}

// ===== SNACKBAR =====
function snackbar(msg, withUndo=false, color="#22c55e") {
  clearTimeout(snackTimer);
  const sb    = document.getElementById("snackbar");
  const dot   = document.getElementById("sbDot");
  const msgEl = document.getElementById("sbMsg");
  const undo  = document.getElementById("sbUndo");
  dot.style.background = color;
  msgEl.textContent    = msg;
  undo.style.display   = withUndo ? "inline-block" : "none";
  sb.classList.remove("show");
  void sb.offsetWidth;
  sb.classList.add("show");
  snackTimer = setTimeout(() => sb.classList.remove("show"), withUndo ? 4000 : 2500);
}

// ===== TTL helper =====
function getTTL() {
  const tgl = ttlTgl.value.padStart(2,"0");
  const bln = ttlBln.value.padStart(2,"0");
  const thn = ttlThn.value;
  if (!ttlTgl.value || !ttlBln.value || !thn) return null;
  if (parseInt(tgl)<1||parseInt(tgl)>31) return null;
  if (parseInt(bln)<1||parseInt(bln)>12) return null;
  if (thn.length!==4) return null;
  return { tgl, bln, thn };
}

const BULAN = ["","Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
function formatTTL(obj) {
  if (!obj) return "-";
  return obj.tgl + " " + BULAN[parseInt(obj.bln)] + " " + obj.thn;
}

// ===== VALIDASI SUBMIT =====
function valid(d) {
  let ok = true;

  if (!d.nama) {
    setInputState(namaEl, true); showErr("nama", "Nama tidak boleh kosong"); ok = false;
  }
  if (!d.nis) {
    setInputState(nisEl, true); showErr("nis", "NIS tidak boleh kosong"); ok = false;
  }
  if (!d.alamat) {
    setInputState(alamatEl, true); showErr("alamat", "Alamat tidak boleh kosong"); ok = false;
  }
  if (!d.telepon) {
    setInputState(teleponEl, true); showErr("telepon", "Nomor telepon tidak boleh kosong"); ok = false;
  } else if (!d.telepon.startsWith("8") || d.telepon.length < 9) {
    setInputState(teleponEl, true); showErr("telepon", "Nomor harus diawali 8 dan minimal 9 digit setelah +62"); ok = false;
  }
  if (!d.umur) {
    setInputState(umurEl, true); showErr("umur", "Umur tidak boleh kosong"); ok = false;
  }
  if (!d.ttl) {
    showErr("ttl", "Tanggal lahir tidak valid atau belum diisi"); ok = false;
  }
  if (!d.gender) {
    document.getElementById("btnLaki").classList.add("gender-err");
    document.getElementById("btnPerempuan").classList.add("gender-err");
    showErr("gender", "Pilih jenis kelamin terlebih dahulu"); ok = false;
  }

  return ok;
}

// ===== RENDER =====
function render() {
  list.innerHTML = "";
  if (data.length === 0) {
    list.innerHTML = `<p style="text-align:center;opacity:0.35;margin-top:22px;font-size:13px;">Belum ada data.</p>`;
    return;
  }
  data.forEach((d, i) => {
    const gIcon  = d.gender === "Laki-laki" ? "♂" : "♀";
    const gColor = d.gender === "Laki-laki" ? "#38bdf8" : "#f472b6";
    const card   = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-name">${d.nama} <span style="font-size:12px;color:${gColor}">${gIcon} ${d.gender}</span></div>
      🆔 ${d.nis}<br>📍 ${d.alamat}<br>📞 +62${d.telepon}<br>
      🎂 ${d.umur} Tahun &nbsp;|&nbsp; 📅 ${formatTTL(d.ttl)}
      <div class="card-btn">
        <button class="showBtn" onclick="showData(${i})">Show</button>
        <button class="edit"    onclick="editData(${i})">Edit</button>
        <button class="delete"  onclick="bukaConfirm(${i})">Hapus</button>
      </div>`;
    list.appendChild(card);
  });
}

// ===== TAMBAH =====
btnTambah.onclick = () => {
  const d = {
    nama: namaEl.value.trim(), nis: nisEl.value.trim(),
    alamat: alamatEl.value.trim(), telepon: teleponEl.value.trim(),
    umur: umurEl.value.trim(), ttl: getTTL(), gender: selectedGender
  };
  if (!valid(d)) return;
  data.push(d); render(); reset();
  snackbar("Data berhasil ditambahkan!", false, "#22c55e");
};

// ===== SHOW =====
function showData(i) {
  const d = data[i];
  const isP = d.gender === "Perempuan";
  const av  = document.getElementById("avatarEl");
  av.textContent = d.nama.charAt(0).toUpperCase();
  av.className   = "avatar" + (isP ? " perempuan" : "");
  document.getElementById("namaDetail").textContent = d.nama;
  document.getElementById("badgeGender").innerHTML  =
    `<span class="badge-gender ${isP?'badge-perempuan':'badge-laki'}">${isP?'♀':'♂'} ${d.gender}</span>`;
  document.getElementById("detailBox").innerHTML = `
    <div class="detail-item"><span class="label">🆔 NIS</span><span class="value">${d.nis}</span></div>
    <div class="detail-item"><span class="label">📍 Alamat</span><span class="value">${d.alamat}</span></div>
    <div class="detail-item"><span class="label">📞 Telepon</span><span class="value">+62${d.telepon}</span></div>
    <div class="detail-item"><span class="label">🎂 Umur</span><span class="value">${d.umur} Tahun</span></div>
    <div class="detail-item"><span class="label">📅 Tgl Lahir</span><span class="value">${formatTTL(d.ttl)}</span></div>`;
  modal.classList.add("show");
}
function tutupModal() { modal.classList.remove("show"); }

// ===== EDIT =====
function editData(i) {
  const d = data[i];
  namaEl.value = d.nama; nisEl.value = d.nis;
  alamatEl.value = d.alamat;
  let tel = d.telepon.replace(/^\+?62/, "");
  if (tel.startsWith("0")) tel = tel.slice(1);
  teleponEl.value = tel;
  umurEl.value = d.umur;
  if (d.ttl) { ttlTgl.value = d.ttl.tgl; ttlBln.value = d.ttl.bln; ttlThn.value = d.ttl.thn; }
  pilihGender(d.gender);
  [namaEl,nisEl,alamatEl,teleponEl,umurEl,ttlTgl,ttlBln,ttlThn].forEach(el => setInputState(el, false));
  editIndex = i;
  btnTambah.classList.add("disabled");
  btnUpdate.classList.remove("disabled");
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById("nisCount").textContent = d.nis.length+"/10";
  const tc = document.getElementById("telCount");
  tc.textContent = tel.length+"/13";
  tc.style.color = (!tel.startsWith("8") || tel.length < 9) ? "#ef4444" : "#22c55e";
}

// ===== UPDATE =====
btnUpdate.onclick = () => {
  if (editIndex === -1) return;
  const d = {
    nama: namaEl.value.trim(), nis: nisEl.value.trim(),
    alamat: alamatEl.value.trim(), telepon: teleponEl.value.trim(),
    umur: umurEl.value.trim(), ttl: getTTL(), gender: selectedGender
  };
  if (!valid(d)) return;
  data[editIndex] = d; editIndex = -1;
  btnTambah.classList.remove("disabled");
  btnUpdate.classList.add("disabled");
  render(); reset();
  snackbar("Data berhasil diupdate!", false, "#6366f1");
};

// ===== CONFIRM HAPUS =====
function bukaConfirm(i) {
  pendingHapusIndex = i;
  document.getElementById("confirmDesc").textContent = `Data "${data[i].nama}" akan dihapus permanen.`;
  document.getElementById("confirmOverlay").classList.add("show");
}
function tutupConfirm() {
  pendingHapusIndex = -1;
  document.getElementById("confirmOverlay").classList.remove("show");
}
function konfirmasiHapus() {
  if (pendingHapusIndex === -1) return;
  const i = pendingHapusIndex;
  undoBuffer = { ...data[i], _index: i };
  data.splice(i, 1);
  
  // Jika sedang mengedit data yang dihapus, batalkan mode edit
  if (editIndex === i) {
    editIndex = -1;
    reset();
  } else if (editIndex > i) {
    editIndex--; // Sesuaikan indeks jika data sebelum item yang diedit dihapus
  }

  pendingHapusIndex = -1;
  document.getElementById("confirmOverlay").classList.remove("show");
  render();
  snackbar("Data dihapus.", true, "#ef4444");
}

// ===== UNDO =====
function undoHapus() {
  if (!undoBuffer) return;
  const { _index, ...d } = undoBuffer;
  data.splice(Math.min(_index, data.length), 0, d);
  undoBuffer = null; render();
  document.getElementById("snackbar").classList.remove("show");
  snackbar("Data berhasil dikembalikan!", false, "#22c55e");
}

// ===== RESET =====
function reset() {
  namaEl.value = nisEl.value = alamatEl.value = teleponEl.value = umurEl.value = "";
  ttlTgl.value = ttlBln.value = ttlThn.value = "";
  selectedGender = "";
  document.getElementById("btnLaki").className      = "gender-btn";
  document.getElementById("btnPerempuan").className = "gender-btn";
  document.getElementById("nisCount").textContent   = "0/10";
  
  const tc = document.getElementById("telCount");
  tc.textContent = "0/13"; 
  tc.style.color = "";

  // Reset status border & pesan error
  const allInputs = [namaEl, nisEl, alamatEl, teleponEl, umurEl, ttlTgl, ttlBln, ttlThn];
  allInputs.forEach(el => setInputState(el, null));
  ["nama", "nis", "alamat", "telepon", "umur", "ttl", "gender"].forEach(id => showErr(id, null));

  // Reset mode tombol ke Tambah
  editIndex = -1;
  btnTambah.classList.remove("disabled");
  btnUpdate.classList.add("disabled");
}