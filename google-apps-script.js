
/**
 * EXAMSY BACKEND V3.1 (Consistency Fix)
 */

function doGet(e) {
  var data = getAllData();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
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
    return response("Server Error: " + err.toString(), false);
  }
}

function updateStudentStatus(nis, newStatus) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("STUDENTS");
  if (!sheet) return response("Sheet STUDENTS not found", false);
  
  var range = sheet.getDataRange();
  var values = range.getValues();
  var targetNis = String(nis).trim().toLowerCase();
  
  for (var i = 1; i < values.length; i++) {
    var currentNis = String(values[i][0]).trim().toLowerCase();
    if (currentNis === targetNis) {
      // Column 6 is Status (F)
      sheet.getRange(i + 1, 6).setValue(newStatus); 
      return response("Status updated to " + newStatus, true);
    }
  }
  return response("NIS " + nis + " not found", false);
}

function syncAllData(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  function updateSheet(sheetName, headers, rowData, mapFn) {
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    sheet.clear();
    
    if (rowData && rowData.length > 0) {
      var output = [headers];
      rowData.forEach(function(item) {
        output.push(mapFn(item));
      });
      sheet.getRange(1, 1, output.length, headers.length).setValues(output);
    } else {
      sheet.appendRow(headers);
    }
    sheet.getRange(1, 1, 1, headers.length).setBackground("#f1f5f9").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  if (data.students) {
    updateSheet("STUDENTS", ["NIS", "Nama", "Kelas", "RuangID", "Password", "Status"], data.students, function(s) {
      return [String(s.nis), s.name, s.class, s.roomId || "", s.password || "password123", s.status];
    });
  }

  if (data.sessions) {
    updateSheet("SESSIONS", ["ID", "Nama", "Kelas", "PIN", "Durasi", "Aktif", "PDFURL"], data.sessions, function(s) {
      return [s.id, s.name, s.class, s.pin, s.durationMinutes, s.isActive, s.pdfUrl || ""];
    });
  }

  if (data.rooms) {
    updateSheet("ROOMS", ["ID", "Nama", "Kapasitas", "Username", "Password"], data.rooms, function(r) {
      return [r.id, r.name, r.capacity, r.username || "", r.password || ""];
    });
  }

  return response("Full sync complete", true);
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
      var key = String(headers[j]).toLowerCase();
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
    message: msg,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
