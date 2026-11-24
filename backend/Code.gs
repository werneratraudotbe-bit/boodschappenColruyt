/**
 * Backend van de Boodschappen-app voor de sheet "BoodschappenColruyt".
 * Plak dit in Extensies > Apps Script (bestand Code.gs) en implementeer als web-app.
 * Kies hieronder zelf een geheime sleutel; die vul je één keer in de app in.
 */
const SLEUTEL = 'azer1234';
const SHEET_ID = '1bIoeEPMJ2JWoE7QpoRwkq_oLDuoDSBML4of1ywsM9DI';
const TAB_LIJST = 'Lijst';
const TAB_THUIS = 'PlaatsenThuis';
const TAB_COLRUYT = 'PlaatsenColruyt';
// Kolommen in tabblad Lijst (1 = A)
const COL = { wat: 1, aantal: 2, thuis: 3, colruyt: 4, bio: 5 };

function doGet(e) {
  return json_({ ok: true, app: 'boodschappen' });
}

// De app stuurt POST {key, fn, args}
function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (SLEUTEL === 'VERANDER-MIJ' || req.key !== SLEUTEL) return json_({ error: 'Verkeerde sleutel' });
    const allowed = { getData, setAantal, saveItem, deleteItem, finishShopping };
    if (!allowed[req.fn]) return json_({ error: 'Onbekende functie' });
    return json_(allowed[req.fn].apply(null, req.args || []));
  } catch (err) {
    return json_({ error: String(err && err.message || err) });
  }
}

// Draai deze functie één keer in de editor om toegang tot de sheet te geven.
function test() {
  Logger.log(getData().items.length + ' producten gevonden');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ss_() { return SpreadsheetApp.openById(SHEET_ID); }

function listCol_(tab) {
  const sh = ss_().getSheetByName(tab);
  if (!sh || sh.getLastRow() < 1) return [];
  return sh.getRange(1, 1, sh.getLastRow(), 1).getValues()
    .map(r => String(r[0]).trim()).filter(Boolean);
}

function getData() {
  const sh = ss_().getSheetByName(TAB_LIJST);
  const last = sh.getLastRow();
  const rows = last > 1 ? sh.getRange(2, 1, last - 1, 5).getValues() : [];
  const items = [];
  rows.forEach((r, i) => {
    const wat = String(r[0]).trim();
    if (!wat) return;
    items.push({
      row: i + 2,
      wat: wat,
      aantal: Number(r[1]) || 0,
      thuis: String(r[2]).trim(),
      colruyt: String(r[3]).trim(),
      bio: String(r[4]).trim() !== ''
    });
  });
  return { items: items, thuis: listCol_(TAB_THUIS), colruyt: listCol_(TAB_COLRUYT), t: Date.now() };
}

// Zoek de rij terug op naam, voor het geval de sheet intussen gesorteerd werd.
function findRow_(sh, row, wat) {
  if (row && row >= 2 && row <= sh.getLastRow() &&
      String(sh.getRange(row, COL.wat).getValue()).trim() === wat) return row;
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const names = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < names.length; i++) {
    if (String(names[i][0]).trim() === wat) return i + 2;
  }
  return 0;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function setAantal(row, wat, aantal) {
  return withLock_(() => {
    const sh = ss_().getSheetByName(TAB_LIJST);
    const r = findRow_(sh, row, wat);
    if (!r) throw new Error('Product niet gevonden: ' + wat);
    sh.getRange(r, COL.aantal).setValue(aantal > 0 ? aantal : '');
    return { row: r };
  });
}

// item: {row?, oud?, wat, thuis, colruyt, bio}
function saveItem(item) {
  return withLock_(() => {
    const sh = ss_().getSheetByName(TAB_LIJST);
    const wat = String(item.wat || '').trim();
    if (!wat) throw new Error('Naam is verplicht');
    const r = item.oud ? findRow_(sh, item.row, item.oud) : 0;
    const values = [[wat, item.thuis || '', item.colruyt || '', item.bio ? 'x' : '']];
    if (r) {
      sh.getRange(r, COL.wat).setValue(wat);
      sh.getRange(r, COL.thuis, 1, 3).setValues([values[0].slice(1)]);
    } else {
      if (findRow_(sh, 0, wat)) throw new Error('"' + wat + '" staat al in de lijst');
      sh.appendRow([wat, item.aantal || '', item.thuis || '', item.colruyt || '', item.bio ? 'x' : '']);
      sortLijst_(sh);
    }
    return getData();
  });
}

function sortLijst_(sh) {
  const last = sh.getLastRow();
  if (last > 2) sh.getRange(2, 1, last - 1, sh.getLastColumn()).sort({ column: COL.wat, ascending: true });
}

function deleteItem(row, wat) {
  return withLock_(() => {
    const sh = ss_().getSheetByName(TAB_LIJST);
    const r = findRow_(sh, row, wat);
    if (r) sh.deleteRow(r);
    return getData();
  });
}

// lijst: [{row, wat}] van producten die gekocht zijn -> Aantal leegmaken
function finishShopping(lijst) {
  return withLock_(() => {
    const sh = ss_().getSheetByName(TAB_LIJST);
    (lijst || []).forEach(it => {
      const r = findRow_(sh, it.row, it.wat);
      if (r) sh.getRange(r, COL.aantal).setValue('');
    });
    return getData();
  });
}
