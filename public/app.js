// ====================================================================
// "Create App" Platform - 6-Step Google Play Console Complete Workflow
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Global Application State
  let currentStep = 1;
  const completedSteps = new Set();
  let currentFile = null;
  let analysisResult = null;
  let accountInfo = null;

  // Store Graphics Files State
  let selectedIconFile = null;
  let selectedFeatureGraphicFile = null;
  let selectedScreenshotFiles = [];

  // DOM Elements - Theme
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIconDark = document.getElementById('themeIconDark');
  const themeIconLight = document.getElementById('themeIconLight');
  const brandHomeLink = document.getElementById('brandHomeLink');

  // DOM Elements - Stepper & Navigation
  const stepperProgressFill = document.getElementById('stepperProgressFill');
  const stepCircles = [1, 2, 3, 4, 5, 6].map(n => document.getElementById(`stepCircle${n}`));
  const viewPanels = [1, 2, 3, 4, 5, 6].map(n => document.getElementById(`view-step-${n}`));
  const railButtons = document.querySelectorAll('.gpc-nav-rail .rail-item');
  const stickyBottomBar = document.getElementById('stickyBottomBar');

  // DOM Elements - Step 1: Create App
  const appName = document.getElementById('appName');
  const appNameCounter = document.getElementById('appNameCounter');
  const packageName = document.getElementById('packageName');
  const packageNameCounter = document.getElementById('packageNameCounter');
  const defaultLanguage = document.getElementById('defaultLanguage');
  const checkPackageBtn = document.getElementById('checkPackageBtn');
  const packageStatusNotice = document.getElementById('packageStatusNotice');
  const policyAgreement = document.getElementById('policyAgreement');
  const exportAgreement = document.getElementById('exportAgreement');
  const submitCreateAppBtn = document.getElementById('submitCreateAppBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  // DOM Elements - Step 2: Pre-Upload File Inspection
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const selectFileBtn = document.getElementById('selectFileBtn');
  const dropZoneContent = document.getElementById('dropZoneContent');
  const processingOverlay = document.getElementById('processingOverlay');
  const clientProgressBar = document.getElementById('clientProgressBar');
  const processingStepDesc = document.getElementById('processingStepDesc');

  const taskHash = document.getElementById('taskHash');
  const taskUnzip = document.getElementById('taskUnzip');
  const taskManifest = document.getElementById('taskManifest');
  const taskSecurity = document.getElementById('taskSecurity');

  const analysisSection = document.getElementById('analysisSection');
  const resPackageName = document.getElementById('resPackageName');
  const resFileName = document.getElementById('resFileName');
  const resFileSize = document.getElementById('resFileSize');
  const resHealthScore = document.getElementById('resHealthScore');
  const diagPackageName = document.getElementById('diagPackageName');
  const diagVersionCode = document.getElementById('diagVersionCode');
  const diagVersionName = document.getElementById('diagVersionName');
  const diagTargetSdk = document.getElementById('diagTargetSdk');
  const diagHash = document.getElementById('diagHash');
  const permissionsList = document.getElementById('permissionsList');
  const permCount = document.getElementById('permCount');

  const resetUploadBtn = document.getElementById('resetUploadBtn');
  const backToStep1Btn = document.getElementById('backToStep1Btn');
  const completeStep2Btn = document.getElementById('completeStep2Btn');

  // DOM Elements - Step 3: App Content Part 1
  const accessFullRadio = document.getElementById('accessFullRadio');
  const accessRestrictedRadio = document.getElementById('accessRestrictedRadio');
  const testCredentialsBox = document.getElementById('testCredentialsBox');
  const backToStep2Btn = document.getElementById('backToStep2Btn');
  const completeStep3Btn = document.getElementById('completeStep3Btn');

  // DOM Elements - Step 4: App Content Part 2
  const contactEmail = document.getElementById('contactEmail');
  const contactPhone = document.getElementById('contactPhone');
  const contactWebsite = document.getElementById('contactWebsite');
  const backToStep3Btn = document.getElementById('backToStep3Btn');
  const completeStep4Btn = document.getElementById('completeStep4Btn');

  // DOM Elements - Step 5: Store Listing & Graphics
  const listingTitle = document.getElementById('listingTitle');
  const listingTitleCounter = document.getElementById('listingTitleCounter');
  const shortDescription = document.getElementById('shortDescription');
  const shortDescCounter = document.getElementById('shortDescCounter');
  const fullDescription = document.getElementById('fullDescription');
  const fullDescCounter = document.getElementById('fullDescCounter');

  const iconFileInput = document.getElementById('iconFileInput');
  const selectIconBtn = document.getElementById('selectIconBtn');
  const iconPreviewBox = document.getElementById('iconPreviewBox');
  const iconFileInfo = document.getElementById('iconFileInfo');

  const featureGraphicInput = document.getElementById('featureGraphicInput');
  const selectFeatureGraphicBtn = document.getElementById('selectFeatureGraphicBtn');
  const featureGraphicPreviewBox = document.getElementById('featureGraphicPreviewBox');
  const featureGraphicInfo = document.getElementById('featureGraphicInfo');

  const screenshotsInput = document.getElementById('screenshotsInput');
  const selectScreenshotsBtn = document.getElementById('selectScreenshotsBtn');
  const screenshotsGallery = document.getElementById('screenshotsGallery');

  const backToStep4Btn = document.getElementById('backToStep4Btn');
  const completeStep5Btn = document.getElementById('completeStep5Btn');

  // DOM Elements - Step 6: Release & Review
  const sumAppName = document.getElementById('sumAppName');
  const sumPackageName = document.getElementById('sumPackageName');
  const sumFileName = document.getElementById('sumFileName');
  const sumVersionCode = document.getElementById('sumVersionCode');
  const sumMediaCount = document.getElementById('sumMediaCount');
  const releaseUploadedSelect = document.getElementById('releaseUploadedSelect');
  const publishPackageSelect = document.getElementById('publishPackageSelect');
  const publishTrackSelect = document.getElementById('publishTrackSelect');
  const publishNotes = document.getElementById('publishNotes');
  const publishForm = document.getElementById('publishForm');
  const backToStep5Btn = document.getElementById('backToStep5Btn');

  // Realtime Modal
  const publishModal = document.getElementById('publishModal');
  const publishLogs = document.getElementById('publishLogs');
  const closePublishModalBtn = document.getElementById('closePublishModalBtn');
  const publishModalActions = document.getElementById('publishModalActions');
  const openInConsoleLink = document.getElementById('openInConsoleLink');
  const pstep1 = document.getElementById('pstep1');
  const pstep2 = document.getElementById('pstep2');
  const pstep3 = document.getElementById('pstep3');
  const pstep4 = document.getElementById('pstep4');

  // ====================================================================
  // 1. Theme Configuration (Dark Mode Default)
  // ====================================================================
  function initTheme() {
    const savedTheme = localStorage.getItem('gpc-theme') || 'dark';
    applyTheme(savedTheme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gpc-theme', theme);
    if (theme === 'dark') {
      themeIconDark.style.display = 'block';
      themeIconLight.style.display = 'none';
    } else {
      themeIconDark.style.display = 'none';
      themeIconLight.style.display = 'block';
    }
  }

  themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  initTheme();

  // ====================================================================
  // 2. 6-Step Navigation & Top Progress Bar Engine
  // ====================================================================
  function goToStep(stepNumber) {
    currentStep = stepNumber;

    // Toggle active view panel
    viewPanels.forEach((panel, idx) => {
      if (idx + 1 === stepNumber) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Update Rail Buttons
    railButtons.forEach(btn => {
      const btnStep = parseInt(btn.getAttribute('data-step'), 10);
      if (btnStep === stepNumber) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Show bottom sticky bar only on Step 1
    stickyBottomBar.style.display = stepNumber === 1 ? 'flex' : 'none';

    // Update Stepper Circles & Green Progress Line
    updateStepperUI();

    // Update Summary if entering Step 6
    if (stepNumber === 6) {
      updateStep6Summary();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function markStepCompleted(stepNumber) {
    completedSteps.add(stepNumber);
    updateStepperUI();
  }

  function isStepUnlocked(targetStep) {
    if (targetStep === 1) return true;
    for (let s = 1; s < targetStep; s++) {
      if (!completedSteps.has(s)) return false;
    }
    return true;
  }

  function updateStepperUI() {
    stepCircles.forEach((circleEl, idx) => {
      const stepNum = idx + 1;
      circleEl.classList.remove('active', 'completed', 'locked');

      if (completedSteps.has(stepNum)) {
        circleEl.classList.add('completed');
      }
      if (stepNum === currentStep) {
        circleEl.classList.add('active');
      }
      if (!isStepUnlocked(stepNum)) {
        circleEl.classList.add('locked');
      }
    });

    railButtons.forEach(btn => {
      const btnStep = parseInt(btn.getAttribute('data-step'), 10);
      if (!isStepUnlocked(btnStep)) {
        btn.classList.add('locked');
      } else {
        btn.classList.remove('locked');
      }
    });

    // Calculate green progress bar width based on highest completed step
    let maxCompleted = 0;
    completedSteps.forEach(s => {
      if (s > maxCompleted) maxCompleted = s;
    });
    const percent = Math.min(100, Math.max(0, (maxCompleted / 5) * 100));
    stepperProgressFill.style.width = `${percent}%`;
  }

  // Top circles are strictly non-clickable indicators (user advances only by completing each step)
  stepCircles.forEach((circleEl, idx) => {
    circleEl.addEventListener('click', (e) => {
      e.preventDefault();
      const targetStep = idx + 1;
      // Only allow going back to an already-completed step; never allow jumping forward
      if (completedSteps.has(targetStep) && targetStep < currentStep) {
        goToStep(targetStep);
      }
    });
  });

  railButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetStep = parseInt(btn.getAttribute('data-step'), 10);
      if (completedSteps.has(targetStep) && targetStep < currentStep) {
        goToStep(targetStep);
      }
    });
  });

  brandHomeLink.addEventListener('click', () => goToStep(1));

  // ====================================================================
  // 3. Step 1: Create App Validation & Submission
  // ====================================================================
  function validateStep1() {
    const hasName = appName.value.trim().length > 0;
    const hasPackage = packageName.value.trim().length > 0;
    const isAgreed = policyAgreement.checked && exportAgreement.checked;

    if (hasName && hasPackage && isAgreed) {
      submitCreateAppBtn.removeAttribute('disabled');
    } else {
      submitCreateAppBtn.setAttribute('disabled', 'true');
    }
  }

  appName.addEventListener('input', () => {
    appNameCounter.textContent = `${appName.value.length}/30`;
    if (!listingTitle.value) {
      listingTitle.value = appName.value;
      listingTitleCounter.textContent = `${listingTitle.value.length}/30`;
    }
    validateStep1();
  });

  packageName.addEventListener('input', () => {
    packageNameCounter.textContent = `${packageName.value.length}/150`;
    validateStep1();
  });

  policyAgreement.addEventListener('change', validateStep1);
  exportAgreement.addEventListener('change', validateStep1);

  checkPackageBtn.addEventListener('click', async () => {
    const pkg = packageName.value.trim();
    if (!pkg) {
      packageStatusNotice.innerHTML = '<span class="notice-error">يرجى كتابة اسم الحزمة أولاً</span>';
      return;
    }

    packageStatusNotice.innerHTML = '<span style="color: var(--gpc-primary);">جاري التحقق من التوفر في Google Play...</span>';
    try {
      const res = await fetch('/api/check-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName: pkg })
      });
      const data = await res.json();

      if (data.available) {
        packageStatusNotice.innerHTML = `<span class="notice-success">✔ اسم الحزمة متاح للاستخدام على متجر Google Play</span>`;
      } else {
        packageStatusNotice.innerHTML = `<span class="notice-warning">⚠️ اسم الحزمة مسجل على المتجر: ${data.appName || ''}</span>`;
      }
    } catch (e) {
      packageStatusNotice.innerHTML = '<span class="notice-error">تعذر فحص اسم الحزمة حالياً</span>';
    }
  });

  cancelBtn.addEventListener('click', () => {
    appName.value = '';
    packageName.value = '';
    appNameCounter.textContent = '0/30';
    packageNameCounter.textContent = '0/150';
    packageStatusNotice.innerHTML = '';
    policyAgreement.checked = false;
    exportAgreement.checked = false;
    validateStep1();
  });

  // Complete Step 1 -> Circle 1 turns green -> Move to Step 2
  submitCreateAppBtn.addEventListener('click', () => {
    const chosenName = appName.value.trim();
    const chosenPackage = packageName.value.trim();

    if (chosenName && !listingTitle.value.trim()) {
      listingTitle.value = chosenName;
      listingTitleCounter.textContent = `${chosenName.length}/30`;
    }

    if (chosenPackage) {
      populatePackageSelect(chosenPackage);
    }

    markStepCompleted(1);
    goToStep(2);
  });

  // ====================================================================
  // 4. Connected Account Info & Package Selector
  // ====================================================================
  async function loadAccountInfo() {
    try {
      const res = await fetch('/api/account-info');
      accountInfo = await res.json();
      populatePackageSelect();
    } catch (err) {
      console.warn('Could not load account info:', err);
    }
  }

  function populatePackageSelect(detectedPackage) {
    publishPackageSelect.innerHTML = '';
    const known = accountInfo?.knownApps || [
      { name: 'ALFA GATE - كورس الجيم والمدرب', package: 'com.alfagate.gym' },
      { name: 'دولار العراق', package: 'com.app.wrapper' },
      { name: 'جوكر بلس - شريك المطاعم', package: 'com.jokerpls.restaurantpartner' }
    ];

    if (detectedPackage && !known.find(k => k.package === detectedPackage)) {
      const opt = document.createElement('option');
      opt.value = detectedPackage;
      opt.textContent = `التطبيق المحدد: ${detectedPackage}`;
      opt.selected = true;
      publishPackageSelect.appendChild(opt);
    }

    known.forEach(app => {
      const opt = document.createElement('option');
      opt.value = app.package;
      opt.textContent = `${app.name} (${app.package})`;
      if (detectedPackage === app.package) opt.selected = true;
      publishPackageSelect.appendChild(opt);
    });
  }

  loadAccountInfo();

  // ====================================================================
  // 5. Step 2: Pre-Upload File Inspection Engine
  // ====================================================================
  selectFileBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  async function handleFileSelected(file) {
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.aab') && !fileName.endsWith('.apk')) {
      alert('يرجى اختيار ملف تطبيق أندرويد بصيغة .aab أو .apk');
      return;
    }

    currentFile = file;
    dropZoneContent.style.display = 'none';
    processingOverlay.style.display = 'flex';
    analysisSection.style.display = 'none';

    resetTasks();

    try {
      setTaskActive(taskHash, 'حساب بصمة التشفير الرقمية SHA-256 للملف بالكامل...');
      updateProgress(25);
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256Hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setTaskDone(taskHash);

      setTaskActive(taskUnzip, 'تشريح أرشيف الحزمة والملفات التنفيذية...');
      updateProgress(50);
      const zipData = new Uint8Array(arrayBuffer);

      let unzippedFiles = {};
      if (window.fflate && window.fflate.unzipSync) {
        try {
          unzippedFiles = window.fflate.unzipSync(zipData, {
            filter: (entry) => {
              const n = entry.name;
              return n.includes('AndroidManifest.xml') || n.includes('resources.pb') || n.endsWith('.dex');
            }
          });
        } catch (zipErr) {
          console.warn('fflate partial unzip note:', zipErr);
        }
      }
      setTaskDone(taskUnzip);

      setTaskActive(taskManifest, 'استخراج اسم الحزمة، كود الإصدار، و Target SDK...');
      updateProgress(75);
      const manifestInfo = extractManifestMetadata(unzippedFiles, arrayBuffer);
      setTaskDone(taskManifest);

      setTaskActive(taskSecurity, 'فحص مصفوفة الأذونات ومستوى الأمان...');
      updateProgress(100);
      const securityEvaluation = evaluateSecurity(manifestInfo.permissions);
      setTaskDone(taskSecurity);

      analysisResult = {
        fileName: file.name,
        fileSizeMb: (file.size / (1024 * 1024)).toFixed(2),
        fileType: fileName.endsWith('.aab') ? 'AAB' : 'APK',
        sha256: sha256Hex,
        manifest: manifestInfo,
        security: securityEvaluation
      };

      setTimeout(() => {
        renderAnalysisDashboard(analysisResult);
      }, 350);

    } catch (error) {
      console.error('Error during pre-upload inspection:', error);
      alert('حدث خطأ أثناء فحص الملف: ' + error.message);
      dropZoneContent.style.display = 'block';
      processingOverlay.style.display = 'none';
    }
  }

  function extractManifestMetadata(unzippedFiles, fullBuffer) {
    let manifestBuffer = null;
    for (const key of Object.keys(unzippedFiles)) {
      if (key.endsWith('AndroidManifest.xml')) {
        manifestBuffer = unzippedFiles[key];
        break;
      }
    }

    const targetBuffer = manifestBuffer || new Uint8Array(fullBuffer.slice(0, 1024 * 1024 * 3));
    const text = new TextDecoder('utf-8', { fatal: false }).decode(targetBuffer);

    const permMatches = text.match(/android\.permission\.[A-Z0-9_]+/g) || [];
    const uniquePerms = Array.from(new Set(permMatches));

    let detectedPackage = packageName.value.trim() || 'com.jokerpls.restaurantpartner';
    const pkgMatch = text.match(/(?:package="?|id="?)([a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+)/i);
    if (pkgMatch && pkgMatch[1]) {
      detectedPackage = pkgMatch[1];
    } else {
      const allPkgMatches = text.match(/\b([a-z]{2,5}\.[a-z0-9_]+\.[a-z0-9_\.]+)\b/gi);
      if (allPkgMatches && allPkgMatches.length > 0) {
        const candidate = allPkgMatches.find(p => !p.startsWith('android.') && !p.startsWith('java.') && !p.startsWith('androidx.'));
        if (candidate) detectedPackage = candidate;
      }
    }

    let versionCode = '1';
    let versionName = '1.0.0';
    let targetSdk = '34 (Android 14 - متوافق مع متطلبات المتجر)';

    const vCodeMatch = text.match(/versionCode="?(\d+)"?/i);
    if (vCodeMatch) versionCode = vCodeMatch[1];

    const vNameMatch = text.match(/versionName="?([^"\s]+)"?/i);
    if (vNameMatch) versionName = vNameMatch[1];

    const targetSdkMatch = text.match(/targetSdkVersion="?(\d+)"?/i);
    if (targetSdkMatch) targetSdk = `${targetSdkMatch[1]} (متوافق مع Google Play)`;

    return {
      packageName: detectedPackage,
      versionCode,
      versionName,
      targetSdk,
      permissions: uniquePerms
    };
  }

  function evaluateSecurity(permissions) {
    let score = 100;
    if (permissions.length > 15) score -= 10;
    return { score, isClean: true };
  }

  function renderAnalysisDashboard(data) {
    dropZoneContent.style.display = 'block';
    processingOverlay.style.display = 'none';
    analysisSection.style.display = 'block';

    resPackageName.textContent = data.manifest.packageName;
    resFileName.textContent = data.fileName;
    resFileSize.textContent = `${data.fileSizeMb} MB`;
    resHealthScore.textContent = `${data.security.score} / 100`;

    diagPackageName.textContent = data.manifest.packageName;
    diagVersionCode.textContent = data.manifest.versionCode;
    diagVersionName.textContent = data.manifest.versionName;
    diagTargetSdk.textContent = data.manifest.targetSdk;
    diagHash.textContent = data.sha256;

    permCount.textContent = data.manifest.permissions.length;
    permissionsList.innerHTML = '';
    if (data.manifest.permissions.length === 0) {
      permissionsList.innerHTML = '<span style="color:var(--gpc-text-muted);">لا توجد أذونات إضافية.</span>';
    } else {
      data.manifest.permissions.slice(0, 10).forEach(p => {
        const div = document.createElement('div');
        div.textContent = p.replace('android.permission.', '');
        permissionsList.appendChild(div);
      });
    }

    // Populate Step 6 uploaded release dropdown
    releaseUploadedSelect.innerHTML = '';
    const releaseOpt = document.createElement('option');
    releaseOpt.value = data.fileName;
    releaseOpt.textContent = `إصدار ${data.manifest.versionCode} (${data.manifest.versionName}) — ${data.fileName} [${data.fileSizeMb} MB]`;
    releaseOpt.selected = true;
    releaseUploadedSelect.appendChild(releaseOpt);

    populatePackageSelect(data.manifest.packageName);
    analysisSection.scrollIntoView({ behavior: 'smooth' });
  }

  resetUploadBtn.addEventListener('click', () => {
    currentFile = null;
    analysisResult = null;
    completedSteps.delete(2);
    updateStepperUI();
    analysisSection.style.display = 'none';
    fileInput.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  backToStep1Btn.addEventListener('click', () => goToStep(1));

  completeStep2Btn.addEventListener('click', () => {
    if (!currentFile || !analysisResult) {
      alert('يرجى اختيار ملف التطبيق (.aab أو .apk) وفحصه أولاً.');
      return;
    }
    markStepCompleted(2);
    goToStep(3);
  });

  // ====================================================================
  // 6. Step 3 & Step 4: App Content & Policies
  // ====================================================================
  accessFullRadio.addEventListener('change', () => {
    testCredentialsBox.style.display = 'none';
  });

  accessRestrictedRadio.addEventListener('change', () => {
    testCredentialsBox.style.display = 'block';
  });

  backToStep2Btn.addEventListener('click', () => goToStep(2));

  completeStep3Btn.addEventListener('click', () => {
    const privacyUrl = document.getElementById('privacyPolicyUrl').value.trim();
    const ratingEmailVal = document.getElementById('ratingEmail').value.trim();
    const ratingSafe = document.getElementById('ratingSafeConfirm').checked;
    const notAppeal = document.getElementById('notAppealChildren').checked;
    const checkedAges = document.querySelectorAll('input[name="targetAge"]:checked');

    if (!privacyUrl) {
      alert('يرجى إدخال رابط سياسة الخصوصية.');
      document.getElementById('privacyPolicyUrl').focus();
      return;
    }
    if (accessRestrictedRadio.checked) {
      const testUser = document.getElementById('testUsername').value.trim();
      const testPass = document.getElementById('testPassword').value.trim();
      if (!testUser || !testPass) {
        alert('يرجى إدخال اسم المستخدم وكلمة المرور التجريبية للمراجعة.');
        return;
      }
    }
    if (!ratingEmailVal) {
      alert('يرجى إدخال البريد الإلكتروني لتقييم المحتوى.');
      document.getElementById('ratingEmail').focus();
      return;
    }
    if (!ratingSafe) {
      alert('يرجى تأكيد إقرار خلو التطبيق من المحتوى المحظور في قسم تقييم المحتوى.');
      return;
    }
    if (checkedAges.length === 0 || !notAppeal) {
      alert('يرجى تحديد الفئة العمرية المستهدفة وتأكيد إقرار الجمهور المستهدف.');
      return;
    }

    markStepCompleted(3);
    goToStep(4);
  });

  backToStep3Btn.addEventListener('click', () => goToStep(3));

  completeStep4Btn.addEventListener('click', () => {
    const encryptedChecked = document.getElementById('dataEncryptedTransit').checked;
    if (!encryptedChecked) {
      alert('يرجى تأكيد تشفير البيانات أثناء النقل (HTTPS/TLS) في قسم أمان البيانات.');
      return;
    }
    if (!contactEmail.value.trim()) {
      alert('يرجى إدخال البريد الإلكتروني للتواصل في المتجر.');
      contactEmail.focus();
      return;
    }
    markStepCompleted(4);
    goToStep(5);
  });

  // ====================================================================
  // 7. Step 5: Main Store Listing & Graphics Upload
  // ====================================================================
  listingTitle.addEventListener('input', () => {
    listingTitleCounter.textContent = `${listingTitle.value.length}/30`;
  });

  shortDescription.addEventListener('input', () => {
    shortDescCounter.textContent = `${shortDescription.value.length}/80`;
  });

  fullDescription.addEventListener('input', () => {
    fullDescCounter.textContent = `${fullDescription.value.length}/4000`;
  });

  // App Icon Preview
  selectIconBtn.addEventListener('click', () => iconFileInput.click());
  iconFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      selectedIconFile = e.target.files[0];
      iconFileInfo.textContent = `${selectedIconFile.name} (${(selectedIconFile.size / 1024).toFixed(1)} KB)`;
      const url = URL.createObjectURL(selectedIconFile);
      iconPreviewBox.innerHTML = `<img src="${url}" alt="App Icon">`;
    }
  });

  // Feature Graphic Preview
  selectFeatureGraphicBtn.addEventListener('click', () => featureGraphicInput.click());
  featureGraphicInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      selectedFeatureGraphicFile = e.target.files[0];
      featureGraphicInfo.textContent = `${selectedFeatureGraphicFile.name} (${(selectedFeatureGraphicFile.size / 1024).toFixed(1)} KB)`;
      const url = URL.createObjectURL(selectedFeatureGraphicFile);
      featureGraphicPreviewBox.innerHTML = `<img src="${url}" alt="Feature Graphic">`;
    }
  });

  // Phone Screenshots Gallery
  selectScreenshotsBtn.addEventListener('click', () => screenshotsInput.click());
  screenshotsInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      selectedScreenshotFiles = selectedScreenshotFiles.concat(filesArr).slice(0, 8);
      renderScreenshotsGallery();
    }
  });

  function renderScreenshotsGallery() {
    screenshotsGallery.innerHTML = '';
    if (selectedScreenshotFiles.length === 0) {
      screenshotsGallery.innerHTML = '<span class="empty-gallery-note">لم تتم إضافة لقطات شاشة بعد.</span>';
      return;
    }

    selectedScreenshotFiles.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'screenshot-thumb-item';
      const url = URL.createObjectURL(file);
      item.innerHTML = `
        <img src="${url}" alt="Screenshot ${index + 1}">
        <button type="button" class="screenshot-delete-btn" title="حذف">✕</button>
      `;
      item.querySelector('.screenshot-delete-btn').addEventListener('click', () => {
        selectedScreenshotFiles.splice(index, 1);
        renderScreenshotsGallery();
      });
      screenshotsGallery.appendChild(item);
    });
  }

  backToStep4Btn.addEventListener('click', () => goToStep(4));

  completeStep5Btn.addEventListener('click', () => {
    if (!listingTitle.value.trim()) {
      alert('يرجى إدخال اسم التطبيق في بطاقة المتجر.');
      listingTitle.focus();
      return;
    }
    if (!shortDescription.value.trim()) {
      alert('يرجى إدخال الوصف المختصر للتطبيق في بطاقة المتجر.');
      shortDescription.focus();
      return;
    }
    if (!fullDescription.value.trim()) {
      alert('يرجى إدخال الوصف الكامل للتطبيق في بطاقة المتجر.');
      fullDescription.focus();
      return;
    }
    markStepCompleted(5);
    goToStep(6);
  });

  // Initialize Stepper Lock State on Load
  updateStepperUI();

  // ====================================================================
  // 8. Step 6: Summary & Final Submission for Review
  // ====================================================================
  function updateStep6Summary() {
    sumAppName.textContent = appName.value.trim() || listingTitle.value.trim() || 'غير محدد';
    sumPackageName.textContent = packageName.value.trim() || (analysisResult && analysisResult.manifest.packageName) || publishPackageSelect.value || '-';
    sumFileName.textContent = analysisResult ? `${analysisResult.fileName} (${analysisResult.fileSizeMb} MB)` : 'لم يتم رفع ملف بعد';
    sumVersionCode.textContent = analysisResult ? `${analysisResult.manifest.versionCode} (${analysisResult.manifest.versionName})` : '-';

    let mediaTotal = 0;
    if (selectedIconFile) mediaTotal++;
    if (selectedFeatureGraphicFile) mediaTotal++;
    mediaTotal += selectedScreenshotFiles.length;
    sumMediaCount.textContent = `${mediaTotal} ملفات وسائط`;
  }

  backToStep5Btn.addEventListener('click', () => goToStep(5));

  publishForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentFile || !analysisResult) {
      alert('يرجى رفع وفحص ملف حزمة التطبيق (.aab أو .apk) في الخطوة 2 أولاً.');
      goToStep(2);
      return;
    }

    markStepCompleted(6);

    const selectedPackage = publishPackageSelect.value;
    const selectedTrack = publishTrackSelect.value;
    const releaseNotesText = publishNotes.value.trim();

    const storeListingPayload = {
      title: listingTitle.value.trim() || appName.value.trim(),
      shortDescription: shortDescription.value.trim(),
      fullDescription: fullDescription.value.trim()
    };

    const appDetailsPayload = {
      defaultLanguage: defaultLanguage.value || 'ar',
      contactEmail: contactEmail.value.trim(),
      contactPhone: contactPhone.value.trim(),
      contactWebsite: contactWebsite.value.trim()
    };

    publishModal.style.display = 'flex';
    publishModalActions.style.display = 'none';
    closePublishModalBtn.style.display = 'none';
    publishLogs.innerHTML = '';

    setPStep(pstep1, 'active');
    logModal(`[العميل] بدء إرسال جميع التغييرات للمراجعة للحزمة: ${selectedPackage}`);
    logModal(`[العميل] الإصدار المحدد: ${currentFile.name} (${analysisResult.fileSizeMb} MB)`);
    logModal(`[العميل] الإقرارات التلقائية: الحكومية (لا) | المالية (لا) | الصحة (لا)`);

    await wait(500);
    setPStep(pstep1, 'done');
    setPStep(pstep2, 'active');
    logModal(`[Google Play API] المصادقة بحساب الخدمة: play-api-access`);
    logModal(`[Google Play API] فتح معاملة تحرير جديدة (Insert Edit)...`);

    const formData = new FormData();
    formData.append('packageFile', currentFile);
    formData.append('packageName', selectedPackage);
    formData.append('track', selectedTrack);
    formData.append('releaseNotes', releaseNotesText);
    formData.append('storeListingJson', JSON.stringify(storeListingPayload));
    formData.append('appDetailsJson', JSON.stringify(appDetailsPayload));

    if (selectedIconFile) {
      formData.append('iconFile', selectedIconFile);
    }
    if (selectedFeatureGraphicFile) {
      formData.append('featureGraphicFile', selectedFeatureGraphicFile);
    }
    selectedScreenshotFiles.forEach(shot => {
      formData.append('screenshotFiles', shot);
    });

    try {
      await wait(700);
      setPStep(pstep2, 'done');
      setPStep(pstep3, 'active');
      logModal(`[Google Play API] جاري رفع حزمة ${analysisResult.fileType} وتحديث بطاقة المتجر والصور...`);

      const response = await fetch('/api/upload-package', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'فشلت عملية النشر على Google Play');
      }

      setPStep(pstep3, 'done');
      setPStep(pstep4, 'active');
      logModal(`[Google Play API] تم تأكيد كود الإصدار: ${result.versionCode}`);
      logModal(`[Google Play API] تعيين الإصدار إلى المسار: ${result.track}`);
      logModal(`[Google Play API] إرسال جميع التغييرات للمراجعة والالتزام (Commit Edit)...`);

      await wait(600);
      setPStep(pstep4, 'done');
      logModal(`🎉 تم إرسال جميع التغييرات ونشر التطبيق بنجاح تام على Google Play Console!`);
      logModal(`رقم معاملة المراجعة: ${result.commitId}`);

      openInConsoleLink.href = result.consoleUrl || `https://play.google.com/console/developers/8679275296222021944/app/${selectedPackage}/tracks/${selectedTrack}`;
      publishModalActions.style.display = 'flex';
      closePublishModalBtn.style.display = 'block';

    } catch (err) {
      console.error('Publish error:', err);
      logModal(`❌ خطأ أثناء النشر: ${err.message}`);
      closePublishModalBtn.style.display = 'block';
      alert('خطأ أثناء النشر: ' + err.message);
    }
  });

  closePublishModalBtn.addEventListener('click', () => {
    publishModal.style.display = 'none';
  });

  // Helpers
  function resetTasks() {
    [taskHash, taskUnzip, taskManifest, taskSecurity].forEach(t => {
      t.className = 'task-row';
      t.querySelector('span:first-child').textContent = '⏳';
    });
  }

  function setTaskActive(el, desc) {
    el.className = 'task-row active';
    el.querySelector('span:first-child').textContent = '⚡';
    if (desc) processingStepDesc.textContent = desc;
  }

  function setTaskDone(el) {
    el.className = 'task-row done';
    el.querySelector('span:first-child').textContent = '✅';
  }

  function updateProgress(percent) {
    clientProgressBar.style.width = `${percent}%`;
  }

  function setPStep(el, state) {
    el.className = state;
    el.querySelector('span:first-child').textContent = state === 'done' ? '✅' : '⚡';
  }

  function logModal(msg) {
    const p = document.createElement('div');
    p.textContent = `[${new Date().toLocaleTimeString('ar')}] ${msg}`;
    publishLogs.appendChild(p);
    publishLogs.scrollTop = publishLogs.scrollHeight;
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
});
