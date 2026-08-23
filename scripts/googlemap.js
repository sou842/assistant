let page;
try {
  // Open Google Maps
  page = await browser.newPage('https://www.google.com/maps?hl=en');

  // Wait for either the consent dialog OR the search box — whichever shows first
  await page.waitForLoadState?.('domcontentloaded').catch(() => {});
  await page.waitForTimeout(2000);

  // --- Handle Google consent/cookie screen if it appears ---
  const consentSelectors = [
    'button:has-text("Accept all")',
    'button:has-text("I agree")',
    'form[action*="consent"] button',
    'button[aria-label="Accept all"]'
  ];

  for (const sel of consentSelectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 3000 })) {
        await btn.click();
        console.log(`Clicked consent button: ${sel}`);
        await page.waitForTimeout(2000);
        break;
      }
    } catch (e) {
      // selector not found, try next
    }
  }

  // --- Wait for search box with fallback selectors ---
  const searchBoxSelectors = [
    'input[name="q"]',
    'input[aria-label="Search Google Maps"]'
  ];

  let searchBox = null;
  for (const sel of searchBoxSelectors) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 10000 });
      searchBox = el;
      console.log(`Found search box using: ${sel}`);
      break;
    } catch (e) {
      console.log(`Search box selector failed: ${sel}`);
    }
  }

  if (!searchBox) {
    throw new Error('Could not locate Google Maps search box after trying all selectors (consent screen or layout change likely).');
  }

  // Type the query and search
  await searchBox.click();
  const query = (__inputs && __inputs.search_query) || "hotels in New York";
  await searchBox.fill(query);
  
  // Click search button to close suggestion dropdown and trigger search
  const searchButton = page.locator('button.mL3xi, button[aria-label="Search"], button#searchbox-searchbutton');
  await searchButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  try {
    await searchButton.click();
  } catch (e) {
    await page.keyboard.press('Enter');
  }
 
  // Wait for results panel
  const resultsFeed = page.locator('div[role="feed"]');
  await resultsFeed.waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(3000);
 
  const MAX_RESULTS = __inputs.max_results || 100;
 
  // Scroll the results panel to load more results
  let previousCount = 0;
  
  // Get initial results count
  let currentCount = await page.evaluate(() => {
    const getFeed = () => {
      let f = document.querySelector('div[role="feed"]');
      if (f && f.scrollHeight > f.clientHeight) return f;
      return Array.from(document.querySelectorAll('div')).find(el => {
        const s = window.getComputedStyle(el);
        return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
      });
    };
    const feed = getFeed();
    const items = feed ? feed.querySelectorAll('div.Nv2PK') : document.querySelectorAll('div.Nv2PK');
    return items.length;
  });
  
  const maxScrolls = 40;
  let scrollCount = 0;
  let reachedEnd = false;
 
  while (scrollCount < maxScrolls && currentCount < MAX_RESULTS && !reachedEnd) {
    previousCount = currentCount;
 
    // Scroll container and scroll last item into view to trigger lazy loading
    await page.evaluate(() => {
      const getFeed = () => {
        let f = document.querySelector('div[role="feed"]');
        if (f && f.scrollHeight > f.clientHeight) return f;
        return Array.from(document.querySelectorAll('div')).find(el => {
          const s = window.getComputedStyle(el);
          return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        });
      };
      const feed = getFeed();
      if (feed) {
        feed.scrollTop = feed.scrollHeight;
        feed.dispatchEvent(new Event('scroll', { bubbles: true }));
      }
      
      const cards = document.querySelectorAll('div.Nv2PK');
      if (cards.length > 0) {
        cards[cards.length - 1].scrollIntoView({ behavior: 'instant' });
      }
    });
 
    await page.waitForTimeout(2500);
 
    const state = await page.evaluate(() => {
      const getFeed = () => {
        let f = document.querySelector('div[role="feed"]');
        if (f && f.scrollHeight > f.clientHeight) return f;
        return Array.from(document.querySelectorAll('div')).find(el => {
          const s = window.getComputedStyle(el);
          return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        });
      };
      const feed = getFeed();
      const items = feed ? feed.querySelectorAll('div.Nv2PK') : document.querySelectorAll('div.Nv2PK');
      const endMarker = feed ? feed.innerText.includes("You've reached the end of the list") : false;
      return { count: items.length, endMarker };
    });
 
    currentCount = state.count;
    reachedEnd = state.endMarker;
 
    console.log(`Scroll ${scrollCount + 1}: results = ${currentCount}, end reached = ${reachedEnd}`);
 
    if (currentCount === previousCount && !reachedEnd) {
      // If count didn't change, wait a bit longer, try scrollIntoView again, and check before breaking
      await page.waitForTimeout(2000);
      await page.evaluate(() => {
        const getFeed = () => {
          let f = document.querySelector('div[role="feed"]');
          if (f && f.scrollHeight > f.clientHeight) return f;
          return Array.from(document.querySelectorAll('div')).find(el => {
            const s = window.getComputedStyle(el);
            return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
          });
        };
        const feed = getFeed();
        if (feed) {
          feed.scrollTop = feed.scrollHeight;
          feed.dispatchEvent(new Event('scroll', { bubbles: true }));
        }
        
        const cards = document.querySelectorAll('div.Nv2PK');
        if (cards.length > 0) {
          cards[cards.length - 1].scrollIntoView({ behavior: 'instant' });
        }
      });
      await page.waitForTimeout(2000);
      
      const retryState = await page.evaluate(() => {
        const getFeed = () => {
          let f = document.querySelector('div[role="feed"]');
          if (f && f.scrollHeight > f.clientHeight) return f;
          return Array.from(document.querySelectorAll('div')).find(el => {
            const s = window.getComputedStyle(el);
            return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
          });
        };
        const feed = getFeed();
        const items = feed ? feed.querySelectorAll('div.Nv2PK') : document.querySelectorAll('div.Nv2PK');
        return items.length;
      });
      
      if (retryState === previousCount) {
        console.log("No new results loaded after scroll retry. Stopping.");
        break;
      }
      currentCount = retryState;
    }
 
    scrollCount++;
  }

  // Extract data
  const placeDetails = await page.evaluate((max) => {
    const results = [];
    const items = document.querySelectorAll('div.Nv2PK');

    items.forEach((el, idx) => {
      if (idx >= max) return;

      const nameEl = el.querySelector('div.qBF1Pd, .fontHeadlineSmall');
      const name = nameEl ? nameEl.innerText.trim() : null;

      const linkEl = el.querySelector('a.hfpxzc');
      const url = linkEl ? linkEl.href : null;

      const ratingEl = el.querySelector('span.MW4etd');
      const rating = ratingEl ? ratingEl.innerText.trim() : null;

      const reviewsEl = el.querySelector('span.UY7F9');
      const reviews = reviewsEl ? reviewsEl.innerText.replace(/[()]/g, '').trim() : null;

      const infoDivs = el.querySelectorAll('div.W4Efsd > span');
      const infoText = Array.from(infoDivs).map(s => s.innerText.trim()).filter(Boolean);

      const thumbnailImg = el.querySelector('img');
      const thumbnail = thumbnailImg ? thumbnailImg.getAttribute('src') : null;

      if (name && url) {
        results.push({ name, url, rating, reviews, info: infoText, thumbnail });
      }
    });

    return results;
  }, MAX_RESULTS);

  return { success: true, count: placeDetails.length, data: placeDetails };

} catch (error) {
  return { success: false, error: error.message };
}