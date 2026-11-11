// DXB MUN – read and write Excel (.xlsx) and CSV files in the browser. No outside libraries.
// An .xlsx file is a zip of XML files; this reads the sheets out of it and can build a new one.
(function (root) {
  var enc = new TextEncoder(), dec = new TextDecoder();

  /* ---------------- zip (read) ---------------- */
  function unzip(buf) {
    var u8 = new Uint8Array(buf), v = new DataView(buf), i = u8.length - 22, files = {};
    while (i >= 0 && v.getUint32(i, true) !== 0x06054b50) i--;
    if (i < 0) throw new Error('This does not look like an Excel (.xlsx) file.');
    var n = v.getUint16(i + 10, true), off = v.getUint32(i + 16, true);
    for (var k = 0; k < n; k++) {
      if (v.getUint32(off, true) !== 0x02014b50) break;
      var method = v.getUint16(off + 10, true), csize = v.getUint32(off + 20, true);
      var nl = v.getUint16(off + 28, true), xl = v.getUint16(off + 30, true), cl = v.getUint16(off + 32, true), lo = v.getUint32(off + 42, true);
      var name = dec.decode(u8.subarray(off + 46, off + 46 + nl));
      var start = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true);
      files[name] = { method: method, data: u8.subarray(start, start + csize) };
      off += 46 + nl + xl + cl;
    }
    return files;
  }
  function inflate(entry) {
    if (entry.method === 0) return Promise.resolve(entry.data);
    if (entry.method !== 8) return Promise.reject(new Error('Unsupported compression in this file.'));
    var stream = new Blob([entry.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  function text(files, name) { return files[name] ? inflate(files[name]).then(function (u) { return dec.decode(u); }) : Promise.resolve(''); }

  /* ---------------- xml bits ---------------- */
  function decode(s) {
    return s.replace(/&#x([0-9a-fA-F]+);/g, function (m, h) { return String.fromCodePoint(parseInt(h, 16)); })
      .replace(/&#(\d+);/g, function (m, d) { return String.fromCodePoint(+d); })
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  }
  function texts(xml) {
    xml = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
    var out = '', re = /<t\b[^>]*>([\s\S]*?)<\/t>/g, m;
    while ((m = re.exec(xml))) out += m[1];
    return decode(out);
  }
  function colIndex(letters) { var n = 0; for (var i = 0; i < letters.length; i++) n = n * 26 + letters.charCodeAt(i) - 64; return n - 1; }
  function attr(tag, name) { var m = new RegExp('\\b' + name + '="([^"]*)"').exec(tag); return m ? decode(m[1]) : null; }

  function parseSheet(xml, shared) {
    var cells = {}, maxRow = 0, maxCol = 0, re = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, m;
    while ((m = re.exec(xml))) {
      var ref = /\br="([A-Z]+)(\d+)"/.exec(m[1]);
      if (!ref) continue;
      var type = attr(m[1], 't'), body = m[2] || '', val = '';
      if (type === 'inlineStr') val = texts(body);
      else {
        var vm = /<v>([\s\S]*?)<\/v>/.exec(body);
        if (vm) { val = decode(vm[1]); if (type === 's') val = shared[+val] || ''; }
      }
      var r = +ref[2] - 1, c = colIndex(ref[1]);
      (cells[r] = cells[r] || {})[c] = val;
      if (r > maxRow) maxRow = r; if (c > maxCol) maxCol = c;
    }
    var rows = [];
    for (var y = 0; y <= maxRow; y++) {
      var row = [];
      for (var x = 0; x <= maxCol; x++) row.push(cells[y] && cells[y][x] !== undefined ? cells[y][x] : '');
      rows.push(row);
    }
    return rows;
  }

  // Read every visible sheet of an .xlsx: resolves to [{ name, rows: [[cell, ...], ...] }]
  function readXlsx(buf) {
    var files;
    try { files = unzip(buf); } catch (e) { return Promise.reject(e); }
    return Promise.all([text(files, 'xl/workbook.xml'), text(files, 'xl/_rels/workbook.xml.rels'), text(files, 'xl/sharedStrings.xml')]).then(function (t) {
      if (!t[0]) throw new Error('This does not look like an Excel (.xlsx) file.');
      var shared = [], sm, sre = /<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g;
      while ((sm = sre.exec(t[2]))) shared.push(sm[1] ? texts(sm[1]) : '');
      var targets = {}, rm, rre = /<Relationship\b[^>]*>/g;
      while ((rm = rre.exec(t[1]))) { var id = attr(rm[0], 'Id'), tg = attr(rm[0], 'Target'); if (id && tg) targets[id] = tg.charAt(0) === '/' ? tg.slice(1) : 'xl/' + tg; }
      var sheets = [], wm, wre = /<sheet\b[^>]*>/g;
      while ((wm = wre.exec(t[0]))) {
        var state = attr(wm[0], 'state');
        if (state && state !== 'visible') continue;
        var rid = attr(wm[0], 'r:id');
        if (rid && targets[rid]) sheets.push({ name: attr(wm[0], 'name') || 'Sheet', path: targets[rid] });
      }
      return Promise.all(sheets.map(function (s) { return text(files, s.path); })).then(function (xmls) {
        return sheets.map(function (s, i) { return { name: s.name, rows: parseSheet(xmls[i], shared) }; });
      });
    });
  }

  /* ---------------- csv ---------------- */
  function parseCsv(s) {
    s = String(s).replace(/^\ufeff/, '');
    var first = s.split('\n')[0], delim = ',';
    [';', '\t'].forEach(function (d) { if (first.split(d).length > first.split(delim).length) delim = d; });
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (q) { if (ch === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (ch !== '\r') cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  // Read a File (.xlsx, .csv or .txt): resolves to [{ name, rows }]
  function readFile(file) {
    var lower = String(file.name || '').toLowerCase();
    if (/\.(csv|txt|tsv)$/.test(lower)) return file.text().then(function (t) { return [{ name: file.name.replace(/\.\w+$/, ''), rows: parseCsv(t) }]; });
    if (/\.xls$/.test(lower)) return Promise.reject(new Error('Old .xls files are not supported. In Excel choose File > Save As > Excel Workbook (.xlsx), or save as CSV.'));
    return file.arrayBuffer().then(readXlsx);
  }

  /* ---------------- zip (write, no compression) + xlsx ---------------- */
  var crcTable;
  function crc32(u8) {
    if (!crcTable) { crcTable = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; } }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) crc = crcTable[(crc ^ u8[i]) & 255] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function zip(files) {
    var parts = [], central = [], offset = 0, cdSize = 0;
    files.forEach(function (f) {
      var nm = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      var lh = new Uint8Array(30 + nm.length), d = new DataView(lh.buffer);
      d.setUint32(0, 0x04034b50, true); d.setUint16(4, 20, true); d.setUint16(6, 0x0800, true); d.setUint16(12, 0x21, true);
      d.setUint32(14, crc, true); d.setUint32(18, data.length, true); d.setUint32(22, data.length, true); d.setUint16(26, nm.length, true); lh.set(nm, 30);
      var ch = new Uint8Array(46 + nm.length), e = new DataView(ch.buffer);
      e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(8, 0x0800, true); e.setUint16(14, 0x21, true);
      e.setUint32(16, crc, true); e.setUint32(20, data.length, true); e.setUint32(24, data.length, true); e.setUint16(28, nm.length, true); e.setUint32(42, offset, true); ch.set(nm, 46);
      parts.push(lh, data); central.push(ch); offset += lh.length + data.length; cdSize += ch.length;
    });
    var end = new Uint8Array(22), v = new DataView(end.buffer);
    v.setUint32(0, 0x06054b50, true); v.setUint16(8, files.length, true); v.setUint16(10, files.length, true); v.setUint32(12, cdSize, true); v.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [end]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function colName(i) { var s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; }

  // sheets: [{ name, rows: [[...], ...], widths: [n, ...] }]. The first row is shown in bold. Everything is stored as text.
  function buildXlsx(sheets) {
    var NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"', R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    var files = [
      { name: '[Content_Types].xml', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>' },
      { name: '_rels/.rels', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="' + R + '/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook ' + NS + ' xmlns:r="' + R + '"><sheets>' + sheets.map(function (s, i) { return '<sheet name="' + esc(String(s.name).replace(/[\\\/?*\[\]:]/g, ' ').slice(0, 31)) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="' + R + '/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="' + R + '/styles" Target="styles.xml"/></Relationships>' },
      { name: 'xl/styles.xml', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet ' + NS + '><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>' }
    ];
    sheets.forEach(function (s, i) {
      var cols = (s.widths || []).map(function (w, k) { return '<col min="' + (k + 1) + '" max="' + (k + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('');
      var data = s.rows.map(function (row, y) {
        return '<row r="' + (y + 1) + '">' + row.map(function (v, x) {
          return '<c r="' + colName(x) + (y + 1) + '" t="inlineStr"' + (y === 0 ? ' s="1"' : '') + '><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
        }).join('') + '</row>';
      }).join('');
      files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet ' + NS + '>' + (cols ? '<cols>' + cols + '</cols>' : '') + '<sheetData>' + data + '</sheetData></worksheet>' });
    });
    return zip(files);
  }

  function download(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  root.DXBSheets = { readFile: readFile, readXlsx: readXlsx, parseCsv: parseCsv, buildXlsx: buildXlsx, download: download };
})(typeof window !== 'undefined' ? window : globalThis);
