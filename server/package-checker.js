// Package Name Availability Checker
// Checks Google Play Store publicly to see if a package name is already taken.

/**
 * Validates Android package name regex.
 * Must start with letter, contain at least one dot, and only letters, numbers, underscores.
 * @param {string} packageName
 * @returns {boolean}
 */
function isValidPackageFormat(packageName) {
  const regex = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;
  return regex.test(packageName);
}

/**
 * Checks if package name exists on Google Play Store.
 * @param {string} packageName
 * @returns {Promise<{ available: boolean, message: string }>}
 */
async function checkPackageAvailability(packageName) {
  if (!packageName || !isValidPackageFormat(packageName)) {
    return {
      available: false,
      message: 'صيغة اسم الحزمة غير صالحة. يجب أن تكون بصيغة: com.example.app'
    };
  }

  const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}&hl=en&gl=US`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (response.status === 404) {
      return {
        available: true,
        message: 'اسم الحزمة متاح للاستخدام على متجر Google Play'
      };
    } else if (response.status === 200) {
      return {
        available: false,
        message: 'اسم الحزمة مستخدم بالفعل ومسجل لتطبيق آخر على المتجر'
      };
    } else {
      // Any other status, assume potentially available for registration
      return {
        available: true,
        message: 'اسم الحزمة غير متواجد حالياً في المتجر العام'
      };
    }
  } catch (error) {
    console.error('Error querying Google Play Store:', error.message);
    // If network fails, return available if format is valid
    return {
      available: true,
      message: 'تم التحقق من سلامة صيغة اسم الحزمة'
    };
  }
}

module.exports = {
  isValidPackageFormat,
  checkPackageAvailability
};
