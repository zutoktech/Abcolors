# Google Sheet Lead Automation Setup Guide - AB Colors

Google Sheet Link: [https://docs.google.com/spreadsheets/d/1sY3JgpE1BXnGwiBOrlJXNE0wBH8BU24kJz5MXInJ-Uw/edit](https://docs.google.com/spreadsheets/d/1sY3JgpE1BXnGwiBOrlJXNE0wBH8BU24kJz5MXInJ-Uw/edit)

---

## ❓ Important Question: Kya Google Sheet "Anyone with link" (Public) karna hai ya Private rahega?

### **✅ Jawab: Google Sheet 100% PRIVATE hi rahegi!**
Aapko apni Google Sheet ko bilkul bhi public ya "Anyone with link" karne ki zarurat **nahi** hai.

**Kyun?**
Jab hum Google Sheet me **Apps Script** deploy karte hain:
- **Execute as: "Me"** (Aapka email account)
- **Who has access: "Anyone"**

Iska matlab Google Apps Script background me aapke account ki power se data sheet me likhta hai. Website par aane wale visitors ko aapki sheet ka koi access nahi milta, na hi wo sheet dekh sakte hain.
Aapki Google Sheet **Private & Secure** rahegi, sirf aap dekh payenge!

---

## 🚀 2-Minute Setup Steps (Step-by-Step)

### Step 1: Google Sheet me Apps Script Open karein
1. Browser me apni Google Sheet kholein:
   `https://docs.google.com/spreadsheets/d/1sY3JgpE1BXnGwiBOrlJXNE0wBH8BU24kJz5MXInJ-Uw/edit`
2. Top menu me **Extensions** par click karein aur **Apps Script** select karein.

---

### Step 2: Code Paste Karein
1. Apps Script editor me jo pehle se code likha ho (jaise `function myFunction() {}`), use delete kar dein.
2. `google-apps-script.js` file ka sara code copy karke wahan paste kar dein:

```javascript
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();

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
      var headerRange = sheet.getRange(1, 1, 1, 7);
      headerRange.setBackground("#d72a2f");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

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

    sheet.appendRow([
      timestamp,
      service,
      name,
      email,
      "'" + phone,
      city,
      requirement
    ]);

    for (var col = 1; col <= 7; col++) {
      sheet.autoResizeColumn(col);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput("AB Colors Lead Automation Web App is Active & Ready.")
    .setMimeType(ContentService.MimeType.TEXT);
}
```
3. Upar bane **Save** (💾 icon) par click karein ya `Ctrl + S` dabayein.

---

### Step 3: Web App Deploy Karein (Most Important)
1. Top-right me blue color ke **Deploy** button par click karein aur **New deployment** chunein.
2. Left side me gear icon (⚙️) par click karke **Web app** select karein.
3. Form me yeh details bharein:
   - **Description**: `AB Colors Leads`
   - **Execute as**: **Me (your_email@gmail.com)**
   - **Who has access**: **Anyone** *(Ye zaroori hai taaki website ke users bina login kiye form submit kar sakein)*
4. **Deploy** button dabayein.
5. Ek permission popup aayega:
   - Click **Authorize access**
   - Apna Google Account choose karein
   - Google ek warning dega: "Google hasn't verified this app" -> Click karein **Advanced** par, aur neeche click karein **Go to Untitled project (unsafe)**
   - Click karein **Allow**.

---

### Step 4: Web App URL Copy Karein
1. Deploy hote hi screen par ek **Web app URL** dikhega (jo `https://script.google.com/macros/s/.../exec` jaisa hoga).
2. Use **Copy** kar lijiye.
3. Apne project me `js/form-handler.js` file kholein aur line 9 par apna Web App URL paste kar dein:
   ```javascript
   let GOOGLE_SCRIPT_WEB_APP_URL = "AAPKA_COPY_KIYA_HUA_URL_YAHAN_PASTE_KAREIN";
   ```

**Bas kaam ho gaya!** Ab jab bhi koi user kisi bhi service page par form bharega, instant data aapki Google Sheet me new row bankar save ho jayega.
