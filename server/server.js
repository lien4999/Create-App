// Express Web Server & API Gateway for Google Play Auto Creator & Publisher
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { checkPackageAvailability } = require('./package-checker');
const { testPlayConnection, checkAppStatus, publishAppPackage } = require('./play-publisher');

const app = express();
const PORT = process.env.PORT || 3000;
const DEVELOPER_ID = process.env.DEVELOPER_ID || '8679275296222021944';

const KNOWN_APPS = [
  { name: 'جوكر بلس - شريك المطاعم', package: 'com.jokerpls.restaurantpartner' },
  { name: 'ALFA GATE - كورس الجيم والمدرب', package: 'com.alfagate.gym' },
  { name: 'دولار العراق', package: 'com.app.wrapper' }
];

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
    knownApps: KNOWN_APPS
  });
});

// 2. Check Package Name Availability on Google Play Store (Public)
app.post('/api/check-package', async (req, res) => {
  try {
    const { packageName } = req.body;
    if (!packageName) {
      return res.status(400).json({ error: 'اسم الحزمة مطلوب' });
    }

    const result = await checkPackageAvailability(packageName);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/check-package:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء فحص الحزمة' });
  }
});

// 2.1 Check if App Already Exists in the Connected Developer Account
app.all('/api/app-status/:packageName?', async (req, res) => {
  const pkg = (req.params.packageName || req.body.packageName || req.query.packageName || '').trim();
  if (!pkg) {
    return res.status(400).json({ error: 'اسم الحزمة مطلوب' });
  }

  // 1. Check with Google Play API
  let playStatus = { existsInAccount: false };
  try {
    playStatus = await checkAppStatus(pkg);
  } catch (_) {}

  // 2. Check if registered locally in knownApps list
  const localMatch = KNOWN_APPS.find(a => a.package.toLowerCase() === pkg.toLowerCase());

  if (playStatus && playStatus.existsInAccount) {
    return res.json({
      existsInAccount: true,
      source: 'google-play-api',
      name: playStatus.title || (localMatch ? localMatch.name : pkg),
      ...playStatus
    });
  }

  if (localMatch) {
    return res.json({
      existsInAccount: true,
      source: 'local-registry',
      name: localMatch.name,
      packageName: localMatch.package,
      title: localMatch.name,
      shortDescription: '',
      fullDescription: '',
      hasReleases: true
    });
  }

  return res.json({
    existsInAccount: false,
    packageName: pkg
  });
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

  if (!uploadedFile && !req.body.storeListingJson && !req.body.appDetailsJson) {
    cleanupFiles(files);
    return res.status(400).json({ error: 'لم يتم استلام ملف حزمة التطبيق أو بيانات التحديث' });
  }

  const {
    packageName,
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
      console.log(`[Server] تحديث بيانات بطاقة المتجر والمحتوى للحزمة: ${packageName}`);
    }

    const result = await publishAppPackage({
      filePath: uploadedFile ? uploadedFile.path : null,
      fileName: uploadedFile ? uploadedFile.originalname : null,
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
