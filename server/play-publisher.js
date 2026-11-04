// Google Play Developer API Integration Service
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
const DECLARATIONS_STORE_PATH = path.join(__dirname, 'app-declarations.json');

function loadAllSavedDeclarations() {
  try {
    if (fs.existsSync(DECLARATIONS_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(DECLARATIONS_STORE_PATH, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function getSavedAppDeclarations(packageName) {
  if (!packageName) return null;
  const all = loadAllSavedDeclarations();
  return all[packageName.trim().toLowerCase()] || null;
}

function saveAppDeclarations(packageName, data) {
  if (!packageName || !data) return;
  try {
    const all = loadAllSavedDeclarations();
    const key = packageName.trim().toLowerCase();
    all[key] = {
      ...(all[key] || {}),
      ...data,
      updatedAt: Date.now()
    };
    fs.writeFileSync(DECLARATIONS_STORE_PATH, JSON.stringify(all, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not save app declarations:', err.message);
  }
}

function getPlayClient() {
  let auth;

  // 1. Check if provided via Environment Variable (ideal for cloud hosting like Render/Koyeb)
  if (process.env.SERVICE_ACCOUNT_JSON) {
    try {
      const credentials = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
      });
    } catch (parseErr) {
      throw new Error('خطأ في قراءة متغير البيئة SERVICE_ACCOUNT_JSON: ' + parseErr.message);
    }
  } 
  // 2. Check if local file exists
  else if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_PATH,
      scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
  } else {
    throw new Error('ملف الاعتماد service-account.json غير موجود ولا يوجد متغير بيئة SERVICE_ACCOUNT_JSON');
  }

  return google.androidpublisher({ version: 'v3', auth });
}

/**
 * Checks connection to Google Play API
 */
async function testPlayConnection(packageName = 'com.alfagate.gym') {
  try {
    const play = getPlayClient();
    const edit = await play.edits.insert({ packageName });
    const editId = edit.data.id;
    await play.edits.delete({ packageName, editId });
    return {
      connected: true,
      serviceEmail: 'play-api-access@play-api-513517.iam.gserviceaccount.com',
      testPackage: packageName,
      status: 'نشط وصالح 100%'
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      details: error.errors || []
    };
  }
}

/**
 * Inspects if a package already exists in the developer account and fetches its current state
 * (bundles, details, store listings, images, tracks) so the user can jump directly to remaining steps.
 */
async function inspectExistingAppInAccount(packageName) {
  try {
    const play = getPlayClient();
    const edit = await play.edits.insert({ packageName });
    const editId = edit.data.id;

    let hasBundle = false;
    let latestVersionCode = null;
    let latestSha256 = null;
    let details = {};
    let listing = {};
    let images = { iconCount: 0, featureGraphicCount: 0, screenshotsCount: 0 };

    try {
      const bundlesRes = await play.edits.bundles.list({ packageName, editId });
      const bundles = bundlesRes.data.bundles || [];
      if (bundles.length > 0) {
        hasBundle = true;
        const lastBundle = bundles[bundles.length - 1];
        latestVersionCode = lastBundle.versionCode;
        latestSha256 = lastBundle.sha256;
      }
    } catch (_) {}

    if (!hasBundle) {
      try {
        const apksRes = await play.edits.apks.list({ packageName, editId });
        const apks = apksRes.data.apks || [];
        if (apks.length > 0) {
          hasBundle = true;
          const lastApk = apks[apks.length - 1];
          latestVersionCode = lastApk.versionCode;
          latestSha256 = lastApk.binary?.sha256;
        }
      } catch (_) {}
    }

    try {
      const detailsRes = await play.edits.details.get({ packageName, editId });
      details = detailsRes.data || {};
    } catch (_) {}

    const defaultLang = details.defaultLanguage || 'ar';

    try {
      const listingsRes = await play.edits.listings.list({ packageName, editId });
      const listings = listingsRes.data.listings || [];
      if (listings.length > 0) {
        const matched = listings.find(l => l.language === defaultLang) || listings[0];
        listing = {
          language: matched.language,
          title: matched.title || '',
          shortDescription: matched.shortDescription || '',
          fullDescription: matched.fullDescription || ''
        };
      }
    } catch (_) {}

    const imgLang = listing.language || defaultLang;
    try {
      const iconRes = await play.edits.images.list({ packageName, editId, language: imgLang, imageType: 'icon' });
      images.iconCount = (iconRes.data.images || []).length;
    } catch (_) {}

    try {
      const fgRes = await play.edits.images.list({ packageName, editId, language: imgLang, imageType: 'featureGraphic' });
      images.featureGraphicCount = (fgRes.data.images || []).length;
    } catch (_) {}

    try {
      const shotsRes = await play.edits.images.list({ packageName, editId, language: imgLang, imageType: 'phoneScreenshots' });
      images.screenshotsCount = (shotsRes.data.images || []).length;
    } catch (_) {}

    await play.edits.delete({ packageName, editId }).catch(() => {});

    const savedDeclarations = getSavedAppDeclarations(packageName) || {};

    // Determine which steps are already completed on Google Play Console & Platform
    const completedStepsOnConsole = [1]; // Step 1 (App creation) is definitely done since package exists in account
    if (hasBundle) {
      completedStepsOnConsole.push(2); // Step 2 (Bundle upload) is already done
    }
    if (savedDeclarations.privacyPolicyUrl || details.contactEmail || details.contactWebsite) {
      completedStepsOnConsole.push(3);
    }
    if (details.contactEmail || savedDeclarations.contactEmail) {
      completedStepsOnConsole.push(4);
    }
    if (listing.title && listing.shortDescription && listing.fullDescription) {
      completedStepsOnConsole.push(5);
    }

    // Find the first remaining incomplete step (between 2 and 6)
    let nextRemainingStep = 6;
    for (let s = 2; s <= 6; s++) {
      if (!completedStepsOnConsole.includes(s)) {
        nextRemainingStep = s;
        break;
      }
    }

    return {
      existsInAccount: true,
      packageName,
      hasBundle,
      latestVersionCode,
      latestSha256,
      details,
      listing,
      images,
      appContent: savedDeclarations,
      completedStepsOnConsole,
      nextRemainingStep
    };
  } catch (error) {
    return {
      existsInAccount: false,
      packageName,
      error: error.message
    };
  }
}

/**
 * Uploads an AAB or APK bundle (or uses existing versionCode if already uploaded),
 * updates store listing/details/images if provided, and publishes to a track.
 */
async function publishAppPackage({
  filePath = null,
  fileName = '',
  existingVersionCode = null,
  packageName,
  track = 'internal',
  releaseNotes = 'تحديث جديد تم رفعه وفحصه عبر المنصة.',
  status = 'completed',
  storeListing = null,
  appDetails = null,
  appContent = null,
  imageFiles = null
}) {
  const play = getPlayClient();
  if (appContent || appDetails) {
    saveAppDeclarations(packageName, {
      ...(appContent || {}),
      ...(appDetails || {})
    });
  }
  
  console.log(`[Google Play API] بدء عملية النشر وإرسال التغييرات: ${packageName} (المسار: ${track})`);

  const edit = await play.edits.insert({ packageName });
  const editId = edit.data.id;
  console.log(`[Google Play API] تم فتح معاملة تحرير برقم: ${editId}`);

  try {
    let versionCode = existingVersionCode ? String(existingVersionCode).replace(/[^0-9]/g, '') : null;
    let sha256 = null;

    if (filePath && fs.existsSync(filePath)) {
      const isAab = fileName.toLowerCase().endsWith('.aab') || filePath.toLowerCase().endsWith('.aab');
      try {
        if (isAab) {
          console.log(`[Google Play API] جاري رفع حزمة AAB إلى Google Play...`);
          const res = await play.edits.bundles.upload({
            packageName,
            editId,
            media: {
              mimeType: 'application/octet-stream',
              body: fs.createReadStream(filePath)
            }
          });
          versionCode = res.data.versionCode;
          sha256 = res.data.sha256;
          console.log(`[Google Play API] اكتمل رفع الـ AAB بنجاح! كود الإصدار: ${versionCode}`);
        } else {
          console.log(`[Google Play API] جاري رفع حزمة APK إلى Google Play...`);
          const res = await play.edits.apks.upload({
            packageName,
            editId,
            media: {
              mimeType: 'application/vnd.android.package-archive',
              body: fs.createReadStream(filePath)
            }
          });
          versionCode = res.data.versionCode;
          sha256 = res.data.binary?.sha256;
          console.log(`[Google Play API] اكتمل رفع الـ APK بنجاح! كود الإصدار: ${versionCode}`);
        }
      } catch (uploadErr) {
        console.warn(`[Google Play API] ملاحظة أثناء رفع الحزمة (${uploadErr.message}) — جاري فحص الحزم المرفوعة مسبقاً بالحساب...`);
        try {
          const bundlesRes = await play.edits.bundles.list({ packageName, editId });
          const bundles = bundlesRes.data.bundles || [];
          if (bundles.length > 0) {
            versionCode = bundles[bundles.length - 1].versionCode;
            sha256 = bundles[bundles.length - 1].sha256;
            console.log(`[Google Play API] تم العثور على الحزمة المرفوعة مسبقاً بالحساب برقم إصدار: ${versionCode}`);
          } else {
            throw uploadErr;
          }
        } catch (_) {
          throw uploadErr;
        }
      }
    }

    if (!versionCode) {
      // Check if there is an existing bundle or APK in the account
      try {
        const bundlesRes = await play.edits.bundles.list({ packageName, editId });
        const bundles = bundlesRes.data.bundles || [];
        if (bundles.length > 0) {
          versionCode = bundles[bundles.length - 1].versionCode;
          sha256 = bundles[bundles.length - 1].sha256;
        }
      } catch (_) {}

      if (!versionCode) {
        try {
          const apksRes = await play.edits.apks.list({ packageName, editId });
          const apks = apksRes.data.apks || [];
          if (apks.length > 0) {
            versionCode = apks[apks.length - 1].versionCode;
            sha256 = apks[apks.length - 1].binary?.sha256;
          }
        } catch (_) {}
      }
    }

    // Fetch current details from Console to know the exact defaultLanguage registered on Google Play
    let consoleDefaultLang = (appDetails && appDetails.defaultLanguage) || 'ar';
    try {
      const existingDetails = await play.edits.details.get({ packageName, editId });
      if (existingDetails.data && existingDetails.data.defaultLanguage) {
        consoleDefaultLang = existingDetails.data.defaultLanguage;
      }
    } catch (_) {}

    // Optional: Update App Details (Contact Email, Phone, Website, Default Language)
    if (appDetails && (appDetails.contactEmail || appDetails.contactWebsite || appDetails.contactPhone)) {
      try {
        console.log(`[Google Play API] تحديث تفاصيل الاتصال للتطبيق...`);
        await play.edits.details.update({
          packageName,
          editId,
          requestBody: {
            defaultLanguage: consoleDefaultLang,
            contactEmail: appDetails.contactEmail || undefined,
            contactPhone: appDetails.contactPhone || undefined,
            contactWebsite: appDetails.contactWebsite || undefined
          }
        });
      } catch (detailErr) {
        console.warn(`[Google Play API] تنبيه أثناء تحديث تفاصيل الاتصال:`, detailErr.message);
      }
    }

    // Submit Official Data Safety Declaration (أمان البيانات) via applications.dataSafety API
    try {
      console.log(`[Google Play API] إرسال نموذج أمان البيانات (Data Safety)...`);
      const dataSafetyCsv = [
        'Question ID (machine readable),Response ID (machine readable),Response value,Answer requirement,Human-friendly question label',
        'PSL_DATA_COLLECTION_COLLECTS_PERSONAL_DATA,,false,REQUIRED,Does your app collect or share any of the required user data types?'
      ].join('\n');
      await play.applications.dataSafety({
        packageName,
        requestBody: {
          safetyLabels: dataSafetyCsv
        }
      });
      console.log(`[Google Play API] ✔ تم إكمال مهمة أمان البيانات (Data Safety) بنجاح!`);
    } catch (dsErr) {
      console.warn(`[Google Play API] تنبيه أثناء إرسال أمان البيانات:`, dsErr.message);
    }

    // Optional: Update Main Store Listing (Title, Short Description, Full Description)
    if (storeListing && (storeListing.title || storeListing.shortDescription || storeListing.fullDescription)) {
      try {
        let existingListing = {};
        try {
          const getList = await play.edits.listings.get({ packageName, editId, language: consoleDefaultLang });
          existingListing = getList.data || {};
        } catch (_) {}

        const finalTitle = (storeListing.title || existingListing.title || packageName).slice(0, 30);
        const finalShort = (storeListing.shortDescription || existingListing.shortDescription || finalTitle).slice(0, 80);
        const finalFull = (storeListing.fullDescription || existingListing.fullDescription || finalShort).slice(0, 4000);

        console.log(`[Google Play API] تحديث بطاقة بيانات المتجر باللغة (${consoleDefaultLang})...`);
        await play.edits.listings.update({
          packageName,
          editId,
          language: consoleDefaultLang,
          requestBody: {
            language: consoleDefaultLang,
            title: finalTitle,
            shortDescription: finalShort,
            fullDescription: finalFull
          }
        });
      } catch (listingErr) {
        console.warn(`[Google Play API] تنبيه أثناء تحديث بطاقة المتجر:`, listingErr.message);
      }
    }

    // Optional: Upload Store Graphics (Icon, Feature Graphic, Phone Screenshots)
    if (imageFiles) {
      const lang = consoleDefaultLang;

      if (imageFiles.icon && imageFiles.icon[0]) {
        try {
          console.log(`[Google Play API] رفع أيقونة التطبيق...`);
          await play.edits.images.deleteall({ packageName, editId, language: lang, imageType: 'icon' }).catch(() => {});
          await play.edits.images.upload({
            packageName,
            editId,
            language: lang,
            imageType: 'icon',
            media: {
              mimeType: imageFiles.icon[0].mimetype || 'image/png',
              body: fs.createReadStream(imageFiles.icon[0].path)
            }
          });
        } catch (imgErr) {
          console.warn(`[Google Play API] تنبيه أثناء رفع الأيقونة:`, imgErr.message);
        }
      }

      if (imageFiles.featureGraphic && imageFiles.featureGraphic[0]) {
        try {
          console.log(`[Google Play API] رفع الصورة المميزة (Feature Graphic)...`);
          await play.edits.images.deleteall({ packageName, editId, language: lang, imageType: 'featureGraphic' }).catch(() => {});
          await play.edits.images.upload({
            packageName,
            editId,
            language: lang,
            imageType: 'featureGraphic',
            media: {
              mimeType: imageFiles.featureGraphic[0].mimetype || 'image/png',
              body: fs.createReadStream(imageFiles.featureGraphic[0].path)
            }
          });
        } catch (imgErr) {
          console.warn(`[Google Play API] تنبيه أثناء رفع الصورة المميزة:`, imgErr.message);
        }
      }

      if (imageFiles.screenshots && imageFiles.screenshots.length > 0) {
        try {
          await play.edits.images.deleteall({ packageName, editId, language: lang, imageType: 'phoneScreenshots' }).catch(() => {});
        } catch (_) {}
        for (const shot of imageFiles.screenshots) {
          try {
            console.log(`[Google Play API] رفع لقطة شاشة: ${shot.originalname}...`);
            await play.edits.images.upload({
              packageName,
              editId,
              language: lang,
              imageType: 'phoneScreenshots',
              media: {
                mimeType: shot.mimetype || 'image/png',
                body: fs.createReadStream(shot.path)
              }
            });
          } catch (imgErr) {
            console.warn(`[Google Play API] تنبيه أثناء رفع لقطة الشاشة:`, imgErr.message);
          }
        }
      }
    }

    let finalReleaseStatus = status || 'completed';

    const applyTrackRelease = async (relStatus) => {
      if (!versionCode) return;
      console.log(`[Google Play API] تعيين الإصدار ${versionCode} إلى مسار: ${track} (الحالة: ${relStatus})...`);
      const releaseObj = {
        name: `${versionCode} (1.0.${versionCode})`,
        versionCodes: [String(versionCode)],
        status: relStatus
      };
      if (releaseNotes && releaseNotes.trim()) {
        releaseObj.releaseNotes = [
          {
            language: consoleDefaultLang,
            text: releaseNotes.trim()
          }
        ];
      }
      await play.edits.tracks.update({
        packageName,
        editId,
        track,
        requestBody: {
          track,
          releases: [releaseObj]
        }
      });
    };

    if (versionCode) {
      try {
        await applyTrackRelease(finalReleaseStatus);
      } catch (trackErr) {
        if (trackErr.message && trackErr.message.toLowerCase().includes('draft')) {
          finalReleaseStatus = 'draft';
          await applyTrackRelease('draft');
        } else {
          throw trackErr;
        }
      }
    }

    console.log(`[Google Play API] تأكيد وحفظ التغييرات (Commit Edit)...`);
    let commitRes;
    try {
      commitRes = await play.edits.commit({
        packageName,
        editId
      });
    } catch (commitErr) {
      const errMsg = (commitErr.message || '').toLowerCase();
      // Automatic fallback when Google Play reports "Only releases with status draft may be created on draft app."
      if (errMsg.includes('draft') && versionCode) {
        console.log(`[Google Play API] التطبيق في حالة مسودة أولية (Draft App) — جاري تحويل حالة الإصدار إلى draft وإعادة الحفظ تلقائياً...`);
        finalReleaseStatus = 'draft';
        await applyTrackRelease('draft');
        try {
          commitRes = await play.edits.commit({
            packageName,
            editId
          });
        } catch (commitErr2) {
          if ((commitErr2.message || '').includes('changesNotSentForReview')) {
            commitRes = await play.edits.commit({
              packageName,
              editId,
              changesNotSentForReview: true
            });
          } else {
            throw commitErr2;
          }
        }
      } else if (errMsg.includes('changesnotsentforreview')) {
        commitRes = await play.edits.commit({
          packageName,
          editId,
          changesNotSentForReview: true
        });
      } else {
        throw commitErr;
      }
    }

    console.log(`[Google Play API] 🎉 تم النشر وإرسال جميع التغييرات بنجاح إلى Google Play!`);

    // Also run Playwright Console declarations automation if session.json is present
    try {
      const { completeConsoleDeclarations, SESSION_FILE_PATH } = require('./automation');
      if (fs.existsSync(SESSION_FILE_PATH)) {
        await completeConsoleDeclarations({
          packageName,
          appContent: appContent || getSavedAppDeclarations(packageName) || {},
          appDetails: appDetails || {}
        });
      }
    } catch (_) {}

    return {
      success: true,
      packageName,
      versionCode: versionCode || 'محدث',
      releaseStatus: finalReleaseStatus,
      sha256,
      track,
      commitId: commitRes.data.id,
      consoleUrl: `https://play.google.com/console/developers/8679275296222021944/app/${packageName}/tracks/${track}`
    };
  } catch (error) {
    console.error(`[Google Play API] خطأ أثناء النشر:`, error.message);
    try {
      await play.edits.delete({ packageName, editId });
    } catch (_) {}
    throw error;
  }
}

module.exports = {
  testPlayConnection,
  inspectExistingAppInAccount,
  publishAppPackage,
  saveAppDeclarations,
  getSavedAppDeclarations
};
