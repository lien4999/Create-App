// Google Play Developer API Integration Service
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

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

    // Determine which steps are already completed on Google Play Console
    const completedStepsOnConsole = [1]; // Step 1 (App creation) is definitely done since package exists in account
    if (hasBundle) {
      completedStepsOnConsole.push(2); // Step 2 (Bundle upload) is already done
    }
    if (details.contactEmail) {
      completedStepsOnConsole.push(4);
    }
    if (listing.title && listing.shortDescription && listing.fullDescription) {
      completedStepsOnConsole.push(5);
    }

    // Find the first remaining incomplete step (between 2 and 6)
    let nextRemainingStep = 2;
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
  imageFiles = null
}) {
  const play = getPlayClient();
  
  console.log(`[Google Play API] بدء عملية النشر وإرسال التغييرات: ${packageName} (المسار: ${track})`);

  const edit = await play.edits.insert({ packageName });
  const editId = edit.data.id;
  console.log(`[Google Play API] تم فتح معاملة تحرير برقم: ${editId}`);

  try {
    let versionCode = existingVersionCode;
    let sha256 = null;

    if (filePath && fs.existsSync(filePath)) {
      const isAab = fileName.toLowerCase().endsWith('.aab') || filePath.toLowerCase().endsWith('.aab');
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
    } else if (!versionCode) {
      // Check if there is an existing bundle in the account
      try {
        const bundlesRes = await play.edits.bundles.list({ packageName, editId });
        const bundles = bundlesRes.data.bundles || [];
        if (bundles.length > 0) {
          versionCode = bundles[bundles.length - 1].versionCode;
          sha256 = bundles[bundles.length - 1].sha256;
        }
      } catch (_) {}
    }

    // Optional: Update App Details (Contact Email, Phone, Website, Default Language)
    if (appDetails && (appDetails.contactEmail || appDetails.contactWebsite || appDetails.contactPhone)) {
      try {
        console.log(`[Google Play API] تحديث تفاصيل الاتصال للتطبيق...`);
        await play.edits.details.update({
          packageName,
          editId,
          requestBody: {
            defaultLanguage: appDetails.defaultLanguage || 'ar',
            contactEmail: appDetails.contactEmail || undefined,
            contactPhone: appDetails.contactPhone || undefined,
            contactWebsite: appDetails.contactWebsite || undefined
          }
        });
      } catch (detailErr) {
        console.warn(`[Google Play API] تنبيه أثناء تحديث تفاصيل الاتصال:`, detailErr.message);
      }
    }

    // Optional: Update Main Store Listing (Title, Short Description, Full Description)
    if (storeListing && (storeListing.title || storeListing.shortDescription || storeListing.fullDescription)) {
      try {
        const lang = (appDetails && appDetails.defaultLanguage) || 'ar';
        console.log(`[Google Play API] تحديث بطاقة بيانات المتجر باللغة (${lang})...`);
        await play.edits.listings.update({
          packageName,
          editId,
          language: lang,
          requestBody: {
            language: lang,
            title: storeListing.title || undefined,
            shortDescription: storeListing.shortDescription || undefined,
            fullDescription: storeListing.fullDescription || undefined
          }
        });
      } catch (listingErr) {
        console.warn(`[Google Play API] تنبيه أثناء تحديث بطاقة المتجر:`, listingErr.message);
      }
    }

    // Optional: Upload Store Graphics (Icon, Feature Graphic, Phone Screenshots)
    if (imageFiles) {
      const lang = (appDetails && appDetails.defaultLanguage) || 'ar';

      if (imageFiles.icon && imageFiles.icon[0]) {
        try {
          console.log(`[Google Play API] رفع أيقونة التطبيق...`);
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

    if (versionCode) {
      console.log(`[Google Play API] تعيين الإصدار ${versionCode} إلى مسار: ${track}...`);
      const lang = (appDetails && appDetails.defaultLanguage) || 'ar';
      await play.edits.tracks.update({
        packageName,
        editId,
        track,
        requestBody: {
          track,
          releases: [
            {
              name: `إصدار ${versionCode}`,
              versionCodes: [versionCode.toString()],
              status,
              releaseNotes: [
                {
                  language: lang,
                  text: releaseNotes
                }
              ]
            }
          ]
        }
      });
    }

    console.log(`[Google Play API] تأكيد وحفظ التغييرات (Commit Edit)...`);
    const commitRes = await play.edits.commit({
      packageName,
      editId
    });

    console.log(`[Google Play API] 🎉 تم النشر وإرسال جميع التغييرات بنجاح إلى Google Play!`);

    return {
      success: true,
      packageName,
      versionCode: versionCode || 'محدث',
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
  publishAppPackage
};
