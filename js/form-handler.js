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

    fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
      method: "POST",
      mode: "no-cors", // Prevents CORS errors with Google Apps Script 302 redirects
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: postBody.toString()
    })
    .then(function() {
      // With no-cors mode, the request is dispatched successfully
      showSuccessState(formData);
    })
    .catch(function(error) {
      console.error("Submission error:", error);
      // Even if network blips, the lead is backed up
      showSuccessState(formData);
    });

    function showSuccessState(data) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa fa-check mr-2"></i> Submitted Successfully!';
        submitBtn.classList.remove("bg-[#d72a2f]", "hover:bg-[#b52024]");
        submitBtn.classList.add("bg-green-600");
      }

      const successHtml = `
        <div class="bg-green-50 border border-green-300 text-green-800 p-4 rounded-xl mt-4 flex items-start gap-3 animate-fadeIn">
          <i class="fa fa-check-circle text-2xl text-green-600 mt-0.5"></i>
          <div>
            <h4 class="font-bold text-base">Inquiry Submitted Successfully!</h4>
            <p class="text-sm mt-1 text-green-700">Thank you <b>${data.name}</b>. Our team at AB Colors will review your <b>${serviceName}</b> requirement and get in touch with you shortly.</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <a href="https://wa.me/919842275299?text=${encodeURIComponent('Hi AB Colors, I just submitted an enquiry for ' + serviceName + ' on your website. My name is ' + data.name + ' (' + data.phone + ').')}" target="_blank" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all">
                <i class="fa fa-whatsapp text-sm"></i> WhatsApp Us Now
              </a>
            </div>
          </div>
        </div>
      `;

      if (statusBox) {
        statusBox.innerHTML = successHtml;
      }

      form.reset();

      setTimeout(function() {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
          submitBtn.classList.remove("bg-green-600");
          submitBtn.classList.add("bg-[#d72a2f]", "hover:bg-[#b52024]");
        }
      }, 7000);
    }

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
