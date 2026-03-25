const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Go to app
  await page.goto('http://localhost:3000');
  
  // Wait for React to load
  await page.waitForTimeout(5000);
  
  // Evaluate the crops filter state from the DOM or map layer
  const visibleCrops = await page.evaluate(() => {
    // Attempt to get the map object
    if (window.mapboxMap && window.mapboxMap.getLayer('feedstock-vector-layer')) {
      const filter = window.mapboxMap.getFilter('feedstock-vector-layer');
      return filter;
    }
    return null;
  });
  
  console.log("Map filter:", JSON.stringify(visibleCrops, null, 2));
  
  await browser.close();
})();
