import {test,expect} from '@playwright/test';
for(const language of ['es','en'] as const){
 test(`${language}: deployed mobile page, headers and required-field validation`,async({page},testInfo)=>{
  test.skip(process.env.MAC_LIVE_CHECK!=='true','Run manually after a verified deployment.');
  const prohibited:string[]=[];
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   // A live smoke test must never send contact mail or analytics hits.
   if(url.hostname.endsWith('.execute-api.us-east-2.amazonaws.com')||['google-analytics.com','googletagmanager.com','google.com'].some(host=>url.hostname===host||url.hostname.endsWith('.'+host))){
    prohibited.push(route.request().url());return route.abort();
   }
   return route.continue();
  });
  const response=await page.goto('https://mactecnologia.com.mx'+(language==='en'?'/en/':'/'));
  expect(response?.status()).toBe(200);
  expect(response?.headers()['content-security-policy']).toContain("object-src 'none'");
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  await expect(page.locator('html')).toHaveAttribute('lang',language);
  await expect(page.locator('.consent-panel')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('live-mobile-consent.png')});
  await page.locator('[data-consent="denied"]').tap();
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('.hero').screenshot({path:testInfo.outputPath('live-mobile-hero.png')});
  await page.locator('.hero-actions .button').tap();
  await page.locator('button[type="submit"]').tap();
  await expect(page.locator('[name="name"]')).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('[name="name"]')).toBeFocused();
  await expect.poll(()=>page.frames().some(frame=>new URL(frame.url()).origin==='https://challenges.cloudflare.com'),{timeout:15000}).toBe(true);
  await page.screenshot({path:testInfo.outputPath('live-mobile-form.png')});
  expect(prohibited).toEqual([]);
 });
}
