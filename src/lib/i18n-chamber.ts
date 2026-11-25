import type { Entry } from './i18n-dict';

/** Urdu for the chamber screens. Keys are prefixed `chamber.`. */
export const CHAMBER = {
  // Page header
  'chamber.subtitle': { en: 'Your chamber — members share cases, dates and documents.', ur: 'آپ کا چیمبر — ممبر مقدمے، تاریخیں اور کاغذات مل کر دیکھتے ہیں۔' },
  'chamber.subtitleCloud': {
    en: 'Your chamber — members share cases, dates and documents. Fees are visible to seniors only.',
    ur: 'آپ کا چیمبر — ممبر مقدمے، تاریخیں اور کاغذات مل کر دیکھتے ہیں۔ فیس صرف سینئر کو نظر آتی ہے۔',
  },

  // Members table
  'chamber.col.member': { en: 'Member', ur: 'ممبر' },
  'chamber.col.email': { en: 'Email', ur: 'ای میل' },
  'chamber.col.role': { en: 'Role', ur: 'عہدہ' },
  'chamber.you': { en: '(you)', ur: '(آپ)' },
  'chamber.roleOf': { en: 'Role of {name}', ur: '{name} کا عہدہ' },
  'chamber.removeAria': { en: 'Remove {name}', ur: '{name} کو نکالیں' },
  'chamber.removeTitle': { en: 'Remove from chamber', ur: 'چیمبر سے نکالیں' },
  'chamber.removeConfirmTitle': { en: 'Remove {name}?', ur: 'کیا {name} کو نکالنا ہے؟' },
  'chamber.removeBody': {
    en: '{name} will immediately lose access to this chamber’s cases on every device.',
    ur: '{name} کو اس چیمبر کے مقدمے کسی بھی ڈیوائس پر فوراً نظر آنا بند ہو جائیں گے۔',
  },
  'chamber.removeConfirm': { en: 'Remove member', ur: 'ممبر کو نکالیں' },
  'chamber.removed': { en: '{name} removed', ur: '{name} کو نکال دیا گیا' },
  'chamber.nowRole': { en: '{name} is now {role}', ur: '{name} اب {role} ہیں' },

  // Role matrix
  'chamber.matrix.title': { en: 'What each role can do', ur: 'ہر عہدے والا کیا کر سکتا ہے' },
  'chamber.matrix.permission': { en: 'Permission', ur: 'اجازت' },
  'chamber.matrix.view': { en: 'View cases, cause lists, laws, case law, news', ur: 'مقدمے، کاز لسٹ، قوانین، عدالتی فیصلے اور خبریں دیکھنا' },
  'chamber.matrix.casesEdit': { en: 'Add & edit cases', ur: 'مقدمے شامل کرنا اور بدلنا' },
  'chamber.matrix.drafting': { en: 'Legal drafting', ur: 'قانونی ڈرافٹنگ' },
  'chamber.matrix.assistant': { en: 'AI assistant', ur: 'اے آئی اسسٹنٹ' },
  'chamber.matrix.library': { en: 'Private law-book shelf', ur: 'اپنی قانونی کتابوں کی الماری' },
  'chamber.matrix.diary': { en: 'Write in diary', ur: 'ڈائری میں لکھنا' },
  'chamber.matrix.upload': { en: 'Upload documents', ur: 'کاغذات اپ لوڈ کرنا' },
  'chamber.matrix.manage': { en: 'Invite & manage members', ur: 'ممبر بلانا اور سنبھالنا' },
  'chamber.matrix.billing': { en: 'Billing & subscription', ur: 'بلنگ اور سبسکرپشن' },
  'chamber.allowed': { en: 'Allowed', ur: 'اجازت ہے' },
  'chamber.notAllowed': { en: 'Not allowed', ur: 'اجازت نہیں' },

  // Invite form
  'chamber.invite.title': { en: 'Invite a member', ur: 'ممبر کو بلائیں' },
  'chamber.field.email': { en: 'Email', ur: 'ای میل' },
  'chamber.field.role': { en: 'Role', ur: 'عہدہ' },
  'chamber.roleJunior': { en: 'Junior', ur: 'جونیئر' },
  'chamber.roleClerk': { en: 'Clerk', ur: 'کلرک' },
  'chamber.roleSeniorCo': { en: 'Senior (co-owner)', ur: 'سینئر (شریک مالک)' },
  'chamber.sendInvite': { en: 'Send invite', ur: 'دعوت بھیجیں' },
  'chamber.inviteHint': {
    en: "They'll get an invite code to join {chamber} when they sign up.",
    ur: 'سائن اپ کرتے وقت انہیں {chamber} میں شامل ہونے کا دعوتی کوڈ مل جائے گا۔',
  },
  'chamber.demoToast': {
    en: 'Invite created in demo only — emails go out in Phase 2',
    ur: 'دعوت صرف ڈیمو میں بنی ہے — ای میل دوسرے مرحلے میں جائیں گی',
  },
  'chamber.onlySeniorLocal': {
    en: 'Only the senior advocate can invite or remove members.',
    ur: 'ممبر بلانا یا نکالنا صرف سینئر وکیل کا کام ہے۔',
  },
  'chamber.onlySenior': {
    en: 'Only a senior advocate can invite or remove members.',
    ur: 'ممبر بلانا یا نکالنا صرف سینئر وکیل کا کام ہے۔',
  },

  // Cloud invites
  'chamber.note': { en: 'Note (optional)', ur: 'نوٹ (چاہیں تو)' },
  'chamber.notePlaceholder': { en: 'e.g. for Bilal', ur: 'مثلاً بلال کے لیے' },
  'chamber.creating': { en: 'Creating…', ur: 'بن رہا ہے…' },
  'chamber.createLink': { en: 'Create invite link', ur: 'دعوتی لنک بنائیں' },
  'chamber.sendThisLink': {
    en: 'Send this link to your {role} (works once, for 14 days):',
    ur: 'یہ لنک اپنے {role} کو بھیجیں (ایک بار چلے گا، 14 دن تک):',
  },
  'chamber.inviteLinkAria': { en: 'Invite link', ur: 'دعوتی لنک' },
  'chamber.copy': { en: 'Copy', ur: 'کاپی' },
  'chamber.pending': { en: 'Pending invites', ur: 'زیرِ انتظار دعوتیں' },
  'chamber.noNote': { en: 'No note', ur: 'کوئی نوٹ نہیں' },
  'chamber.until': { en: 'until {date}', ur: '{date} تک' },
  'chamber.copyInviteAria': { en: 'Copy invite link', ur: 'دعوتی لنک کاپی کریں' },
  'chamber.revokeAria': { en: 'Revoke invite', ur: 'دعوت منسوخ کریں' },
  'chamber.revoked': { en: 'Invite revoked', ur: 'دعوت منسوخ ہو گئی' },
  'chamber.linkCopied': { en: 'Invite link copied', ur: 'دعوتی لنک کاپی ہو گیا' },
  'chamber.linkSelectCopy': { en: 'Select the link and copy it', ur: 'لنک چن کر خود کاپی کر لیں' },
  'chamber.shareText': {
    en: "You're invited to join {chamber} on Wakeel Pro as {role}. Open this link to join: {link}",
    ur: 'آپ کو Wakeel Pro پر {chamber} میں بطور {role} شامل ہونے کی دعوت ہے۔ شامل ہونے کے لیے یہ لنک کھولیں: {link}',
  },

  // Leave chamber
  'chamber.leave': { en: 'Leave chamber', ur: 'چیمبر چھوڑیں' },
  'chamber.leaveBody': {
    en: 'Stop being a member of {chamber}. Your account stays; you can join or create another chamber.',
    ur: '{chamber} کی ممبرشپ ختم کریں۔ آپ کا اکاؤنٹ رہے گا؛ آپ کسی اور چیمبر میں شامل ہو سکتے ہیں یا نیا بنا سکتے ہیں۔',
  },
  'chamber.leaveConfirmTitle': { en: 'Leave {chamber}?', ur: 'کیا {chamber} چھوڑنا ہے؟' },
  'chamber.leaveConfirmBody': {
    en: 'You will stop seeing this chamber’s cases on every device. A senior can invite you again later.',
    ur: 'اس چیمبر کے مقدمے آپ کو ہر ڈیوائس پر نظر آنا بند ہو جائیں گے۔ سینئر بعد میں آپ کو دوبارہ بلا سکتا ہے۔',
  },
  'chamber.leaveLastMember': {
    en: 'You are the last member — nobody will be able to open this chamber after you leave.',
    ur: 'آپ آخری ممبر ہیں — آپ کے جانے کے بعد یہ چیمبر کوئی نہیں کھول سکے گا۔',
  },
  'chamber.leaveOnlySenior': {
    en: 'You are the only senior. Make another member senior before leaving, so someone can still manage the chamber.',
    ur: 'آپ اکیلے سینئر ہیں۔ جانے سے پہلے کسی اور ممبر کو سینئر بنا دیں تاکہ چیمبر کوئی سنبھال سکے۔',
  },
} satisfies Record<string, Entry>;
