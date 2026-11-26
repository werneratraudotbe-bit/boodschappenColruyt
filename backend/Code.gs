/**
 * Backend van de Boodschappen-app voor de sheet "BoodschappenColruyt".
 * Plak dit in Extensies > Apps Script (bestand Code.gs) en implementeer als web-app.
 * Kies hieronder zelf een geheime sleutel; die vul je één keer in de app in.
 */
const SLEUTEL = 'VERANDER-MIJ';
const VERSIE = 2; // verhoogt bij elke nieuwe versie van dit script
const SHEET_ID = '1bIoeEPMJ2JWoE7QpoRwkq_oLDuoDSBML4of1ywsM9DI';
const TAB_LIJST = 'Lijst';
const TAB_THUIS = 'PlaatsenThuis';
const TAB_COLRUYT = 'PlaatsenColruyt';
// Kolommen in tabblad Lijst (1 = A)
const COL = { wat: 1, aantal: 2, thuis: 3, colruyt: 4, bio: 5 };

function doGet(e) {
  return json_({ ok: true, app: 'boodschappen', versie: VERSIE });
}

// De app stuurt POST {key, fn, args}
function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (SLEUTEL === 'VERANDER-MIJ' || req.key !== SLEUTEL) return json_({ error: 'Verkeerde sleutel' });
    const allowed = { getData, setAantal, saveItem, deleteItem, finishShopping, savePlaces };
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
  return { items: items, thuis: listCol_(TAB_THUIS), colruyt: listCol_(TAB_COLRUYT), versie: VERSIE, t: Date.now() };
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

/**
 * Plaatsen beheren vanuit de app.
 * soort: 'thuis' of 'colruyt'
 * lijst: [{code, naam}] in de gewenste volgorde. code = bestaande waarde (leeg voor een nieuwe plaats).
 * Een plaats die ontbreekt, wordt verwijderd (de producten verliezen die plaats).
 * Een hernoemde plaats wordt ook bij alle producten aangepast.
 */
function savePlaces(soort, lijst) {
  return withLock_(() => {
    const tab = soort === 'colruyt' ? TAB_COLRUYT : TAB_THUIS;
    const col = soort === 'colruyt' ? COL.colruyt : COL.thuis;
    const ss = ss_();
    const plSh = ss.getSheetByName(tab);
    const oud = listCol_(tab);

    const nieuw = [];
    const hernoem = {};
    (lijst || []).forEach(p => {
      const naam = String(p.naam || '').trim();
      if (!naam) return;
      const code = String(p.code || '').trim();
      const m = code.match(/^\d+[a-z]?-/i);
      const nieuweCode = (m ? m[0] : '') + naam;
      if (nieuw.indexOf(nieuweCode) >= 0) throw new Error('"' + naam + '" staat er twee keer in');
      nieuw.push(nieuweCode);
      if (code && code !== nieuweCode) hernoem[code] = nieuweCode;
    });
    oud.forEach(c => { if (!(c in hernoem) && nieuw.indexOf(c) < 0) hernoem[c] = ''; });

    // Producten bijwerken
    const sh = ss.getSheetByName(TAB_LIJST);
    const last = sh.getLastRow();
    if (last > 1 && Object.keys(hernoem).length) {
      const rng = sh.getRange(2, col, last - 1, 1);
      const vals = rng.getValues();
      let changed = false;
      vals.forEach(r => {
        const v = String(r[0]).trim();
        if (v in hernoem) { r[0] = hernoem[v]; changed = true; }
      });
      if (changed) rng.setValues(vals);
    }

    // Lijst met plaatsen herschrijven
    plSh.getRange(1, 1, Math.max(plSh.getMaxRows(), 1), 1).clearContent();
    if (nieuw.length) plSh.getRange(1, 1, nieuw.length, 1).setValues(nieuw.map(c => [c]));
    return getData();
  });
}
