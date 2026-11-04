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
 * Uploads an AAB or APK bundle, updates store listing/details/images if provided, and publishes to a track
 */
async function publishAppPackage({
  filePath,
  fileName,
  packageName,
  track = 'internal',
  releaseNotes = 'تحديث جديد تم رفعه وفحصه عبر المنصة.',
  status = 'completed',
  storeListing = null,
  appDetails = null,
  imageFiles = null
}) {
  const play = getPlayClient();
  const isAab = fileName.toLowerCase().endsWith('.aab') || filePath.toLowerCase().endsWith('.aab');
  
  console.log(`[Google Play API] بدء عملية رفع ونشر: ${packageName} (المسار: ${track}, النوع: ${isAab ? 'AAB' : 'APK'})`);

  const edit = await play.edits.insert({ packageName });
  const editId = edit.data.id;
  console.log(`[Google Play API] تم فتح معاملة تحرير برقم: ${editId}`);

  try {
    let versionCode;
    let sha256;

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
  publishAppPackage
};
