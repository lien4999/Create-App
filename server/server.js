// Express Web Server & API Gateway for Google Play Auto Creator & Publisher
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { checkPackageAvailability } = require('./package-checker');
const {
  testPlayConnection,
  inspectExistingAppInAccount,
  publishAppPackage
} = require('./play-publisher');

const app = express();
const PORT = process.env.PORT || 3000;
const DEVELOPER_ID = process.env.DEVELOPER_ID || '8679275296222021944';

// Setup upload directory
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 }, // 300MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.aab', '.apk', '.png', '.jpg', '.jpeg', '.webp'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('صيغة الملف غير مدعومة'));
    }
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const KNOWN_ACCOUNT_APPS = [
  { name: 'ALFA GATE - كورس الجيم والمدرب', package: 'com.alfagate.gym' },
  { name: 'دولار العراق', package: 'com.app.wrapper' },
  { name: 'جوكر بلس - شريك المطاعم', package: 'com.jokerpls.restaurantpartner' }
];

// 1. Developer Account & Service Account Status
app.get('/api/account-info', async (req, res) => {
  const serviceAccountExists = Boolean(process.env.SERVICE_ACCOUNT_JSON) || fs.existsSync(path.join(__dirname, 'service-account.json'));
  let connectionStatus = { connected: false };

  if (serviceAccountExists) {
    connectionStatus = await testPlayConnection();
  }

  res.json({
    developerId: DEVELOPER_ID,
    organizationName: 'Erik Jarem',
    serviceAccountConfigured: serviceAccountExists,
    serviceEmail: 'play-api-access@play-api-513517.iam.gserviceaccount.com',
    connection: connectionStatus,
    knownApps: KNOWN_ACCOUNT_APPS
  });
});

// 2. Check Package Name Availability & Account Existence
app.post('/api/check-package', async (req, res) => {
  try {
    const { packageName } = req.body;
    if (!packageName) {
      return res.status(400).json({ error: 'اسم الحزمة مطلوب' });
    }

    const result = await checkPackageAvailability(packageName);
    const accountCheck = await inspectExistingAppInAccount(packageName);
    const isKnownInAccount = KNOWN_ACCOUNT_APPS.some(a => a.package.toLowerCase() === packageName.toLowerCase());

    res.json({
      ...result,
      existsInAccount: accountCheck.existsInAccount || isKnownInAccount,
      accountAppState: accountCheck.existsInAccount ? accountCheck : null
    });
  } catch (error) {
    console.error('Error in /api/check-package:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء فحص الحزمة' });
  }
});

// 2b. Inspect Existing App in Developer Account (Fetches completed steps & metadata)
app.post('/api/inspect-app', async (req, res) => {
  try {
    const { packageName, appName } = req.body;
    if (!packageName) {
      return res.status(400).json({ error: 'اسم الحزمة مطلوب' });
    }

    const accountState = await inspectExistingAppInAccount(packageName);
    const matchedKnown = KNOWN_ACCOUNT_APPS.find(
      a => a.package.toLowerCase() === packageName.toLowerCase() ||
           (appName && a.name.toLowerCase() === appName.trim().toLowerCase())
    );

    if (accountState.existsInAccount) {
      return res.json(accountState);
    }

    // Fallback if recognized in known account apps list
    if (matchedKnown) {
      return res.json({
        existsInAccount: true,
        packageName: matchedKnown.package,
        hasBundle: false,
        latestVersionCode: null,
        details: { defaultLanguage: 'ar' },
        listing: { title: matchedKnown.name, shortDescription: '', fullDescription: '' },
        images: { iconCount: 0, featureGraphicCount: 0, screenshotsCount: 0 },
        completedStepsOnConsole: [1],
        nextRemainingStep: 2
      });
    }

    res.json({
      existsInAccount: false,
      packageName
    });
  } catch (error) {
    console.error('Error in /api/inspect-app:', error);
    res.status(500).json({ existsInAccount: false, error: error.message });
  }
});

// Helper to clean up uploaded temp files
function cleanupFiles(filesObj) {
  if (!filesObj) return;
  Object.values(filesObj).forEach(fileArr => {
    if (Array.isArray(fileArr)) {
      fileArr.forEach(f => {
        if (f && f.path) fs.unlink(f.path, () => {});
      });
    }
  });
}

// 3. Upload AAB/APK + Store Listing + Graphics and Publish Directly to Google Play
const multiUpload = upload.fields([
  { name: 'packageFile', maxCount: 1 },
  { name: 'iconFile', maxCount: 1 },
  { name: 'featureGraphicFile', maxCount: 1 },
  { name: 'screenshotFiles', maxCount: 8 }
]);

app.post('/api/upload-package', multiUpload, async (req, res) => {
  const files = req.files || {};
  const uploadedFile = files.packageFile ? files.packageFile[0] : null;

  const {
    packageName,
    existingVersionCode,
    track = 'internal',
    releaseNotes = 'تحديث جديد تم رفعه وفحصه عبر المنصة.',
    releaseStatus = 'completed',
    storeListingJson,
    appDetailsJson
  } = req.body;

  if (!packageName) {
    cleanupFiles(files);
    return res.status(400).json({ error: 'اسم الحزمة (Package Name) مطلوب للنشر' });
  }

  if (!uploadedFile && !existingVersionCode) {
    cleanupFiles(files);
    return res.status(400).json({ error: 'لم يتم استلام ملف حزمة التطبيق (.aab أو .apk)' });
  }

  let storeListing = null;
  let appDetails = null;

  try {
    if (storeListingJson) storeListing = JSON.parse(storeListingJson);
  } catch (_) {}

  try {
    if (appDetailsJson) appDetails = JSON.parse(appDetailsJson);
  } catch (_) {}

  try {
    if (uploadedFile) {
      console.log(`[Server] استلام ملف: ${uploadedFile.originalname} (${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      console.log(`[Server] تحديث تطبيق موجود بالحساب (${packageName}) بالإصدار رقم: ${existingVersionCode}`);
    }

    const result = await publishAppPackage({
      filePath: uploadedFile ? uploadedFile.path : null,
      fileName: uploadedFile ? uploadedFile.originalname : '',
      existingVersionCode: existingVersionCode || null,
      packageName,
      track,
      releaseNotes,
      status: releaseStatus,
      storeListing,
      appDetails,
      imageFiles: {
        icon: files.iconFile || null,
        featureGraphic: files.featureGraphicFile || null,
        screenshots: files.screenshotFiles || null
      }
    });

    cleanupFiles(files);
    res.json(result);
  } catch (error) {
    console.error('[Server] خطأ أثناء النشر:', error);
    cleanupFiles(files);
    res.status(500).json({
      error: error.message || 'فشلت عملية النشر إلى Google Play',
      details: error.errors || []
    });
  }
});

// 4. Create App Endpoint (Lazy loads automation if requested)
app.post('/api/create-app', async (req, res) => {
  try {
    const { createGooglePlayApp } = require('./automation');
    const {
      appName,
      packageName,
      defaultLanguage,
      appType,
      appPrice,
      developerId
    } = req.body;

    if (!appName || !packageName) {
      return res.status(400).json({ error: 'اسم التطبيق واسم الحزمة مطلوبان' });
    }

    const result = await createGooglePlayApp({
      appName,
      packageName,
      defaultLanguage,
      appType,
      appPrice,
      developerId: developerId || DEVELOPER_ID,
      onLog: (msg) => console.log(`[Playwright Worker] ${msg}`)
    });

    res.json(result);
  } catch (error) {
    console.error('Error in /api/create-app:', error);
    res.status(500).json({ error: error.message || 'فشلت أتمتة إنشاء التطبيق' });
  }
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🎉 تم تشغيل خادم Google Play Console Platform بنجاح!`);
  console.log(`🌐 الواجهة متاحة على: http://localhost:${PORT}`);
  console.log(`🔑 حساب المطور المرتبط: ${DEVELOPER_ID} (Erik Jarem)`);
  console.log(`======================================================\n`);
});
