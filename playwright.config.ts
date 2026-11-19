import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./browser-tests',fullyParallel:true,forbidOnly:!!process.env.CI,retries:0,
 reporter:'list',use:{trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'android-chromium',use:{...devices['Pixel 7'],browserName:'chromium'}},
  {name:'iphone-webkit',use:{...devices['iPhone 13'],browserName:'webkit'}}
 ]
});
