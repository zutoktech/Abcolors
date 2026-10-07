/**
 * AB Colors - enquiry forms -> Google Sheet
 *
 * Every enquiry form posts to the Google Apps Script Web App below (code: google-apps-script.js,
 * setup steps: GOOGLE_SHEET_SETUP_GUIDE.md). The visitor is sent to thank-you.html (which records the
 * Google Ads conversion) only after the sheet confirms the row was saved. If saving fails, or the URL
 * below is not set yet, the form shows WhatsApp / call buttons with the enquiry already filled in, so a
 * lead is never lost silently.
 */

// Paste the Web App URL from Apps Script (Deploy > Manage deployments) here. It ends with /exec.
var GOOGLE_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxcTtmo4g86eLsFnWkMtQ1ZFBIBdlUMS9kNX1DqKK2HqfC3IFpUg8Y7GvjSGzDcPzs/exec";

var AB_WHATSAPP_NUMBER = "919842275299";
var AB_PHONE_LINK = "+919842275299";
var AB_PHONE_DISPLAY = "+91 98422 75299";

if (window.AB_COLORS_SCRIPT_URL) {
  GOOGLE_SCRIPT_WEB_APP_URL = window.AB_COLORS_SCRIPT_URL;
}

function isSheetConfigured() {
  // .../macros/s/<id>/exec, or .../a/macros/<domain>/s/<id>/exec for Google Workspace accounts
  return /^https:\/\/script\.google\.com\/(?:a\/macros\/[^\/]+|macros)\/s\/[\w-]{30,}\/exec$/.test(GOOGLE_SCRIPT_WEB_APP_URL);
}

/**
 * Sends one lead to the Google Sheet. Resolves when the Apps Script confirms the row was saved.
 * (A normal CORS request: Apps Script answers with "Access-Control-Allow-Origin: *", so the
 * result can be read - unlike the old "no-cors" request, which hid every failure.)
 */
function sendLeadToSheet(lead) {
  if (!isSheetConfigured()) {
    return Promise.reject(new Error("Google Sheet Web App URL is not set in js/form-handler.js"));
  }
  var controller = window.AbortController ? new AbortController() : null;
  var timer = controller ? setTimeout(function () { controller.abort(); }, 20000) : null;

  return fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
    method: "POST",
    body: new URLSearchParams(lead),
    signal: controller ? controller.signal : undefined
  })
    .then(function (response) {
      if (!response.ok) throw new Error("Google Sheet returned HTTP " + response.status);
      return response.json();
    })
    .then(function (result) {
      if (!result || result.result !== "success") {
        throw new Error((result && result.error) || "Google Sheet did not confirm the save");
      }
      return result;
    })
    .finally(function () {
      if (timer) clearTimeout(timer);
    });
}

function leadWhatsAppLink(lead) {
  var lines = [
    "Hi AB Colors, I would like a quote.",
    "Name: " + lead.name,
    "Phone: " + lead.phone,
    "Service: " + lead.service
  ];
  if (lead.city && lead.city !== "Not specified") lines.push("City: " + lead.city);
  if (lead.email && lead.email !== "Not provided") lines.push("Email: " + lead.email);
  lines.push("Requirement: " + lead.requirement);
  return "https://wa.me/" + AB_WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
}

function getStatusBox(form) {
  var box = document.getElementById(form.id + "-status");
  if (!box) {
    box = document.createElement("div");
    box.id = form.id + "-status";
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    form.appendChild(box);
  }
  return box;
}

function showFormError(form, message) {
  var box = getStatusBox(form);
  box.innerHTML = "";
  var div = document.createElement("div");
  div.className = "form-error";
  div.innerHTML = '<i class="fa fa-exclamation-circle" aria-hidden="true"></i>';
  var span = document.createElement("span");
  span.textContent = message;
  div.appendChild(span);
  box.appendChild(div);
}

function showFormFallback(form, lead) {
  var box = getStatusBox(form);
  box.innerHTML = "";
  var div = document.createElement("div");
  div.className = "form-error form-fallback";

  var p = document.createElement("p");
  p.innerHTML = "<strong>Sorry, your enquiry could not be sent online right now.</strong> ";
  p.appendChild(document.createTextNode("Please send it to us on WhatsApp (your details are already filled in) or call " + AB_PHONE_DISPLAY + "."));
  div.appendChild(p);

  var actions = document.createElement("div");
  actions.className = "form-fallback-actions";
  var wa = document.createElement("a");
  wa.className = "form-fallback-whatsapp";
  wa.href = leadWhatsAppLink(lead);
  wa.target = "_blank";
  wa.rel = "noopener";
  wa.innerHTML = '<i class="fa fa-whatsapp" aria-hidden="true"></i> Send on WhatsApp';
  var call = document.createElement("a");
  call.className = "form-fallback-call";
  call.href = "tel:" + AB_PHONE_LINK;
  call.innerHTML = '<i class="fa fa-phone" aria-hidden="true"></i> Call ' + AB_PHONE_DISPLAY;
  actions.appendChild(wa);
  actions.appendChild(call);
  div.appendChild(actions);
  box.appendChild(div);
}

function setButtonBusy(button, busy) {
  if (!button) return;
  if (busy) {
    button.disabled = true;
    if (button.tagName === "INPUT") {
      button.setAttribute("data-label", button.value);
      button.value = "Sending...";
    } else {
      button.setAttribute("data-label", button.innerHTML);
      button.innerHTML = '<i class="fa fa-spinner fa-spin" aria-hidden="true"></i> Sending...';
    }
  } else {
    button.disabled = false;
    var label = button.getAttribute("data-label");
    if (label !== null) {
      if (button.tagName === "INPUT") button.value = label;
      else button.innerHTML = label;
    }
  }
}

function fieldValue(form, name) {
  var field = form.querySelector('[name="' + name + '"]');
  return field ? String(field.value || "").trim() : "";
}

/**
 * Wires a form to the Google Sheet.
 * buildLead(form) returns the lead object, or a string error message when something is missing.
 */
function attachLeadForm(form, buildLead) {
  if (!form || form.getAttribute("data-lead-form") === "ready") return;
  form.setAttribute("data-lead-form", "ready");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var lead = buildLead(form);
    if (typeof lead === "string") {
      showFormError(form, lead);
      return;
    }
    if (lead.phone.replace(/[^0-9]/g, "").length < 10) {
      showFormError(form, "Please enter a valid 10-digit mobile number.");
      return;
    }
    lead.timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    var button = form.querySelector('[type="submit"]');
    getStatusBox(form).innerHTML = "";
    setButtonBusy(button, true);

    sendLeadToSheet(lead)
      .then(function () {
        window.location.href = "thank-you.html";
      })
      .catch(function (error) {
        if (window.console) console.error("Enquiry was not saved:", error);
        setButtonBusy(button, false);
        showFormFallback(form, lead);
      });
  });
}

/**
 * Service pages: initServiceEnquiryForm("led-signage-form", "LED Signages")
 */
function initServiceEnquiryForm(formId, serviceName) {
  attachLeadForm(document.getElementById(formId), function (form) {
    var lead = {
      service: serviceName,
      name: fieldValue(form, "name"),
      email: fieldValue(form, "email") || "Not provided",
      phone: fieldValue(form, "phone"),
      city: fieldValue(form, "city") || "Not specified",
      requirement: fieldValue(form, "requirement")
    };
    if (!lead.name || !lead.phone || !lead.requirement) {
      return "Please fill in all required fields (Name, Phone, Requirement).";
    }
    return lead;
  });
}

/** Home page quick enquiry strip */
function initHomeQuickForm() {
  attachLeadForm(document.getElementById("home-quick-form"), function (form) {
    var lead = {
      service: fieldValue(form, "service") || "General Requirement",
      name: fieldValue(form, "name"),
      email: "Not provided",
      phone: fieldValue(form, "phone"),
      city: fieldValue(form, "city") || "Not specified",
      requirement: fieldValue(form, "requirement")
    };
    if (!lead.name || !lead.phone || !lead.requirement) {
      return "Please fill in your Name, Phone Number and Requirement.";
    }
    return lead;
  });
}

/** Contact page form */
function initContactForm() {
  attachLeadForm(document.getElementById("feedback-form"), function (form) {
    var lead = {
      service: "Contact Us Page Enquiry",
      name: fieldValue(form, "name"),
      email: fieldValue(form, "email") || "Not provided",
      phone: fieldValue(form, "phone") || fieldValue(form, "website"),
      city: "Not specified",
      requirement: fieldValue(form, "message") || "General Enquiry"
    };
    if (!lead.name || !lead.phone) {
      return "Please fill in your Name and Mobile Number.";
    }
    return lead;
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    initContactForm();
    initHomeQuickForm();
  });
} else {
  initContactForm();
  initHomeQuickForm();
}
