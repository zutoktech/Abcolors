/**
 * AB Colors - Service Enquiry Form Handler
 * Connects frontend forms to Google Sheets via Google Apps Script Web App
 * Google Sheet URL: https://docs.google.com/spreadsheets/d/1sY3JgpE1BXnGwiBOrlJXNE0wBH8BU24kJz5MXInJ-Uw/edit?usp=sharing
 */

// User's Google Apps Script Web App URL
// Once you deploy the Apps Script following our guide, paste your Web App URL here:
let GOOGLE_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzAbColorsServiceInquiry/exec";

// Allow overriding via window or localStorage
if (window.AB_COLORS_SCRIPT_URL) {
  GOOGLE_SCRIPT_WEB_APP_URL = window.AB_COLORS_SCRIPT_URL;
}

/**
 * Initializes and binds the enquiry form on any service page
 * @param {string} formId - HTML ID of the form element
 * @param {string} serviceName - Name of the service
 */
function initServiceEnquiryForm(formId, serviceName) {
  const form = document.getElementById(formId);
  if (!form) return;

  const statusBox = document.getElementById(formId + "-status");
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : "Submit Requirement";

  form.addEventListener("submit", function(e) {
    e.preventDefault();

    // Basic Validation
    const name = form.querySelector('[name="name"]')?.value.trim();
    const email = form.querySelector('[name="email"]')?.value.trim();
    const phone = form.querySelector('[name="phone"]')?.value.trim();
    const city = form.querySelector('[name="city"]')?.value.trim();
    const requirement = form.querySelector('[name="requirement"]')?.value.trim();

    if (!name || !phone || !requirement) {
      showStatus("Please fill in all required fields (Name, Phone, Requirement).", "error");
      return;
    }

    // Phone validation (simple 10 digit check)
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      showStatus("Please enter a valid 10-digit mobile number.", "error");
      return;
    }

    // Show loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> Submitting...';
    }

    // Prepare payload
    const formData = {
      timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      service: serviceName,
      name: name,
      email: email || "Not Provided",
      phone: phone,
      city: city || "Not Specified",
      requirement: requirement
    };

    // Save backup to LocalStorage
    try {
      const stored = JSON.parse(localStorage.getItem("ab_colors_leads") || "[]");
      stored.unshift(formData);
      localStorage.setItem("ab_colors_leads", JSON.stringify(stored.slice(0, 50)));
    } catch (err) {
      console.warn("LocalStorage backup failed", err);
    }

    // Post to Google Sheet Web App
    const postBody = new URLSearchParams();
    for (const key in formData) {
      postBody.append(key, formData[key]);
    }

    // Post to Google Sheet and redirect to Thank You page
    fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: postBody.toString()
    })
    .then(function() {
      // Redirect to Thank You page for conversion tracking
      window.location.href = "thank-you.html";
    })
    .catch(function(error) {
      console.error("Submission error:", error);
      // Even if network fails, lead is backed up in localStorage — still redirect
      window.location.href = "thank-you.html";
    });

    function showStatus(message, type) {
      if (!statusBox) return;
      if (type === "error") {
        statusBox.innerHTML = `
          <div class="bg-red-50 border border-red-300 text-red-800 p-3 rounded-lg mt-3 flex items-center gap-2 text-sm">
            <i class="fa fa-exclamation-circle text-red-600"></i>
            <span>${message}</span>
          </div>
        `;
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    }
  });
}

/**
 * Initializes the contact page feedback form if present
 */
function initContactForm() {
  const form = document.getElementById("feedback-form");
  if (!form) return;

  form.addEventListener("submit", function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    const name = form.querySelector('[name="name"]')?.value.trim() || "";
    const email = form.querySelector('[name="email"]')?.value.trim() || "";
    const phone = (form.querySelector('[name="website"]')?.value || form.querySelector('[name="phone"]')?.value || "").trim();
    const message = form.querySelector('[name="message"]')?.value.trim() || "";
    const submitBtn = form.querySelector('#submit') || form.querySelector('[type="submit"]');

    if (!name || !phone) {
      alert("Please fill in your Name and Mobile Number.");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      if (submitBtn.tagName === "INPUT") {
        submitBtn.value = "Sending...";
      } else {
        submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> Sending...';
      }
    }

    const formData = {
      timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      service: "Contact Us Page Enquiry",
      name: name,
      email: email || "Not Provided",
      phone: phone,
      city: "Trichy (Direct Contact)",
      requirement: message || "General Enquiry"
    };

    try {
      const stored = JSON.parse(localStorage.getItem("ab_colors_leads") || "[]");
      stored.unshift(formData);
      localStorage.setItem("ab_colors_leads", JSON.stringify(stored.slice(0, 50)));
    } catch (err) {}

    const postBody = new URLSearchParams();
    for (const key in formData) {
      postBody.append(key, formData[key]);
    }

    fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: postBody.toString()
    })
    .then(function() {
      window.location.href = "thank-you.html";
    })
    .catch(function(error) {
      console.error("Submission error:", error);
      window.location.href = "thank-you.html";
    });
  }, true);
}

/**
 * Initializes the home page quick enquiry form if present
 */
function initHomeQuickForm() {
  const form = document.getElementById("home-quick-form");
  if (!form) return;

  form.addEventListener("submit", function(e) {
    e.preventDefault();

    const name = form.querySelector('[name="name"]')?.value.trim();
    const phone = form.querySelector('[name="phone"]')?.value.trim();
    const service = form.querySelector('[name="service"]')?.value || "General Requirement";
    const city = form.querySelector('[name="city"]')?.value.trim();
    const requirement = form.querySelector('[name="requirement"]')?.value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!name || !phone || !requirement) {
      alert("Please fill in Name, Phone Number, and Requirement.");
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> Submitting...';
    }

    const formData = {
      timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      service: service,
      name: name,
      email: "Not Provided (Home Quick Form)",
      phone: phone,
      city: city || "Trichy / Tamil Nadu",
      requirement: requirement
    };

    try {
      const stored = JSON.parse(localStorage.getItem("ab_colors_leads") || "[]");
      stored.unshift(formData);
      localStorage.setItem("ab_colors_leads", JSON.stringify(stored.slice(0, 50)));
    } catch (err) {}

    const postBody = new URLSearchParams();
    for (const key in formData) {
      postBody.append(key, formData[key]);
    }

    fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: postBody.toString()
    })
    .then(function() {
      window.location.href = "thank-you.html";
    })
    .catch(function(error) {
      console.error("Submission error:", error);
      window.location.href = "thank-you.html";
    });
  });
}

// Auto-run on DOMContentLoaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function() {
    initContactForm();
    initHomeQuickForm();
  });
} else {
  initContactForm();
  initHomeQuickForm();
}

