export const injectVanillaLogic = (htmlContent) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  // 1. Create the Toggle Button HTML
  const toggleButtonHTML = `
    <button id="lang-toggle">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512" fill="currentColor">
            <path d="M352 256c0 22.2-1.2 44.3-3.3 66.2c-4.2-1.7-8.4-3.2-12.7-4.5c4.9-17.7 7.9-36.5 8-56.3l7.9-5.3zm16-26.6l-20.9 14.1c.3-21.6-4.5-42-13-60.8l20.8-17.3c9.3 22.9 14.9 44.8 13.1 64zM266.3 459.7c85.2-16.7 124.9-88.7 87.8-154.2c-47.5 35.8-109 23.9-141.7 15.6c23.2 59.9 12.1 118-29.8 147l83.7-8.4zm-147.2-22c26.9-31.5 25.4-86.8 5.7-133c-23.8-6.1-46.7-18.4-65.4-36.9c-26.9 83.2 4.1 146.5 59.7 170zM170.8 28.5c5.3 14 6.4 29.5-3.3 40.2l-21.7 24.3c35.6-26.1 82.5-34.5 127.3-24.1c16.2 3.8 33.1 9.9 50.1 18.2l12.7-27c-37.4-19.1-77.9-29.6-118-28.5L200.4 13l-29.6 15.5zm196.2 82c16.4 34.6 20.9 71.3 12.5 106.6l-6.8 29c-1.2-31.3-9.5-60.5-23.7-86.7l50.3-48.9 4.3 15.2l-36.6 35.6zM266.3 259.6c18.5 7.4 34.2 11.2 46.5 10.9l-5.6 18c-20 6.6-43.2 9.5-66.2 8.4l25.3-37.3zM250 215.3l-19.1 28.2c-35 51.5-84.4 75.3-138.8 66.8l7.5-32.9c37.5 10.1 76.5-10.7 100.9-46.5l49.5-15.6zM12.9 339c14 18.5 31.9 33.3 52.6 43.1c11.6 31.8 17 64 16.5 96.2c-48.6-24.5-83.8-73.8-82-130.6c.1-1.3 .2-2.6 .4-3.9l12.5 9.2zm331.3 75.6c23.7 19.8 45.4 37.7 6.4 56.4c-13.8 6.6-29.2 8.8-44.4 9.1l38-65.5z"/>
        </svg>
        <span id="lang-label">EN/AR</span>
    </button>
    `;

  // 2. The JS Logic
  // Niche edge case: In template strings inside JS files, </script> needs to be escaped or split
  // so it doesn't break the parent script if this code was embedded.
  const scriptLogic = `
    <script>
        (function() {
            const toggleBtn = document.getElementById('lang-toggle');
            const langLabel = document.getElementById('lang-label');
            const html = document.documentElement;
            
            // 1. Check LocalStorage
            const savedLang = localStorage.getItem('appLang') || 'en';
            applyLang(savedLang);

            // 2. Toggle Function
            if(toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    const currentLang = html.getAttribute('lang') || 'en';
                    const newLang = currentLang === 'en' ? 'ar' : 'en';
                    applyLang(newLang);
                    localStorage.setItem('appLang', newLang);
                });
            }

            function applyLang(lang) {
                html.setAttribute('lang', lang);
                html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
                if(langLabel) langLabel.textContent = lang === 'ar' ? 'العربية' : 'English';
            }
        })();
    </script>
    `;

  // 3. Inject
  const nav = doc.querySelector("nav");
  if (nav) {
    // Find existing list to append to, or just append to nav
    const ul = nav.querySelector("ul");
    if (ul) {
      const li = doc.createElement("li");
      li.innerHTML = toggleButtonHTML;
      ul.appendChild(li);
    } else {
      // Just append to nav
      const div = doc.createElement("div");
      div.innerHTML = toggleButtonHTML;
      div.style.display = "inline-block";
      nav.appendChild(div);
    }
  } else {
    // Fallback: Fixed position button
    const body = doc.body;
    const div = doc.createElement("div");
    div.style.position = "fixed";
    div.style.bottom = "20px";
    div.style.right = "20px";
    div.style.zIndex = "9999";
    div.innerHTML = toggleButtonHTML;
    body.appendChild(div);
  }

  // Append script to body

  // Convert back to string and append script manually string-manipulation style
  // to ensure it doesn't get sanitized out by some parsers
  let finalHTML = doc.documentElement.outerHTML;

  // Fix pure outerHTML missing doctype if needed, but usually we just want to replace the closing body
  if (finalHTML.includes("</body>")) {
    finalHTML = finalHTML.replace("</body>", `${scriptLogic}</body>`);
  } else {
    finalHTML += scriptLogic;
  }

  return finalHTML;
};
