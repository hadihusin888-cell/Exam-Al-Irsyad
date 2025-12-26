
/**
 * EXAMSY BACKEND SCRIPT
 * ---------------------
 * Cara Pasang:
 * 1. Buka Google Sheets Anda.
 * 2. Klik Menu 'Extensions' > 'Apps Script'.
 * 3. Hapus kode yang ada, lalu tempel kode di bawah ini.
 * 4. Buat 3 Sheet dengan nama: "STUDENTS", "SESSIONS", dan "ROOMS".
 * 5. Klik 'Deploy' > 'New Deployment' > 'Web App'.
 * 6. Set 'Who has access' ke 'Anyone'.
 * 7. Copy URL Web App yang muncul ke konstanta GAS_URL di file App.tsx.
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify(getAllData()))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;

    if (action === 'UPDATE_STUDENT_STATUS') {
      return updateStudentStatus(contents.nis, contents.status);
    } 
    
    if (action === 'SYNC_ALL') {
      return syncAllData(contents);
    }

    return response("Action not found", false);
  } catch (err) {
    return response(err.toString(), false);
  }
}

// FUNGSI UNTUK PROKTOR: Update status siswa secara spesifik
function updateStudentStatus(nis, newStatus) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("STUDENTS");
  var data = sheet.getDataRange().getValues();
  
  // Asumsi: Kolom A = NIS, Kolom F = Status
  // Cari baris yang NIS-nya cocok
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(nis).trim()) {
      sheet.getCell(i + 1, 6).setValue(newStatus); // Update kolom ke-6 (F)
      return response("Status updated for " + nis, true);
    }
  }
  
  return response("NIS " + nis + " not found", false);
}

// FUNGSI UNTUK ADMIN: Simpan seluruh database (Overwrite)
function syncAllData(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Update Sheet STUDENTS
  if (data.students) {
    var studentSheet = ss.getSheetByName("STUDENTS") || ss.insertSheet("STUDENTS");
    studentSheet.clear();
    studentSheet.appendRow(["NIS", "Nama", "Kelas", "RuangID", "Password", "Status"]);
    data.students.forEach(function(s) {
      studentSheet.appendRow([s.nis, s.name, s.class, s.roomId, s.password, s.status]);
    });
  }

  // 2. Update Sheet SESSIONS
  if (data.sessions) {
    var sessionSheet = ss.getSheetByName("SESSIONS") || ss.insertSheet("SESSIONS");
    sessionSheet.clear();
    sessionSheet.appendRow(["ID", "Nama", "Kelas", "PIN", "Durasi", "Aktif", "PDFURL"]);
    data.sessions.forEach(function(s) {
      sessionSheet.appendRow([s.id, s.name, s.class, s.pin, s.durationMinutes, s.isActive, s.pdfUrl]);
    });
  }

  // 3. Update Sheet ROOMS
  if (data.rooms) {
    var roomSheet = ss.getSheetByName("ROOMS") || ss.insertSheet("ROOMS");
    roomSheet.clear();
    roomSheet.appendRow(["ID", "Nama", "Kapasitas", "Username", "Password"]);
    data.rooms.forEach(function(r) {
      roomSheet.appendRow([r.id, r.name, r.capacity, r.username, r.password]);
    });
  }

  return response("Full database synced successfully", true);
}

function getAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    students: getSheetData(ss.getSheetByName("STUDENTS")),
    sessions: getSheetData(ss.getSheetByName("SESSIONS")),
    rooms: getSheetData(ss.getSheetByName("ROOMS"))
  };
}

function getSheetData(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j].toLowerCase();
      // Mapping nama kolom agar sesuai dengan interface TypeScript
      if (key === "ruangid") key = "roomId";
      if (key === "aktif") key = "isActive";
      if (key === "durasi") key = "durationMinutes";
      if (key === "pdfurl") key = "pdfUrl";
      obj[key] = data[i][j];
    }
    result.push(obj);
  }
  return result;
}

function response(msg, success) {
  return ContentService.createTextOutput(JSON.stringify({
    success: success,
    message: msg
  })).setMimeType(ContentService.MimeType.JSON);
}
