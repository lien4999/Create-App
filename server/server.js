// Express Web Server & API Gateway for Google Play Auto Creator & Publisher
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { checkPackageAvailability } = require('./package-checker');
const { testPlayConnection, publishAppPackage } = require('./play-publisher');

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
  limits: { fileSize: 300 * 1024 * 1024 }, // 300MB limit for AAB/APK
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.aab' || ext === '.apk') {
      cb(null, true);
    } else {
      cb(new Error('الملف يجب أن يكون بصيغة AAB أو APK'));
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
    knownApps: [
      { name: 'ALFA GATE - كورس الجيم والمدرب', package: 'com.alfagate.gym' },
      { name: 'دولار العراق', package: 'com.app.wrapper' }
    ]
  });
});

// 2. Check Package Name Availability
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

// 3. Upload AAB/APK and Publish Directly to Google Play
app.post('/api/upload-package', upload.single('packageFile'), async (req, res) => {
  const uploadedFile = req.file;

  if (!uploadedFile) {
    return res.status(400).json({ error: 'لم يتم استلام أي ملف للرفع' });
  }

  const {
    packageName,
    track = 'internal',
    releaseNotes = 'تحديث جديد تم رفعه وفحصه عبر المنصة.',
    releaseStatus = 'completed'
  } = req.body;

  if (!packageName) {
    fs.unlink(uploadedFile.path, () => {});
    return res.status(400).json({ error: 'اسم الحزمة (Package Name) مطلوب للنشر' });
  }

  try {
    console.log(`[Server] استلام ملف: ${uploadedFile.originalname} (${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)`);

    const result = await publishAppPackage({
      filePath: uploadedFile.path,
      fileName: uploadedFile.originalname,
      packageName,
      track,
      releaseNotes,
      status: releaseStatus
    });

    fs.unlink(uploadedFile.path, () => {});
    res.json(result);
  } catch (error) {
    console.error('[Server] خطأ أثناء النشر:', error);
    fs.unlink(uploadedFile.path, () => {});
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
