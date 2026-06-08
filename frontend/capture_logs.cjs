const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}) // Mock empty response
        });
      } else {
        request.continue();
      }
    });

    page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    // Setup fake token so it stays logged in
    await page.goto('http://localhost:9613', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
        localStorage.setItem('token', 'fake_token');
        localStorage.setItem('user_role', 'admin');
        localStorage.setItem('activeTab', 'gate_control'); // FORCE IT TO LOAD GATE CONTROL!
    });
    
    await page.reload({ waitUntil: 'networkidle0', timeout: 15000 }).catch(e => console.log('RELOAD ERROR:', e.message));
    
    const rootHTML = await page.evaluate(() => {
        const root = document.getElementById('root');
        return root ? root.innerHTML : 'No #root element found';
    });
    
    console.log('ROOT HTML:', rootHTML);
    
    await browser.close();
  } catch(e) {
    console.error("Puppeteer Error:", e);
  }
})();
