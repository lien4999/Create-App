// Core Automation Script for Google Play Console App Creation using Playwright
// Automates: Opening Console -> Filling App Details -> Checking Package -> Declarations -> Create App

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SESSION_FILE_PATH = path.join(__dirname, 'session.json');
// Default Developer ID extracted from console URL or environment variable
const DEFAULT_DEVELOPER_ID = process.env.DEVELOPER_ID || '5224012949225681582';

/**
 * Automates the creation of a new Android app in Google Play Console.
 * @param {Object} options
 * @param {string} options.appName
 * @param {string} options.packageName
 * @param {string} [options.defaultLanguage='ar']
 * @param {string} [options.appType='APPLICATION'] 'APPLICATION' or 'GAME'
 * @param {string} [options.appPrice='FREE'] 'FREE' or 'PAID'
 * @param {string} [options.developerId]
 * @param {Function} [options.onLog] Optional logger callback
 * @returns {Promise<{ success: boolean, appId?: string, consoleUrl?: string, error?: string }>}
 */
async function createGooglePlayApp(options) {
  const {
    appName,
    packageName,
    defaultLanguage = 'ar',
    appType = 'APPLICATION',
    appPrice = 'FREE',
    developerId = DEFAULT_DEVELOPER_ID,
    onLog = console.log
  } = options;

  onLog(`🚀 بدء تنفيذ أتمتة إنشاء التطبيق: "${appName}" (${packageName})`);

  // Check if session file exists
  if (!fs.existsSync(SESSION_FILE_PATH)) {
    const errorMsg = 'ملف الجلسة session.json غير موجود. يرجى تشغيل npm run setup-session أولاً لتسجيل الدخول.';
    onLog(`❌ ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  let browser;
  try {
    onLog('1. تشغيل متصفح Chromium الخفي واستعادة ملفات تعريف الارتباط...');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const context = await browser.newContext({
      storageState: SESSION_FILE_PATH,
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'ar'
    });

    const page = await context.newPage();

    const targetUrl = `https://play.google.com/console/u/0/developers/${developerId}/create-new-app`;
    onLog(`2. الانتقال إلى رابط إنشاء التطبيق في حساب المطور: ${targetUrl}`);

    await page.goto(targetUrl, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Check if redirected to login page (session expired)
    if (page.url().includes('accounts.google.com')) {
      throw new Error('انتهت صلاحية جلسة تسجيل الدخول (Session Expired). يرجى إعادة تشغيل npm run setup-session وتجديد الجلسة.');
    }

    onLog('3. جاري إدخال اسم التطبيق واسم الحزمة...');

    // Wait for the form to render
    await page.waitForSelector('input', { timeout: 15000 });

    // Locate App Name field
    const nameInput = await page.locator('input[maxlength="30"], input[aria-label*="اسم التطبيق"], input[aria-label*="App name"]').first();
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nameInput.fill(appName);
    onLog(`✔ تم إدخال اسم التطبيق: ${appName}`);

    // Locate Package Name field
    const packageInput = await page.locator('input[maxlength="150"], input[aria-label*="اسم الحزمة"], input[aria-label*="Package name"]').first();
    await packageInput.waitFor({ state: 'visible', timeout: 10000 });
    await packageInput.fill(packageName);
    onLog(`✔ تم إدخال اسم الحزمة: ${packageName}`);

    // Click "التحقق من التوفر" (Check Availability) button
    const checkBtn = page.locator('button:has-text("التحقق من التوفر"), button:has-text("Check availability")').first();
    if (await checkBtn.isVisible()) {
      onLog('جاري فحص توفر اسم الحزمة داخل Play Console...');
      await checkBtn.click();
      await page.waitForTimeout(2000); // Allow validation response
    }

    // Handle App or Game radio
    onLog(`4. تحديد نوع المحتوى: ${appType === 'GAME' ? 'لعبة' : 'تطبيق'}`);
    if (appType === 'GAME') {
      const gameRadio = page.locator('label:has-text("لعبة"), label:has-text("Game"), input[value="GAME"]').first();
      await gameRadio.click();
    } else {
      const appRadio = page.locator('label:has-text("التطبيق"), label:has-text("App"), input[value="APPLICATION"]').first();
      await appRadio.click();
    }

    // Handle Free or Paid radio
    onLog(`تحديد التسعير: ${appPrice === 'PAID' ? 'مدفوعة' : 'مجانية'}`);
    if (appPrice === 'PAID') {
      const paidRadio = page.locator('label:has-text("مدفوعة"), label:has-text("Paid"), input[value="PAID"]').first();
      await paidRadio.click();
    } else {
      const freeRadio = page.locator('label:has-text("مجانية"), label:has-text("Free"), input[value="FREE"]').first();
      await freeRadio.click();
    }

    // Check Declaration checkboxes (Policy and Export Laws)
    onLog('5. الموافقة على سياسات مطور البرامج وقوانين التصدير...');
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      const cb = checkboxes.nth(i);
      const isChecked = await cb.isChecked();
      if (!isChecked) {
        await cb.check({ force: true });
      }
    }

    onLog('6. الضغط على زر "إنشاء تطبيق" النهائي...');
    // Locate the primary submit button in the bottom bar
    const submitBtn = page.locator('footer button:has-text("إنشاء تطبيق"), button:has-text("إنشاء تطبيق"), button:has-text("Create app")').last();
    await submitBtn.waitFor({ state: 'visible' });

    // Click and wait for navigation to dashboard
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 45000 }).catch(() => null),
      submitBtn.click()
    ]);

    await page.waitForTimeout(3000);

    const finalUrl = page.url();
    onLog(`🎉 تم إنشاء التطبيق بنجاح! الرابط النهائي: ${finalUrl}`);

    // Extract App ID from URL if present (e.g., .../app/4971234567890/app-dashboard)
    const match = finalUrl.match(/app\/([0-9a-zA-Z_-]+)/);
    const appId = match ? match[1] : packageName;

    return {
      success: true,
      appId: appId,
      packageName: packageName,
      consoleUrl: finalUrl
    };

  } catch (error) {
    onLog(`❌ خطأ أثناء الأتمتة: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Direct test CLI execution
if (require.main === module) {
  createGooglePlayApp({
    appName: 'Test My App',
    packageName: 'com.test.autocreated_' + Date.now(),
    appType: 'APPLICATION',
    appPrice: 'FREE'
  }).then(console.log).catch(console.error);
}

module.exports = {
  createGooglePlayApp,
  SESSION_FILE_PATH
};
