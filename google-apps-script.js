/**
 * ==============================================================================
 * AB Colors - Google Sheet Lead Automation Script
 * Sheet URL: https://docs.google.com/spreadsheets/d/1sY3JgpE1BXnGwiBOrlJXNE0wBH8BU24kJz5MXInJ-Uw/edit
 * ==============================================================================
 * 
 * INSTRUCTIONS:
 * 1. Open your Google Sheet in browser:
 *    https://docs.google.com/spreadsheets/d/1sY3JgpE1BXnGwiBOrlJXNE0wBH8BU24kJz5MXInJ-Uw/edit
 * 2. Click on "Extensions" (top menu) -> "Apps Script"
 * 3. Delete any default code in Code.gs and paste this entire code.
 * 4. Click the "Save" icon (Ctrl + S).
 * 5. Click "Deploy" (top right blue button) -> "New deployment"
 * 6. Click the gear icon next to "Select type" and choose "Web app"
 * 7. Fill in:
 *    - Description: AB Colors Leads Web App
 *    - Execute as: "Me" (your email)
 *    - Who has access: "Anyone" (Crucial so website visitors can submit inquiries!)
 * 8. Click "Deploy" -> Click "Authorize access" -> Choose your Google Account -> Click "Advanced" -> Click "Go to Untitled project (unsafe)" -> Click "Allow".
 * 9. Copy the generated "Web app URL" (ends with /exec).
 * 10. Open `js/form-handler.js` on your website and replace GOOGLE_SCRIPT_WEB_APP_URL with your new Web app URL!
 * 
 * QUESTION: Does Google Sheet need to be "Anyone with link" or can it be Private?
 * ANSWER: Google Sheet 100% PRIVATE hi rahegi! Aapko Sheet ko Anyone with link (Public)
 * karne ki koi zarurat nahi hai. Kyunki script "Execute as: Me" ke tahat chalti hai,
 * toh sirf aapke account ke paas sheet ka access rahega aur visitors ka form data
 * background me safely aapki private sheet me save ho jayega.
 * ==============================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Wait up to 10 seconds for other processes to finish
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();

    // Auto-create header row if sheet is fresh/empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Service",
        "Name",
        "Email",
        "Phone Number",
        "City",
        "Requirement"
      ]);
      // Format Header Row
      var headerRange = sheet.getRange(1, 1, 1, 7);
      headerRange.setBackground("#d72a2f");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // Extract parameters from POST (supports form-urlencoded, JSON, or direct params)
    var params = (e && e.parameter) ? e.parameter : {};

    if (!params.name && e && e.postData && e.postData.contents) {
      try {
        var json = JSON.parse(e.postData.contents);
        params = json;
      } catch (jsonErr) {}
    }

    var timestamp = params.timestamp || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    var service = params.service || "General Inquiry";
    var name = params.name || "";
    var email = params.email || "";
    var phone = params.phone || "";
    var city = params.city || "";
    var requirement = params.requirement || "";

    // Append new lead row
    sheet.appendRow([
      timestamp,
      service,
      name,
      email,
      "'" + phone, // Prefix with apostrophe to preserve leading zeros in phone numbers
      city,
      requirement
    ]);

    // Auto-fit column widths
    for (var col = 1; col <= 7; col++) {
      sheet.autoResizeColumn(col);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success", message: "Inquiry saved successfully" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// For quick testing in browser
function doGet(e) {
  return ContentService
    .createTextOutput("AB Colors Lead Automation Web App is Active & Ready.")
    .setMimeType(ContentService.MimeType.TEXT);
}
