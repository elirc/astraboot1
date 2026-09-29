import {defineConfig} from '@playwright/test';
const cache=process.env.LOCALAPPDATA+'/ms-playwright';const existing=process.env.USE_EXISTING_BROWSERS==='1';
export default defineConfig({testDir:'e2e',timeout:120000,expect:{timeout:20000},use:{baseURL:'http://127.0.0.1:5185',viewport:{width:360,height:780},...(existing?{launchOptions:{executablePath:cache+'/chromium-1243/chrome-win64/chrome.exe'}}:{})},webServer:{command:'node node_modules/vite/bin/vite.js --host 127.0.0.1',url:'http://127.0.0.1:5185',reuseExistingServer:false,timeout:120000}});
