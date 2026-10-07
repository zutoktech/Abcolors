/**
 * ==============================================================================
 * AB Colors - Google Sheet Lead Automation Script
 * Sheet URL: https://docs.google.com/spreadsheets/d/1sY3JgpE1BXnGwiBOrlJXNE0wBH8BU24kJz5MXInJ-Uw/edit
 * ==============================================================================
 *
 * INSTRUCTIONS (details in GOOGLE_SHEET_SETUP_GUIDE.md):
 * 1. Open the Google Sheet -> Extensions -> Apps Script.
 * 2. Delete the default code in Code.gs and paste this entire file. Save (Ctrl + S).
 * 3. Deploy -> New deployment -> type "Web app":
 *      - Execute as: "Me"
 *      - Who has access: "Anyone"   (visitors are not logged in to Google)
 * 4. Deploy -> Authorize access -> choose your account -> Advanced -> Go to project -> Allow.
 * 5. Copy the "Web app URL" (ends with /exec) and paste it into GOOGLE_SCRIPT_WEB_APP_URL at the top of
 *    js/form-handler.js. Open the URL in a browser once: it should say the web app is active.
 * 6. When you change this code later, use Deploy -> Manage deployments -> Edit -> Version: "New version"
 *    so the URL stays the same.
 *
 * The sheet itself stays PRIVATE: the script runs as you ("Execute as: Me") and visitors can only add rows.
 * ==============================================================================
 */

var HEADERS = ["Timestamp", "Service", "Name", "Email", "Phone Number", "City", "Requirement"];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // Header row for a fresh sheet
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setBackground("#d72a2f");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, HEADERS.length);
    }

    // The website sends application/x-www-form-urlencoded data; JSON bodies are accepted too
    var params = (e && e.parameter) ? e.parameter : {};
    if (!params.name && e && e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (jsonErr) {}
    }

    if (!params.name || !params.phone) {
      return jsonOutput({ result: "error", error: "Name and phone are required" });
    }

    sheet.appendRow([
      clean(params.timestamp) || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      clean(params.service) || "General Inquiry",
      clean(params.name),
      clean(params.email),
      "'" + String(params.phone).slice(0, 30), // apostrophe keeps the number as text (leading zeros, +91)
      clean(params.city),
      clean(params.requirement)
    ]);

    return jsonOutput({ result: "success", message: "Inquiry saved successfully" });
  } catch (error) {
    return jsonOutput({ result: "error", error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// Open the Web App URL in a browser to check that the deployment works.
function doGet(e) {
  return ContentService
    .createTextOutput("AB Colors Lead Automation Web App is Active & Ready.")
    .setMimeType(ContentService.MimeType.TEXT);
}

// Plain text only: values starting with = + - @ would otherwise run as spreadsheet formulas.
function clean(value) {
  var text = String(value == null ? "" : value).slice(0, 2000);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
