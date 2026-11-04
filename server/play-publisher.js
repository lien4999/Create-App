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
 * Checks if an application exists in the developer account and retrieves its current info
 */
async function checkAppStatus(packageName) {
  if (!packageName) return { existsInAccount: false };
  try {
    const play = getPlayClient();
    const edit = await play.edits.insert({ packageName });
    const editId = edit.data.id;

    let listings = [];
    let details = {};
    let tracks = [];
    let bundles = [];

    try {
      const resList = await play.edits.listings.list({ packageName, editId });
      listings = resList.data.listings || [];
    } catch (_) {}

    try {
      const resDet = await play.edits.details.get({ packageName, editId });
      details = resDet.data || {};
    } catch (_) {}

    try {
      const resTr = await play.edits.tracks.list({ packageName, editId });
      tracks = resTr.data.tracks || [];
    } catch (_) {}

    try {
      const resBun = await play.edits.bundles.list({ packageName, editId });
      bundles = resBun.data.bundles || [];
    } catch (_) {}

    await play.edits.delete({ packageName, editId }).catch(() => {});

    // Primary listing info
    const primaryListing = listings.find(l => l.language === 'ar') || listings[0] || {};

    return {
      existsInAccount: true,
      packageName,
      title: primaryListing.title || '',
      shortDescription: primaryListing.shortDescription || '',
      fullDescription: primaryListing.fullDescription || '',
      contactEmail: details.contactEmail || '',
      contactPhone: details.contactPhone || '',
      contactWebsite: details.contactWebsite || '',
      defaultLanguage: details.defaultLanguage || 'ar',
      bundlesCount: bundles.length,
      hasReleases: bundles.length > 0 || tracks.some(t => t.releases && t.releases.length > 0),
      tracksCount: tracks.length
    };
  } catch (error) {
    const msg = error.message || '';
    if (msg.includes('Package not found') || msg.includes('404')) {
      return { existsInAccount: false, packageName };
    }
    return { existsInAccount: false, packageName, error: msg };
  }
}

/**
 * Uploads an AAB or APK bundle, updates store listing/details/images if provided, and publishes to a track
 */
async function publishAppPackage({
  filePath = null,
  fileName = null,
  packageName,
  track = 'internal',
  releaseNotes = 'تحديث جديد تم رفعه وفحصه عبر المنصة.',
  status = 'completed',
  storeListing = null,
  appDetails = null,
  imageFiles = null
}) {
  const play = getPlayClient();
  const hasFile = Boolean(filePath && fileName);
  const isAab = hasFile && (fileName.toLowerCase().endsWith('.aab') || filePath.toLowerCase().endsWith('.aab'));
  
  console.log(`[Google Play API] بدء عملية النشر والتحديث: ${packageName} (ملف جديد: ${hasFile ? (isAab ? 'AAB' : 'APK') : 'لا، تحديث بيانات ومحتوى فقط'})`);

  const edit = await play.edits.insert({ packageName });
  const editId = edit.data.id;
  console.log(`[Google Play API] تم فتح معاملة تحرير برقم: ${editId}`);

  try {
    let versionCode = null;
    let sha256 = null;

    if (hasFile) {
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
      versionCode,
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
  checkAppStatus,
  publishAppPackage
};
