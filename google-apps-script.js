
/**
 * EXAMSY BACKEND SCRIPT V2.1 (Stability Focus)
 * ---------------------
 */

function doGet(e) {
  var data = getAllData();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    // Menangani payload jika dikirim sebagai string atau object
    var contents;
    if (typeof e.postData.contents === 'string') {
      contents = JSON.parse(e.postData.contents);
    } else {
      contents = e.postData.contents;
    }
    
    var action = contents.action;

    if (action === 'UPDATE_STUDENT_STATUS') {
      return updateStudentStatus(contents.nis, contents.status);
    } 
    
    if (action === 'SYNC_ALL') {
      return syncAllData(contents);
    }

    return response("Action " + action + " not found", false);
  } catch (err) {
    return response("Error: " + err.toString(), false);
  }
}

function updateStudentStatus(nis, newStatus) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("STUDENTS");
  if (!sheet) return response("Sheet STUDENTS not found", false);
  
  var data = sheet.getDataRange().getValues();
  var nisTarget = String(nis).trim();
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === nisTarget) {
      sheet.getRange(i + 1, 6).setValue(newStatus); 
      return response("Status updated for " + nis, true);
    }
  }
  return response("NIS " + nis + " not found", false);
}

function syncAllData(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  function bulkUpdateSheet(sheetName, headers, items, mapFn) {
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    sheet.clear();
    if (!items || items.length === 0) {
      sheet.appendRow(headers);
      return;
    }
    var rows = [headers];
    items.forEach(function(item) {
      rows.push(mapFn(item));
    });
    sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  }

  if (data.students) {
    bulkUpdateSheet("STUDENTS", ["NIS", "Nama", "Kelas", "RuangID", "Password", "Status"], data.students, function(s) {
      return [String(s.nis), s.name, s.class, s.roomId || "", s.password || "password123", s.status];
    });
  }

  if (data.sessions) {
    bulkUpdateSheet("SESSIONS", ["ID", "Nama", "Kelas", "PIN", "Durasi", "Aktif", "PDFURL"], data.sessions, function(s) {
      return [s.id, s.name, s.class, s.pin, s.durationMinutes, s.isActive, s.pdfUrl || ""];
    });
  }

  if (data.rooms) {
    bulkUpdateSheet("ROOMS", ["ID", "Nama", "Kapasitas", "Username", "Password"], data.rooms, function(r) {
      return [r.id, r.name, r.capacity, r.username || "", r.password || ""];
    });
  }

  return response("Database synchronized", true);
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
  var range = sheet.getDataRange();
  if (range.getNumRows() < 2) return [];
  var data = range.getValues();
  var headers = data[0];
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j].toLowerCase();
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
  var res = { success: success, message: msg, timestamp: new Date().getTime() };
  return ContentService.createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}
