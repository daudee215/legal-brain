import type { Entry } from './i18n-dict';

/** English and Urdu strings for the mfa feature. Keys are prefixed `mfa.`. */
export const MFA = {
  // Sign-in step
  'mfa.title': { en: 'Two-step sign-in', ur: 'دو مرحلوں والا سائن اِن' },
  'mfa.prompt': { en: 'Enter the 6-digit code from your authenticator app', ur: 'اپنی آتھنٹیکیٹر ایپ سے 6 ہندسوں والا کوڈ درج کریں' },
  'mfa.promptFor': { en: 'Signing in as {email}', ur: '{email} کے طور پر سائن اِن ہو رہا ہے' },
  'mfa.codeLabel': { en: '6-digit code', ur: '6 ہندسوں والا کوڈ' },
  'mfa.verify': { en: 'Continue', ur: 'آگے بڑھیں' },
  'mfa.checking': { en: 'Checking…', ur: 'جانچ ہو رہی ہے…' },
  'mfa.otherAccount': { en: 'Use a different account', ur: 'کوئی اور اکاؤنٹ استعمال کریں' },
  'mfa.lostPhone': {
    en: 'Lost your phone? Ask your chamber’s senior advocate or the app owner to remove two-step sign-in from your account.',
    ur: 'فون گم ہو گیا؟ اپنے چیمبر کے سینئر وکیل یا ایپ کے مالک سے کہیں کہ آپ کے اکاؤنٹ سے دو مرحلوں والا سائن اِن ہٹا دیں۔',
  },

  // Errors
  'mfa.errCode': { en: "That code is not right or has expired. Check your phone's clock.", ur: 'یہ کوڈ درست نہیں یا اس کا وقت ختم ہو گیا ہے۔ اپنے فون کی گھڑی کا وقت دیکھ لیں۔' },
  'mfa.errFormat': { en: 'Enter the 6 digits shown in your authenticator app.', ur: 'آتھنٹیکیٹر ایپ میں نظر آنے والے 6 ہندسے درج کریں۔' },
  'mfa.errDisabled': { en: 'Two-step sign-in is not switched on for this app yet. Ask the app owner.', ur: 'اس ایپ کے لیے ابھی دو مرحلوں والا سائن اِن چالو نہیں ہے۔ ایپ کے مالک سے پوچھیں۔' },
  'mfa.errRate': { en: 'Too many tries. Please wait a few minutes and try again.', ur: 'بہت زیادہ کوششیں ہو گئیں۔ چند منٹ انتظار کر کے دوبارہ کوشش کریں۔' },
  'mfa.errNetwork': { en: 'No internet connection. Connect and try again.', ur: 'انٹرنیٹ کنکشن نہیں ہے۔ کنیکٹ ہو کر دوبارہ کوشش کریں۔' },
  'mfa.errNoFactor': { en: 'Two-step sign-in is not set up on this account.', ur: 'اس اکاؤنٹ پر دو مرحلوں والا سائن اِن سیٹ نہیں ہے۔' },
  'mfa.errLoad': { en: 'Could not check two-step sign-in. Check your internet and try again.', ur: 'دو مرحلوں والے سائن اِن کی جانچ نہیں ہو سکی۔ انٹرنیٹ دیکھ کر دوبارہ کوشش کریں۔' },

  // Settings dialog
  'mfa.menu': { en: 'Two-step sign-in', ur: 'دو مرحلوں والا سائن اِن' },
  'mfa.close': { en: 'Close', ur: 'بند کریں' },
  'mfa.loading': { en: 'Checking…', ur: 'جانچ ہو رہی ہے…' },
  'mfa.retry': { en: 'Try again', ur: 'دوبارہ کوشش کریں' },
  'mfa.statusOff': { en: 'Two-step sign-in is off', ur: 'دو مرحلوں والا سائن اِن بند ہے' },
  'mfa.statusOn': { en: 'Two-step sign-in is on', ur: 'دو مرحلوں والا سائن اِن چالو ہے' },
  'mfa.intro': {
    en: 'After your password, the app will also ask for a 6-digit code from an app on your phone (Google Authenticator, Microsoft Authenticator or similar). Even if someone learns your password, they cannot get in without your phone.',
    ur: 'پاس ورڈ کے بعد ایپ آپ کے فون کی ایک ایپ (گوگل آتھنٹیکیٹر، مائیکروسافٹ آتھنٹیکیٹر یا اس جیسی) سے 6 ہندسوں والا کوڈ بھی مانگے گی۔ اگر کسی کو آپ کا پاس ورڈ معلوم ہو بھی جائے تو آپ کے فون کے بغیر وہ اندر نہیں آ سکے گا۔',
  },
  'mfa.setUp': { en: 'Set up', ur: 'سیٹ اپ کریں' },
  'mfa.starting': { en: 'Getting ready…', ur: 'تیاری ہو رہی ہے…' },
  'mfa.step1': { en: '1. Open your authenticator app and scan this code.', ur: '1۔ اپنی آتھنٹیکیٹر ایپ کھولیں اور یہ کوڈ اسکین کریں۔' },
  'mfa.qrAlt': { en: 'QR code to scan with your authenticator app', ur: 'آتھنٹیکیٹر ایپ سے اسکین کرنے کا کیو آر کوڈ' },
  'mfa.cantScan': { en: 'Can’t scan? Type this key into the app instead:', ur: 'اسکین نہیں ہو رہا؟ یہ کلید ایپ میں خود لکھ دیں:' },
  'mfa.copy': { en: 'Copy key', ur: 'کلید کاپی کریں' },
  'mfa.copied': { en: 'Copied', ur: 'کاپی ہو گئی' },
  'mfa.step2': { en: '2. Enter the 6-digit code the app shows.', ur: '2۔ ایپ میں نظر آنے والا 6 ہندسوں والا کوڈ درج کریں۔' },
  'mfa.turnOn': { en: 'Turn on', ur: 'چالو کریں' },
  'mfa.cancel': { en: 'Cancel', ur: 'منسوخ کریں' },
  'mfa.back': { en: 'Back', ur: 'واپس' },
  'mfa.turnedOn': { en: 'Turned on', ur: 'چالو ہو گیا' },
  'mfa.turnedOnBody': {
    en: 'From now on, signing in asks for your password and then a code from your phone.',
    ur: 'اب سے سائن اِن کرتے وقت پہلے پاس ورڈ اور پھر آپ کے فون سے کوڈ مانگا جائے گا۔',
  },
  'mfa.warning': {
    en: 'Important: if you lose your phone you cannot sign in, and your chamber’s senior advocate or the app owner will need to remove two-step sign-in for you. Keep the key above somewhere safe (on paper, or in a password manager) so you can add it to a new phone.',
    ur: 'اہم: اگر فون گم ہو گیا تو آپ سائن اِن نہیں کر سکیں گے، اور آپ کے چیمبر کے سینئر وکیل یا ایپ کے مالک کو آپ کے لیے دو مرحلوں والا سائن اِن ہٹانا پڑے گا۔ اوپر والی کلید کسی محفوظ جگہ (کاغذ پر یا پاس ورڈ مینیجر میں) رکھ لیں تاکہ نئے فون میں ڈال سکیں۔',
  },
  'mfa.done': { en: 'Done', ur: 'ٹھیک ہے' },
  'mfa.onSince': { en: 'On since {date}.', ur: '{date} سے چالو ہے۔' },
  'mfa.onBody': { en: 'Signing in asks for a code from your authenticator app.', ur: 'سائن اِن کرتے وقت آتھنٹیکیٹر ایپ کا کوڈ مانگا جاتا ہے۔' },
  'mfa.turnOff': { en: 'Turn off', ur: 'بند کریں' },
  'mfa.turnOffHint': { en: 'To turn it off, enter a current code from your authenticator app.', ur: 'بند کرنے کے لیے آتھنٹیکیٹر ایپ کا موجودہ کوڈ درج کریں۔' },
  'mfa.turnedOff': { en: 'Two-step sign-in is now off.', ur: 'دو مرحلوں والا سائن اِن اب بند ہے۔' },
} satisfies Record<string, Entry>;
