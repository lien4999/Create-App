// One-Time Session Setup Script for Google Play Console
// Run this once with: npm run setup-session
// This opens a browser window so you can sign in to your Google Play Console account.
// Once you log in, it saves your authenticated session into session.json.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SESSION_FILE_PATH = path.join(__dirname, 'session.json');

async function setupSession() {
  console.log('====================================================');
  console.log('🚀 بدء إعداد وتخزين جلسة Google Play Console');
  console.log('====================================================');
  console.log('1. سيتم الآن فتح متصفح Chrome.');
  console.log('2. سجّل الدخول إلى حسابك في Google Play Console كالمعتاد.');
  console.log('3. أكمل التحقق بخطوتين (2-Step Verification) إذا طُلب منك.');
  console.log('4. بمجرد فتح صفحة حساب المطور الرئيسية، سيتم حفظ الجلسة تلقائياً.');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome', // Use local Chrome if available, fallback to bundled chromium
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  }).catch(() => {
    // Fallback if system Chrome channel is not found
    return chromium.launch({
      headless: false,
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ]
    });
  });

  const context = await browser.newContext({
    viewport: null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  console.log('جاري التوجيه إلى Google Play Console...');
  await page.goto('https://play.google.com/console', { waitUntil: 'domcontentloaded' });

  console.log('في انتظار تسجيل الدخول بنجاح...');

  // Wait until the user has successfully reached the developer console dashboard
  try {
    await page.waitForURL(/play\.google\.com\/console\/u\/\d+\/developers/i, {
      timeout: 300000 // 5 minutes timeout to allow user to enter credentials and 2FA
    });

    console.log('✔ تم رصد تسجيل الدخول بنجاح إلى حساب المطور!');

    // Wait 3 seconds to let all session cookies and tokens settle
    await page.waitForTimeout(3000);

    // Save session storage state
    await context.storageState({ path: SESSION_FILE_PATH });

    console.log(`✔ تم حفظ ملف الجلسة بنجاح في: ${SESSION_FILE_PATH}`);
    console.log('🎉 الآن يمكن لمحرك الأتمتة إنشاء التطبيقات في حسابك تلقائياً دون الحاجة لتسجيل الدخول في كل مرة!');

  } catch (error) {
    console.error('❌ انتهت مهلة الانتظار أو حدث خطأ أثناء تسجيل الدخول:', error.message);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  setupSession();
}

module.exports = { setupSession, SESSION_FILE_PATH };
