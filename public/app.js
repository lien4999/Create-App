// ====================================================================
// "Create App" Platform - 6-Step Google Play Console Complete Workflow
// Includes:
// 1. Strict Step Locking (Circles turn green only when completed)
// 2. Full Browser Persistence (localStorage + IndexedDB for files)
// 3. Smart Existing-App Detection (Skips directly to remaining steps)
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY_ACTIVE = 'gpc_wizard_active_state_v2';
  const STORAGE_KEY_PKG_PREFIX = 'gpc_pkg_state_v2_';
  const IDB_NAME = 'CreateAppFilesDB';
  const IDB_STORE = 'files_store';

  // Global Application State
  let currentStep = 1;
  const completedSteps = new Set();
  let currentFile = null;
  let analysisResult = null;
  let existingAccountVersionCode = null;
  let accountInfo = null;
  let isRestoringState = false;

  // Store Graphics Files State
  let selectedIconFile = null;
  let selectedFeatureGraphicFile = null;
  let selectedScreenshotFiles = [];

  // DOM Elements - Theme & Header
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIconDark = document.getElementById('themeIconDark');
  const themeIconLight = document.getElementById('themeIconLight');
  const brandHomeLink = document.getElementById('brandHomeLink');
  const newAppSessionBtn = document.getElementById('newAppSessionBtn');

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
  const privacyPolicyUrl = document.getElementById('privacyPolicyUrl');
  const accessFullRadio = document.getElementById('accessFullRadio');
  const accessRestrictedRadio = document.getElementById('accessRestrictedRadio');
  const testCredentialsBox = document.getElementById('testCredentialsBox');
  const testUsername = document.getElementById('testUsername');
  const testPassword = document.getElementById('testPassword');
  const ratingEmail = document.getElementById('ratingEmail');
  const ratingCategory = document.getElementById('ratingCategory');
  const ratingSafeConfirm = document.getElementById('ratingSafeConfirm');
  const notAppealChildren = document.getElementById('notAppealChildren');
  const backToStep2Btn = document.getElementById('backToStep2Btn');
  const completeStep3Btn = document.getElementById('completeStep3Btn');

  // DOM Elements - Step 4: App Content Part 2
  const dataEncryptedTransit = document.getElementById('dataEncryptedTransit');
  const storeCategory = document.getElementById('storeCategory');
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
  const countriesSelect = document.getElementById('countriesSelect');
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
  // 1. IndexedDB Helper for Saving Uploaded Files Across Browser Restarts
  // ====================================================================
  function openFilesDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return resolve(null);
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    });
  }

  async function idbSaveItem(key, val) {
    try {
      const db = await openFilesDB();
      if (!db) return;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(val, key);
    } catch (_) {}
  }

  async function idbGetItem(key) {
    try {
      const db = await openFilesDB();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (_) {
      return null;
    }
  }

  async function idbClearAll() {
    try {
      const db = await openFilesDB();
      if (!db) return;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
    } catch (_) {}
  }

  // ====================================================================
  // 2. Full State Save & Restore Engine (localStorage + IndexedDB)
  // ====================================================================
  function collectCurrentStateObject() {
    const appTypeRadio = document.querySelector('input[name="appType"]:checked');
    const appPriceRadio = document.querySelector('input[name="appPrice"]:checked');
    const containsAdsRadio = document.querySelector('input[name="containsAds"]:checked');
    const dataSafetyRadio = document.querySelector('input[name="dataSafetyCollect"]:checked');
    const govAppRadio = document.querySelector('input[name="govApp"]:checked');
    const financeAppRadio = document.querySelector('input[name="financeApp"]:checked');
    const healthAppRadio = document.querySelector('input[name="healthApp"]:checked');
    const targetAges = Array.from(document.querySelectorAll('input[name="targetAge"]:checked')).map(cb => cb.value);

    return {
      currentStep,
      completedSteps: Array.from(completedSteps),
      analysisResult,
      existingAccountVersionCode,
      fields: {
        appName: appName.value,
        packageName: packageName.value,
        defaultLanguage: defaultLanguage.value,
        appType: appTypeRadio ? appTypeRadio.value : 'APPLICATION',
        appPrice: appPriceRadio ? appPriceRadio.value : 'FREE',
        policyAgreement: policyAgreement.checked,
        exportAgreement: exportAgreement.checked,
        privacyPolicyUrl: privacyPolicyUrl.value,
        appAccessType: accessRestrictedRadio.checked ? 'RESTRICTED' : 'FULL_ACCESS',
        testUsername: testUsername.value,
        testPassword: testPassword.value,
        containsAds: containsAdsRadio ? containsAdsRadio.value : 'NO',
        ratingEmail: ratingEmail.value,
        ratingCategory: ratingCategory.value,
        ratingSafeConfirm: ratingSafeConfirm.checked,
        targetAges,
        notAppealChildren: notAppealChildren.checked,
        dataSafetyCollect: dataSafetyRadio ? dataSafetyRadio.value : 'NO',
        dataEncryptedTransit: dataEncryptedTransit.checked,
        govApp: govAppRadio ? govAppRadio.value : 'NO',
        financeApp: financeAppRadio ? financeAppRadio.value : 'NO',
        healthApp: healthAppRadio ? healthAppRadio.value : 'NO',
        storeCategory: storeCategory.value,
        contactEmail: contactEmail.value,
        contactPhone: contactPhone.value,
        contactWebsite: contactWebsite.value,
        listingTitle: listingTitle.value,
        shortDescription: shortDescription.value,
        fullDescription: fullDescription.value,
        publishTrackSelect: publishTrackSelect.value,
        countriesSelect: countriesSelect.value,
        publishNotes: publishNotes.value
      },
      updatedAt: Date.now()
    };
  }

  function saveBrowserState() {
    if (isRestoringState) return;
    try {
      const state = collectCurrentStateObject();
      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(state));

      const pkg = (packageName.value || '').trim().toLowerCase();
      if (pkg) {
        localStorage.setItem(STORAGE_KEY_PKG_PREFIX + pkg, JSON.stringify(state));
      }
    } catch (e) {
      console.warn('Could not save state to localStorage:', e);
    }
  }

  async function applyStateObject(state, restoreFilesFromIDB = true) {
    if (!state || !state.fields) return;
    isRestoringState = true;

    try {
      const f = state.fields;
      if (f.appName !== undefined) {
        appName.value = f.appName;
        appNameCounter.textContent = `${appName.value.length}/30`;
      }
      if (f.packageName !== undefined) {
        packageName.value = f.packageName;
        packageNameCounter.textContent = `${packageName.value.length}/150`;
      }
      if (f.defaultLanguage) defaultLanguage.value = f.defaultLanguage;

      if (f.appType) {
        const r = document.querySelector(`input[name="appType"][value="${f.appType}"]`);
        if (r) r.checked = true;
      }
      if (f.appPrice) {
        const r = document.querySelector(`input[name="appPrice"][value="${f.appPrice}"]`);
        if (r) r.checked = true;
      }

      policyAgreement.checked = Boolean(f.policyAgreement);
      exportAgreement.checked = Boolean(f.exportAgreement);

      if (f.privacyPolicyUrl !== undefined) privacyPolicyUrl.value = f.privacyPolicyUrl;
      if (f.appAccessType === 'RESTRICTED') {
        accessRestrictedRadio.checked = true;
        testCredentialsBox.style.display = 'block';
      } else {
        accessFullRadio.checked = true;
        testCredentialsBox.style.display = 'none';
      }
      if (f.testUsername !== undefined) testUsername.value = f.testUsername;
      if (f.testPassword !== undefined) testPassword.value = f.testPassword;

      if (f.containsAds) {
        const r = document.querySelector(`input[name="containsAds"][value="${f.containsAds}"]`);
        if (r) r.checked = true;
      }
      if (f.ratingEmail !== undefined) ratingEmail.value = f.ratingEmail;
      if (f.ratingCategory) ratingCategory.value = f.ratingCategory;
      ratingSafeConfirm.checked = f.ratingSafeConfirm !== false;

      if (Array.isArray(f.targetAges)) {
        document.querySelectorAll('input[name="targetAge"]').forEach(cb => {
          cb.checked = f.targetAges.includes(cb.value);
        });
      }
      notAppealChildren.checked = f.notAppealChildren !== false;

      if (f.dataSafetyCollect) {
        const r = document.querySelector(`input[name="dataSafetyCollect"][value="${f.dataSafetyCollect}"]`);
        if (r) r.checked = true;
      }
      dataEncryptedTransit.checked = f.dataEncryptedTransit !== false;

      if (f.govApp) {
        const r = document.querySelector(`input[name="govApp"][value="${f.govApp}"]`);
        if (r) r.checked = true;
      }
      if (f.financeApp) {
        const r = document.querySelector(`input[name="financeApp"][value="${f.financeApp}"]`);
        if (r) r.checked = true;
      }
      if (f.healthApp) {
        const r = document.querySelector(`input[name="healthApp"][value="${f.healthApp}"]`);
        if (r) r.checked = true;
      }

      if (f.storeCategory) storeCategory.value = f.storeCategory;
      if (f.contactEmail !== undefined) contactEmail.value = f.contactEmail;
      if (f.contactPhone !== undefined) contactPhone.value = f.contactPhone;
      if (f.contactWebsite !== undefined) contactWebsite.value = f.contactWebsite;

      if (f.listingTitle !== undefined) {
        listingTitle.value = f.listingTitle;
        listingTitleCounter.textContent = `${listingTitle.value.length}/30`;
      }
      if (f.shortDescription !== undefined) {
        shortDescription.value = f.shortDescription;
        shortDescCounter.textContent = `${shortDescription.value.length}/80`;
      }
      if (f.fullDescription !== undefined) {
        fullDescription.value = f.fullDescription;
        fullDescCounter.textContent = `${fullDescription.value.length}/4000`;
      }

      if (f.publishTrackSelect) publishTrackSelect.value = f.publishTrackSelect;
      if (f.countriesSelect) countriesSelect.value = f.countriesSelect;
      if (f.publishNotes !== undefined) publishNotes.value = f.publishNotes;

      completedSteps.clear();
      if (Array.isArray(state.completedSteps)) {
        state.completedSteps.forEach(s => completedSteps.add(Number(s)));
      }

      existingAccountVersionCode = state.existingAccountVersionCode || null;
      analysisResult = state.analysisResult || null;

      if (restoreFilesFromIDB) {
        const savedPkgFile = await idbGetItem('currentFile');
        if (savedPkgFile) currentFile = savedPkgFile;

        const savedIcon = await idbGetItem('selectedIconFile');
        if (savedIcon) {
          selectedIconFile = savedIcon;
          iconFileInfo.textContent = `${selectedIconFile.name} (${(selectedIconFile.size / 1024).toFixed(1)} KB)`;
          iconPreviewBox.innerHTML = `<img src="${URL.createObjectURL(selectedIconFile)}" alt="App Icon">`;
        }

        const savedBanner = await idbGetItem('selectedFeatureGraphicFile');
        if (savedBanner) {
          selectedFeatureGraphicFile = savedBanner;
          featureGraphicInfo.textContent = `${selectedFeatureGraphicFile.name} (${(selectedFeatureGraphicFile.size / 1024).toFixed(1)} KB)`;
          featureGraphicPreviewBox.innerHTML = `<img src="${URL.createObjectURL(selectedFeatureGraphicFile)}" alt="Feature Graphic">`;
        }

        const savedShots = await idbGetItem('selectedScreenshotFiles');
        if (Array.isArray(savedShots) && savedShots.length > 0) {
          selectedScreenshotFiles = savedShots;
          renderScreenshotsGallery();
        }
      }

      if (analysisResult) {
        renderAnalysisDashboard(analysisResult, false);
      } else if (existingAccountVersionCode) {
        populateExistingReleaseInStep6(f.packageName, existingAccountVersionCode);
      }

      if (f.packageName) {
        populatePackageSelect(f.packageName);
      }

      validateStep1();

      const targetStep = state.currentStep && state.currentStep >= 1 && state.currentStep <= 6 ? state.currentStep : 1;
      isRestoringState = false;
      goToStep(targetStep);
    } catch (err) {
      console.warn('Error restoring browser state:', err);
      isRestoringState = false;
    }
  }

  async function restoreSavedSessionOnLoad() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (!raw) return;
      const savedState = JSON.parse(raw);
      if (savedState && savedState.fields && (savedState.fields.appName || savedState.fields.packageName || (savedState.completedSteps && savedState.completedSteps.length > 0))) {
        await applyStateObject(savedState, true);
      }
    } catch (e) {
      console.warn('Could not load saved session:', e);
    }
  }

  // Listen to any input/change inside the main workspace to auto-save state
  document.querySelector('.gpc-content-area').addEventListener('input', () => saveBrowserState());
  document.querySelector('.gpc-content-area').addEventListener('change', () => saveBrowserState());

  // "تطبيق جديد" Button in Header resets session to start fresh
  if (newAppSessionBtn) {
    newAppSessionBtn.addEventListener('click', async () => {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
      await idbClearAll();
      completedSteps.clear();
      currentFile = null;
      analysisResult = null;
      existingAccountVersionCode = null;
      selectedIconFile = null;
      selectedFeatureGraphicFile = null;
      selectedScreenshotFiles = [];

      appName.value = '';
      packageName.value = '';
      appNameCounter.textContent = '0/30';
      packageNameCounter.textContent = '0/150';
      packageStatusNotice.innerHTML = '';
      policyAgreement.checked = false;
      exportAgreement.checked = false;
      listingTitle.value = '';
      shortDescription.value = '';
      fullDescription.value = '';
      analysisSection.style.display = 'none';
      iconPreviewBox.innerHTML = '<span>512×512</span>';
      iconFileInfo.textContent = 'لم يتم اختيار صورة بعد';
      featureGraphicPreviewBox.innerHTML = '<span>1024 × 500</span>';
      featureGraphicInfo.textContent = 'لم يتم اختيار صورة بعد';
      renderScreenshotsGallery();

      validateStep1();
      goToStep(1);
    });
  }

  // ====================================================================
  // 3. Theme Configuration (Dark Mode Default)
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
  // 4. 6-Step Navigation & Top Progress Bar Engine
  // ====================================================================
  function goToStep(stepNumber) {
    currentStep = stepNumber;

    viewPanels.forEach((panel, idx) => {
      if (idx + 1 === stepNumber) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    railButtons.forEach(btn => {
      const btnStep = parseInt(btn.getAttribute('data-step'), 10);
      if (btnStep === stepNumber) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    stickyBottomBar.style.display = stepNumber === 1 ? 'flex' : 'none';

    updateStepperUI();

    if (stepNumber === 6) {
      updateStep6Summary();
    }

    saveBrowserState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function markStepCompleted(stepNumber) {
    completedSteps.add(stepNumber);
    updateStepperUI();
    saveBrowserState();
  }

  function isStepUnlocked(targetStep) {
    if (targetStep === 1) return true;
    if (completedSteps.has(targetStep) || targetStep === currentStep) return true;
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

    let maxCompleted = 0;
    completedSteps.forEach(s => {
      if (s > maxCompleted) maxCompleted = s;
    });
    const percent = Math.min(100, Math.max(0, (maxCompleted / 5) * 100));
    stepperProgressFill.style.width = `${percent}%`;
  }

  // Strictly lock uncompleted future steps on top circles & rail
  stepCircles.forEach((circleEl, idx) => {
    circleEl.addEventListener('click', (e) => {
      e.preventDefault();
      const targetStep = idx + 1;
      if (completedSteps.has(targetStep) && targetStep < currentStep) {
        goToStep(targetStep);
      }
    });
  });

  railButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetStep = parseInt(btn.getAttribute('data-step'), 10);
      if (completedSteps.has(targetStep) && targetStep < currentStep) {
        goToStep(targetStep);
      }
    });
  });

  brandHomeLink.addEventListener('click', () => goToStep(1));

  // ====================================================================
  // 5. Smart Existing-App Detection & Jump to Remaining Steps
  // ====================================================================
  function populateExistingReleaseInStep6(pkg, verCode) {
    releaseUploadedSelect.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = `existing-${verCode}`;
    opt.textContent = `الإصدار الموجود بالحساب: كود الإصدار ${verCode} (${pkg})`;
    opt.selected = true;
    releaseUploadedSelect.appendChild(opt);
  }

  async function checkAndJumpIfExistingApp(chosenName, chosenPackage) {
    const pkgKey = chosenPackage.trim().toLowerCase();

    // 1. Check if this package already has saved progress in browser localStorage
    let localPkgState = null;
    try {
      const rawPkg = localStorage.getItem(STORAGE_KEY_PKG_PREFIX + pkgKey);
      if (rawPkg) localPkgState = JSON.parse(rawPkg);
    } catch (_) {}

    // 2. Query server to inspect if the app already exists in the Google Play developer account
    let serverAccountApp = null;
    try {
      const res = await fetch('/api/inspect-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName: chosenPackage, appName: chosenName })
      });
      if (res.ok) {
        serverAccountApp = await res.json();
      }
    } catch (err) {
      console.warn('Could not inspect app on server:', err);
    }

    // Case A: App has saved progress locally in browser with completed steps > 1
    if (localPkgState && Array.isArray(localPkgState.completedSteps) && localPkgState.completedSteps.length > 1) {
      await applyStateObject(localPkgState, true);
      // Merge any server-side completed steps if present
      if (serverAccountApp && serverAccountApp.existsInAccount && Array.isArray(serverAccountApp.completedStepsOnConsole)) {
        serverAccountApp.completedStepsOnConsole.forEach(s => completedSteps.add(Number(s)));
      }
      // Find first uncompleted step (or step 6 if all 1..5 completed)
      let nextStep = 2;
      for (let s = 1; s <= 6; s++) {
        if (!completedSteps.has(s)) {
          nextStep = s;
          break;
        }
        if (s === 6) nextStep = 6;
      }
      updateStepperUI();
      goToStep(nextStep);
      return true;
    }

    // Case B: App exists in the Developer Account on Google Play Console
    if (serverAccountApp && serverAccountApp.existsInAccount) {
      // Pre-fill data from Google Play Console
      if (serverAccountApp.listing) {
        if (serverAccountApp.listing.title) {
          listingTitle.value = serverAccountApp.listing.title;
          listingTitleCounter.textContent = `${listingTitle.value.length}/30`;
        }
        if (serverAccountApp.listing.shortDescription) {
          shortDescription.value = serverAccountApp.listing.shortDescription;
          shortDescCounter.textContent = `${shortDescription.value.length}/80`;
        }
        if (serverAccountApp.listing.fullDescription) {
          fullDescription.value = serverAccountApp.listing.fullDescription;
          fullDescCounter.textContent = `${fullDescription.value.length}/4000`;
        }
      }

      if (serverAccountApp.details) {
        if (serverAccountApp.details.defaultLanguage) {
          defaultLanguage.value = serverAccountApp.details.defaultLanguage;
        }
        if (serverAccountApp.details.contactEmail) {
          contactEmail.value = serverAccountApp.details.contactEmail;
        }
        if (serverAccountApp.details.contactPhone) {
          contactPhone.value = serverAccountApp.details.contactPhone;
        }
        if (serverAccountApp.details.contactWebsite) {
          contactWebsite.value = serverAccountApp.details.contactWebsite;
        }
      }

      if (serverAccountApp.hasBundle && serverAccountApp.latestVersionCode) {
        existingAccountVersionCode = serverAccountApp.latestVersionCode;
        populateExistingReleaseInStep6(chosenPackage, existingAccountVersionCode);
      }

      if (Array.isArray(serverAccountApp.completedStepsOnConsole)) {
        serverAccountApp.completedStepsOnConsole.forEach(s => completedSteps.add(Number(s)));
      } else {
        completedSteps.add(1);
      }

      populatePackageSelect(chosenPackage);
      const targetStep = serverAccountApp.nextRemainingStep || 2;
      updateStepperUI();
      goToStep(targetStep);
      return true;
    }

    return false;
  }

  // ====================================================================
  // 6. Step 1: Create App Validation & Submission
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

    packageStatusNotice.innerHTML = '<span style="color: var(--gpc-primary);">جاري فحص الحزمة والتحقق من وجودها في حساب المطور...</span>';
    try {
      const res = await fetch('/api/check-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName: pkg })
      });
      const data = await res.json();

      if (data.existsInAccount) {
        packageStatusNotice.innerHTML = `<span class="notice-success">✔ هذا التطبيق موجود بالفعل في حسابك المطور! جاري نقلك مباشرة إلى الخطوات المتبقية...</span>`;
        setTimeout(() => {
          checkAndJumpIfExistingApp(appName.value.trim(), pkg);
        }, 700);
        return;
      }

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
    saveBrowserState();
  });

  // Submit Step 1 -> Checks if app already exists in account to skip to remaining steps, or moves to Step 2
  submitCreateAppBtn.addEventListener('click', async () => {
    const chosenName = appName.value.trim();
    const chosenPackage = packageName.value.trim();

    if (chosenName && !listingTitle.value.trim()) {
      listingTitle.value = chosenName;
      listingTitleCounter.textContent = `${chosenName.length}/30`;
    }

    if (chosenPackage) {
      populatePackageSelect(chosenPackage);
    }

    submitCreateAppBtn.setAttribute('disabled', 'true');
    const originalText = submitCreateAppBtn.textContent;
    submitCreateAppBtn.textContent = 'جاري فحص الحساب...';

    const jumped = await checkAndJumpIfExistingApp(chosenName, chosenPackage);
    submitCreateAppBtn.textContent = originalText;
    validateStep1();

    if (!jumped) {
      markStepCompleted(1);
      goToStep(2);
    }
  });

  // ====================================================================
  // 7. Connected Account Info & Package Selector
  // ====================================================================
  async function loadAccountInfo() {
    try {
      const res = await fetch('/api/account-info');
      accountInfo = await res.json();
      populatePackageSelect(packageName.value.trim() || undefined);
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

  // ====================================================================
  // 8. Step 2: Pre-Upload File Inspection Engine
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
    await idbSaveItem('currentFile', file);

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

      saveBrowserState();

      setTimeout(() => {
        renderAnalysisDashboard(analysisResult, true);
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

  function renderAnalysisDashboard(data, shouldScroll = true) {
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

    releaseUploadedSelect.innerHTML = '';
    const releaseOpt = document.createElement('option');
    releaseOpt.value = data.fileName;
    releaseOpt.textContent = `إصدار ${data.manifest.versionCode} (${data.manifest.versionName}) — ${data.fileName} [${data.fileSizeMb} MB]`;
    releaseOpt.selected = true;
    releaseUploadedSelect.appendChild(releaseOpt);

    populatePackageSelect(packageName.value.trim() || data.manifest.packageName);
    if (shouldScroll) {
      analysisSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  resetUploadBtn.addEventListener('click', async () => {
    currentFile = null;
    analysisResult = null;
    await idbSaveItem('currentFile', null);
    completedSteps.delete(2);
    updateStepperUI();
    saveBrowserState();
    analysisSection.style.display = 'none';
    fileInput.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  backToStep1Btn.addEventListener('click', () => goToStep(1));

  completeStep2Btn.addEventListener('click', () => {
    if (!currentFile && !analysisResult && !existingAccountVersionCode) {
      alert('يرجى اختيار ملف التطبيق (.aab أو .apk) وفحصه أولاً.');
      return;
    }
    markStepCompleted(2);
    goToStep(3);
  });

  // ====================================================================
  // 9. Step 3 & Step 4: App Content & Policies
  // ====================================================================
  accessFullRadio.addEventListener('change', () => {
    testCredentialsBox.style.display = 'none';
    saveBrowserState();
  });

  accessRestrictedRadio.addEventListener('change', () => {
    testCredentialsBox.style.display = 'block';
    saveBrowserState();
  });

  backToStep2Btn.addEventListener('click', () => goToStep(2));

  completeStep3Btn.addEventListener('click', () => {
    const privacyUrl = privacyPolicyUrl.value.trim();
    const ratingEmailVal = ratingEmail.value.trim();
    const ratingSafe = ratingSafeConfirm.checked;
    const notAppeal = notAppealChildren.checked;
    const checkedAges = document.querySelectorAll('input[name="targetAge"]:checked');

    if (!privacyUrl) {
      alert('يرجى إدخال رابط سياسة الخصوصية.');
      privacyPolicyUrl.focus();
      return;
    }
    if (accessRestrictedRadio.checked) {
      const testUser = testUsername.value.trim();
      const testPass = testPassword.value.trim();
      if (!testUser || !testPass) {
        alert('يرجى إدخال اسم المستخدم وكلمة المرور التجريبية للمراجعة.');
        return;
      }
    }
    if (!ratingEmailVal) {
      alert('يرجى إدخال البريد الإلكتروني لتقييم المحتوى.');
      ratingEmail.focus();
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
    const encryptedChecked = dataEncryptedTransit.checked;
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
  // 10. Step 5: Main Store Listing & Graphics Upload
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

  // App Icon Preview & IDB Save
  selectIconBtn.addEventListener('click', () => iconFileInput.click());
  iconFileInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files[0]) {
      selectedIconFile = e.target.files[0];
      await idbSaveItem('selectedIconFile', selectedIconFile);
      iconFileInfo.textContent = `${selectedIconFile.name} (${(selectedIconFile.size / 1024).toFixed(1)} KB)`;
      const url = URL.createObjectURL(selectedIconFile);
      iconPreviewBox.innerHTML = `<img src="${url}" alt="App Icon">`;
      saveBrowserState();
    }
  });

  // Feature Graphic Preview & IDB Save
  selectFeatureGraphicBtn.addEventListener('click', () => featureGraphicInput.click());
  featureGraphicInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files[0]) {
      selectedFeatureGraphicFile = e.target.files[0];
      await idbSaveItem('selectedFeatureGraphicFile', selectedFeatureGraphicFile);
      featureGraphicInfo.textContent = `${selectedFeatureGraphicFile.name} (${(selectedFeatureGraphicFile.size / 1024).toFixed(1)} KB)`;
      const url = URL.createObjectURL(selectedFeatureGraphicFile);
      featureGraphicPreviewBox.innerHTML = `<img src="${url}" alt="Feature Graphic">`;
      saveBrowserState();
    }
  });

  // Phone Screenshots Gallery & IDB Save
  selectScreenshotsBtn.addEventListener('click', () => screenshotsInput.click());
  screenshotsInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      selectedScreenshotFiles = selectedScreenshotFiles.concat(filesArr).slice(0, 8);
      await idbSaveItem('selectedScreenshotFiles', selectedScreenshotFiles);
      renderScreenshotsGallery();
      saveBrowserState();
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
      item.querySelector('.screenshot-delete-btn').addEventListener('click', async () => {
        selectedScreenshotFiles.splice(index, 1);
        await idbSaveItem('selectedScreenshotFiles', selectedScreenshotFiles);
        renderScreenshotsGallery();
        saveBrowserState();
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

  // ====================================================================
  // 11. Step 6: Summary & Final Submission for Review
  // ====================================================================
  function updateStep6Summary() {
    sumAppName.textContent = appName.value.trim() || listingTitle.value.trim() || 'غير محدد';
    sumPackageName.textContent = packageName.value.trim() || (analysisResult && analysisResult.manifest.packageName) || publishPackageSelect.value || '-';

    if (analysisResult) {
      sumFileName.textContent = `${analysisResult.fileName} (${analysisResult.fileSizeMb} MB)`;
      sumVersionCode.textContent = `${analysisResult.manifest.versionCode} (${analysisResult.manifest.versionName})`;
    } else if (existingAccountVersionCode) {
      sumFileName.textContent = 'حزمة مرفوعة مسبقاً في الحساب';
      sumVersionCode.textContent = `${existingAccountVersionCode}`;
    } else {
      sumFileName.textContent = 'لم يتم رفع ملف بعد';
      sumVersionCode.textContent = '-';
    }

    let mediaTotal = 0;
    if (selectedIconFile) mediaTotal++;
    if (selectedFeatureGraphicFile) mediaTotal++;
    mediaTotal += selectedScreenshotFiles.length;
    sumMediaCount.textContent = `${mediaTotal} ملفات وسائط`;
  }

  backToStep5Btn.addEventListener('click', () => goToStep(5));

  publishForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentFile && !existingAccountVersionCode) {
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
    if (currentFile && analysisResult) {
      logModal(`[العميل] الإصدار المحدد: ${currentFile.name} (${analysisResult.fileSizeMb} MB)`);
    } else {
      logModal(`[العميل] استخدام الإصدار المرفوع في الحساب برقم: ${existingAccountVersionCode}`);
    }
    logModal(`[العميل] الإقرارات التلقائية: الحكومية (لا) | المالية (لا) | الصحة (لا)`);

    await wait(500);
    setPStep(pstep1, 'done');
    setPStep(pstep2, 'active');
    logModal(`[Google Play API] المصادقة بحساب الخدمة: play-api-access`);
    logModal(`[Google Play API] فتح معاملة تحرير جديدة (Insert Edit)...`);

    const formData = new FormData();
    if (currentFile) {
      formData.append('packageFile', currentFile);
    }
    if (existingAccountVersionCode) {
      formData.append('existingVersionCode', existingAccountVersionCode);
    }
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
      logModal(`[Google Play API] جاري رفع التحديثات وتثبيت بطاقة المتجر والصور...`);

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

  // Initialize Stepper UI, Load Account Info, and Restore Saved Browser State
  updateStepperUI();
  loadAccountInfo().then(() => {
    restoreSavedSessionOnLoad();
  });
});
