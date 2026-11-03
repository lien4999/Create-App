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
 * Uploads an AAB or APK bundle and publishes it to a track
 */
async function publishAppPackage({
  filePath,
  fileName,
  packageName,
  track = 'internal',
  releaseNotes = 'تحديث جديد تم رفعه وفحصه عبر المنصة.',
  status = 'completed'
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

    console.log(`[Google Play API] تعيين الإصدار ${versionCode} إلى مسار: ${track}...`);
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
                language: 'ar',
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

    console.log(`[Google Play API] 🎉 تم النشر بنجاح إلى Google Play!`);

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
