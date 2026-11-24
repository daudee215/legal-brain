/**
 * Demo data for the Phase 0 draft. All people, cases and judgments are invented.
 * Statute section texts are short plain-English summaries, not official text.
 * Hearing dates are relative to "today" (PKT) so the dashboard is always populated.
 */
import { addDays, pktIso, todayKey } from '../lib/dates';
import type { Case, Db, FeePayment, Hearing } from '../types';
import { courts as shippedCourts } from './courts';

const T = todayKey();
const d = (n: number, hhmm = '09:00') => pktIso(addDays(T, n), hhmm);
const k = (n: number) => addDays(T, n);

// The courts list lives in its own file so the public status page can use it without the demo data.
const courts: Db['courts'] = shippedCourts;

const members: Db['chamber']['members'] = [
  { id: 'm1', name: 'Ayesha Khan', email: 'ayesha@example.pk', role: 'senior' },
  { id: 'm2', name: 'Bilal Ahmed', email: 'bilal@example.pk', role: 'junior' },
  { id: 'm3', name: 'Rashid Mehmood', email: 'rashid@example.pk', role: 'clerk' },
];

const clients: Db['clients'] = [
  { id: 'c1', name: 'Muhammad Usman', phone: '0300-1234567', cnicMasked: '35202-*****-1', city: 'Lahore', caseIds: ['k1', 'k9'] },
  { id: 'c2', name: 'Fatima Bibi', phone: '0321-7654321', cnicMasked: '35201-*****-4', city: 'Lahore', caseIds: ['k2'] },
  { id: 'c3', name: 'Zahid Traders (Pvt) Ltd', phone: '042-35761234', cnicMasked: 'NTN 1234567-8', city: 'Lahore', caseIds: ['k3', 'k10'] },
  { id: 'c4', name: 'Sana Iqbal', phone: '0333-2223344', cnicMasked: '61101-*****-2', city: 'Islamabad', caseIds: ['k4', 'k11'] },
  { id: 'c5', name: 'Haji Abdul Ghafoor', phone: '0345-9988776', cnicMasked: '42101-*****-7', city: 'Karachi', caseIds: ['k5'] },
  { id: 'c6', name: 'Imran Siddiqui', phone: '0312-4455667', cnicMasked: '35202-*****-9', city: 'Lahore', caseIds: ['k6', 'k12'] },
  { id: 'c7', name: 'Nadia Hussain', phone: '0301-5566778', cnicMasked: '61101-*****-6', city: 'Islamabad', caseIds: ['k7', 'k13'] },
  { id: 'c8', name: 'Pak Agro Industries', phone: '021-34567890', cnicMasked: 'NTN 7654321-0', city: 'Karachi', caseIds: ['k8', 'k14'] },
];

function h(n: number, proceedings: string, next?: number): Hearing {
  return { date: d(n), proceedings, nextDate: next === undefined ? undefined : d(next) };
}

const cases: Case[] = [
  {
    id: 'k1', chamberId: 'ch1', caseNo: 'Crl. Misc. 4521-B/2026', title: 'Muhammad Usman v. The State', category: 'Criminal',
    courtId: 'lhc', judge: 'Hon. Judge (Single Bench-IV)', stage: 'Arguments on bail', status: 'pending', filedOn: k(-40),
    nextHearing: d(0, '09:00'), clientId: 'c1', assignedTo: ['m1', 'm2'],
    hearings: [h(-35, 'Notice issued to the State; record requisitioned.', -20), h(-20, 'Report of police not received; adjourned.', -7), h(-7, 'Partial arguments heard; adjourned for remaining arguments.', 0)],
  },
  {
    id: 'k2', chamberId: 'ch1', caseNo: 'Family Suit 812/2026', title: 'Fatima Bibi v. Kamran Ali (Maintenance)', category: 'Family',
    courtId: 'cjl', judge: 'Judge Family Court-III', stage: 'Evidence of plaintiff', status: 'pending', filedOn: k(-120),
    nextHearing: d(0, '10:30'), clientId: 'c2', assignedTo: ['m2'],
    hearings: [h(-100, 'Pre-trial reconciliation failed.', -60), h(-60, 'Issues framed.', -14), h(-14, 'PW-1 examined in chief.', 0)],
  },
  {
    id: 'k3', chamberId: 'ch1', caseNo: 'W.P. 30112/2026', title: 'Zahid Traders v. Federation of Pakistan', category: 'Tax',
    courtId: 'lhc', judge: 'Hon. Judge (Single Bench-IX)', stage: 'Reply awaited', status: 'adjourned', filedOn: k(-60),
    nextHearing: d(0, '11:00'), clientId: 'c3', assignedTo: ['m1'],
    hearings: [h(-55, 'Notice; interim relief granted till next date.', -21), h(-21, 'Respondents sought time for para-wise comments.', 0)],
  },
  {
    id: 'k4', chamberId: 'ch1', caseNo: 'W.P. 2210/2026', title: 'Sana Iqbal v. Capital Development Authority', category: 'Service',
    courtId: 'ihc', judge: 'Hon. Judge (Single Bench-II)', stage: 'Final arguments', status: 'pending', filedOn: k(-90),
    nextHearing: d(1, '09:30'), clientId: 'c4', assignedTo: ['m1', 'm2'],
    hearings: [h(-80, 'Comments filed by CDA.', -30), h(-30, 'Rejoinder filed; fixed for arguments.', 1)],
  },
  {
    id: 'k5', chamberId: 'ch1', caseNo: 'Suit 1145/2025', title: 'Haji Abdul Ghafoor v. Karachi Development Authority', category: 'Civil',
    courtId: 'shc', judge: 'Hon. Judge (Original Side)', stage: 'Evidence of defendants', status: 'pending', filedOn: k(-400),
    nextHearing: d(1, '11:00'), clientId: 'c5', assignedTo: ['m1'],
    hearings: [h(-200, 'Issues settled; commissioner appointed for evidence.', -90), h(-90, 'Plaintiff evidence closed.', 1)],
  },
  {
    id: 'k6', chamberId: 'ch1', caseNo: 'Rent Petition 77/2026', title: 'Imran Siddiqui v. Shahbaz Ahmed (Ejectment)', category: 'Rent',
    courtId: 'cjl', judge: 'Rent Controller-II', stage: 'Leave to contest', status: 'pending', filedOn: k(-30),
    nextHearing: d(3, '10:00'), clientId: 'c6', assignedTo: ['m2'],
    hearings: [h(-25, 'Notice issued to respondent.', -5), h(-5, 'Respondent filed application for leave to contest.', 3)],
  },
  {
    id: 'k7', chamberId: 'ch1', caseNo: 'Const. P. 18/2026', title: 'Nadia Hussain v. Federation (Right to Information)', category: 'Constitutional',
    courtId: 'fcc', judge: 'Bench of three Hon’ble Judges', stage: 'Pre-admission notice', status: 'pending', filedOn: k(-20),
    nextHearing: d(4, '10:00'), clientId: 'c7', assignedTo: ['m1'],
    hearings: [h(-15, 'Office objections removed; fixed for hearing.', 4)],
  },
  {
    id: 'k8', chamberId: 'ch1', caseNo: 'C.P.L.A. 902-K/2026', title: 'Pak Agro Industries v. Federal Board of Revenue', category: 'Tax',
    courtId: 'sc', judge: 'Bench of two Hon’ble Judges', stage: 'Leave hearing', status: 'reserved', filedOn: k(-150),
    nextHearing: d(6, '09:00'), clientId: 'c8', assignedTo: ['m1'],
    hearings: [h(-110, 'Notice to respondents.', -40), h(-40, 'Arguments heard; judgment reserved, to be announced.', 6)],
  },
  {
    id: 'k9', chamberId: 'ch1', caseNo: 'Crl. Appeal 330/2025', title: 'Muhammad Usman v. The State (Conviction u/s 489-F PPC)', category: 'Criminal',
    courtId: 'lhc', judge: 'Hon. Judge (Criminal Bench)', stage: 'Awaiting fixation', status: 'pending', filedOn: k(-300),
    clientId: 'c1', assignedTo: ['m2'],
    hearings: [h(-280, 'Admitted for regular hearing; sentence suspended.')],
  },
  {
    id: 'k10', chamberId: 'ch1', caseNo: 'Banking Suit 45/2026', title: 'Allied Bank Ltd v. Zahid Traders', category: 'Banking',
    courtId: 'lhc', judge: 'Hon. Judge (Banking Court)', stage: 'Leave to defend', status: 'adjourned', filedOn: k(-75),
    nextHearing: d(9, '11:30'), clientId: 'c3', assignedTo: ['m1'],
    hearings: [h(-60, 'PLA filed by defendant.', -10), h(-10, 'Arguments on PLA part-heard.', 9)],
  },
  {
    id: 'k11', chamberId: 'ch1', caseNo: 'Civil Revision 512/2024', title: 'Sana Iqbal v. Mst. Rukhsana', category: 'Civil',
    courtId: 'ihc', judge: 'Hon. Judge (Single Bench-I)', stage: 'Decided', status: 'decided', filedOn: k(-700),
    clientId: 'c4', assignedTo: ['m1'], result: 'Revision allowed; impugned judgments set aside and suit decreed in favour of petitioner.',
    hearings: [h(-400, 'Arguments heard.', -380), h(-380, 'Judgment announced: revision allowed.')],
  },
  {
    id: 'k12', chamberId: 'ch1', caseNo: 'Guardian Petition 210/2026', title: 'Imran Siddiqui v. Mst. Hina (Custody)', category: 'Family',
    courtId: 'cjl', judge: 'Guardian Judge-I', stage: 'Meeting schedule', status: 'pending', filedOn: k(-50),
    nextHearing: d(12, '10:00'), clientId: 'c6', assignedTo: ['m2'],
    hearings: [h(-45, 'Interim meeting schedule fixed.', -3), h(-3, 'Report of meeting submitted.', 12)],
  },
  {
    id: 'k13', chamberId: 'ch1', caseNo: 'I.C.A. 88/2026', title: 'Nadia Hussain v. NADRA', category: 'Service',
    courtId: 'ihc', judge: 'Division Bench', stage: 'Disposed of', status: 'disposed', filedOn: k(-200),
    clientId: 'c7', assignedTo: ['m1'], result: 'Disposed of with direction to respondents to decide representation within 30 days.',
    hearings: [h(-150, 'Disposed of with directions.')],
  },
  {
    id: 'k14', chamberId: 'ch1', caseNo: 'J.M. 14/2026', title: 'Pak Agro Industries v. Registrar of Companies', category: 'Corporate',
    courtId: 'shc', judge: 'Hon. Judge (Company Bench)', stage: 'Notice', status: 'pending', filedOn: k(-10),
    nextHearing: d(16, '09:30'), clientId: 'c8', assignedTo: ['m1', 'm2'],
    hearings: [h(-8, 'Notice issued to SECP and Registrar.', 16)],
  },
];

const causeList: Db['causeList'] = [
  { date: k(0), courtId: 'lhc', bench: 'Single Bench-IV', courtRoom: '12', srNo: 7, caseId: 'k1' },
  { date: k(0), courtId: 'lhc', bench: 'Single Bench-IX', courtRoom: '21', srNo: 15, caseId: 'k3' },
  { date: k(0), courtId: 'cjl', bench: 'Family Court-III', courtRoom: 'Model Town', srNo: 22, caseId: 'k2' },
  { date: k(1), courtId: 'ihc', bench: 'Single Bench-II', courtRoom: '2', srNo: 4, caseId: 'k4' },
  { date: k(1), courtId: 'shc', bench: 'Original Side', courtRoom: '9', srNo: 31, caseId: 'k5' },
];

const S = (no: string, heading: string, text: string) => ({ no, heading, text });

const statutes: Db['statutes'] = [
  {
    id: 'constitution-1973', title: 'Constitution of the Islamic Republic of Pakistan', year: 1973, jurisdiction: 'Federal', category: 'Constitutional',
    sourceUrl: 'https://pakistancode.gov.pk', sections: [
      S('4', 'Right of individuals to be dealt with in accordance with law', 'Every person is entitled to the protection of law and to be treated in accordance with law.'),
      S('10A', 'Right to fair trial', 'For the determination of civil rights and obligations or any criminal charge, a person is entitled to a fair trial and due process.'),
      S('19A', 'Right to information', 'Every citizen has the right to access information in all matters of public importance, subject to reasonable restrictions imposed by law.'),
      S('199', 'Jurisdiction of High Court', 'A High Court may, on application of an aggrieved party, make orders in the nature of writs where no other adequate remedy is provided by law.'),
    ],
  },
  {
    id: 'crpc-1898', title: 'Code of Criminal Procedure', year: 1898, jurisdiction: 'Federal', category: 'Criminal',
    sourceUrl: 'https://pakistancode.gov.pk', sections: [
      S('154', 'Information in cognizable cases', 'Information relating to the commission of a cognizable offence given to the officer in charge of a police station is to be reduced into writing (FIR).'),
      S('497', 'When bail may be taken in case of non-bailable offence', 'Governs grant of bail in non-bailable offences, including the prohibitory clause and grounds of further inquiry.'),
      S('498', 'Power to direct admission to bail or reduction of bail', 'The High Court or Court of Session may direct that any person be admitted to bail, including pre-arrest bail.'),
      S('561-A', 'Saving of inherent powers of High Court', 'Nothing in the Code limits the inherent power of the High Court to prevent abuse of process or secure the ends of justice.'),
    ],
  },
  {
    id: 'ppc-1860', title: 'Pakistan Penal Code', year: 1860, jurisdiction: 'Federal', category: 'Criminal',
    sourceUrl: 'https://pakistancode.gov.pk', sections: [
      S('302', 'Punishment of qatl-i-amd', 'Prescribes punishment for intentional murder, as qisas, death or imprisonment for life as ta’zir.'),
      S('420', 'Cheating and dishonestly inducing delivery of property', 'Punishment for cheating and thereby dishonestly inducing delivery of property.'),
      S('489-F', 'Dishonestly issuing a cheque', 'Punishment for dishonestly issuing a cheque towards repayment of a loan or fulfilment of an obligation which is dishonoured.'),
    ],
  },
  {
    id: 'cpc-1908', title: 'Code of Civil Procedure', year: 1908, jurisdiction: 'Federal', category: 'Civil',
    sourceUrl: 'https://pakistancode.gov.pk', sections: [
      S('9', 'Courts to try all civil suits unless barred', 'Courts have jurisdiction to try all suits of a civil nature except those expressly or impliedly barred.'),
      S('12(2)', 'Setting aside decree obtained by fraud', 'A person challenging a judgment on the plea of fraud, misrepresentation or want of jurisdiction shall apply to the court which passed it.'),
      S('115', 'Revision', 'The High Court may call for the record of a case decided by a subordinate court and interfere for jurisdictional error.'),
      S('O. XXXIX R. 1-2', 'Temporary injunctions', 'Court may grant temporary injunction where property is in danger of being wasted or alienated, or to restrain breach.'),
    ],
  },
  {
    id: 'qso-1984', title: 'Qanun-e-Shahadat Order', year: 1984, jurisdiction: 'Federal', category: 'Evidence',
    sourceUrl: 'https://pakistancode.gov.pk', sections: [
      S('17', 'Competence and number of witnesses', 'Sets out competence of witnesses and the number required in matters of financial obligations.'),
      S('79', 'Proof of execution of document required by law to be attested', 'A document required by law to be attested shall not be used as evidence until two attesting witnesses are called.'),
    ],
  },
  {
    id: 'limitation-1908', title: 'Limitation Act', year: 1908, jurisdiction: 'Federal', category: 'Civil',
    sourceUrl: 'https://pakistancode.gov.pk', sections: [
      S('3', 'Dismissal of suits etc. instituted after period of limitation', 'Every suit, appeal or application made after the prescribed period shall be dismissed, although limitation is not set up as a defence.'),
      S('5', 'Extension of period in certain cases', 'An appeal or application may be admitted after the period if sufficient cause is shown for not filing it in time.'),
      S('12', 'Exclusion of time in legal proceedings', 'Time requisite for obtaining a copy of the decree or order appealed from is excluded in computing limitation.'),
    ],
  },
  {
    id: 'family-courts-1964', title: 'Family Courts Act', year: 1964, jurisdiction: 'Federal', category: 'Family',
    sourceUrl: 'https://pakistancode.gov.pk', sections: [
      S('5', 'Jurisdiction', 'Family Courts have exclusive jurisdiction over dissolution of marriage, dower, maintenance, custody, guardianship and related matters.'),
      S('10', 'Pre-trial', 'The Family Court shall make an effort to effect a compromise or reconciliation between the parties.'),
      S('17A', 'Interim order for maintenance', 'The Family Court may pass an interim order for maintenance at any stage of proceedings.'),
    ],
  },
  {
    id: 'punjab-rent-2009', title: 'Punjab Rented Premises Act', year: 2009, jurisdiction: 'Punjab', category: 'Rent',
    sourceUrl: 'https://punjabcode.punjab.gov.pk', sections: [
      S('15', 'Eviction of tenant', 'A landlord may seek eviction of a tenant on grounds including default in payment of rent and personal need.'),
      S('22', 'Leave to contest', 'A respondent seeking to contest an eviction application shall apply for leave to contest within the prescribed time.'),
    ],
  },
];

const judgments: Db['judgments'] = [
  { id: 'j1', courtId: 'sc', title: 'Tariq Bashir v. The State (illustrative)', caseNo: 'Crl. Petition 101/2026', date: k(-30), judges: ['Hon. Judge A', 'Hon. Judge B'], summary: 'Bail in offences not falling within the prohibitory clause of s.497 CrPC is a rule and refusal an exception.', tags: ['bail', '497 CrPC', 'prohibitory clause'], statutesCited: ['crpc-1898'] },
  { id: 'j2', courtId: 'lhc', title: 'Asghar Ali v. Additional Sessions Judge (illustrative)', caseNo: 'W.P. 1203/2026', date: k(-55), judges: ['Hon. Judge C'], summary: 'Where a cheque is issued as security and not towards repayment, s.489-F PPC may not be attracted; matter remanded.', tags: ['489-F', 'cheque', 'quashment'], statutesCited: ['ppc-1860', 'crpc-1898'] },
  { id: 'j3', courtId: 'ihc', title: 'Rabia Khan v. Federation (illustrative)', caseNo: 'W.P. 3301/2025', date: k(-90), judges: ['Hon. Judge D'], summary: 'Public bodies must decide requests for information within statutory timelines; Article 19A is an enforceable right.', tags: ['19A', 'right to information', 'writ'], statutesCited: ['constitution-1973'] },
  { id: 'j4', courtId: 'shc', title: 'Karachi Builders v. KDA (illustrative)', caseNo: 'Suit 900/2024', date: k(-120), judges: ['Hon. Judge E'], summary: 'Temporary injunction granted where prima facie case, balance of convenience and irreparable loss were shown.', tags: ['injunction', 'Order XXXIX', 'civil'], statutesCited: ['cpc-1908'] },
  { id: 'j5', courtId: 'lhc', title: 'Mst. Saima v. Judge Family Court (illustrative)', caseNo: 'W.P. 4410/2026', date: k(-20), judges: ['Hon. Judge F'], summary: 'Interim maintenance under s.17A must be fixed considering the husband’s means; non-payment may lead to striking off defence.', tags: ['maintenance', 'family', '17A'], statutesCited: ['family-courts-1964'] },
  { id: 'j6', courtId: 'sc', title: 'Federal Board of Revenue v. M/s Textile Mills (illustrative)', caseNo: 'C.A. 512/2025', date: k(-160), judges: ['Hon. Judge G', 'Hon. Judge H', 'Hon. Judge I'], summary: 'Fiscal statutes are construed strictly; a taxing provision cannot be extended by implication.', tags: ['tax', 'interpretation', 'fiscal statute'], statutesCited: [] },
  { id: 'j7', courtId: 'lhc', title: 'Shahid Mehmood v. Rent Controller (illustrative)', caseNo: 'W.P. 2201/2026', date: k(-70), judges: ['Hon. Judge J'], summary: 'Leave to contest filed beyond the statutory period cannot be entertained; eviction order upheld.', tags: ['rent', 'leave to contest', 'eviction'], statutesCited: ['punjab-rent-2009'] },
  { id: 'j8', courtId: 'fcc', title: 'Province of Punjab v. Federation (illustrative)', caseNo: 'Const. P. 3/2026', date: k(-15), judges: ['Bench of five'], summary: 'Questions of federal-provincial legislative competence are examined with reference to the Federal Legislative List.', tags: ['federalism', 'constitutional'], statutesCited: ['constitution-1973'] },
  { id: 'j9', courtId: 'ihc', title: 'Ahmed Raza v. NADRA (illustrative)', caseNo: 'W.P. 780/2026', date: k(-45), judges: ['Hon. Judge K'], summary: 'A civil servant is entitled to a reasoned decision on a departmental representation before an adverse action.', tags: ['service', 'due process', '10A'], statutesCited: ['constitution-1973'] },
  { id: 'j10', courtId: 'sc', title: 'Ghulam Rasool v. Muhammad Din (illustrative)', caseNo: 'C.P. 2290/2025', date: k(-200), judges: ['Hon. Judge L', 'Hon. Judge M'], summary: 'Condonation of delay under s.5 Limitation Act requires each day’s delay to be explained.', tags: ['limitation', 'condonation', 'section 5'], statutesCited: ['limitation-1908'] },
];

const templates: Db['templates'] = [
  {
    id: 't-bail', title: 'Post-arrest Bail Petition u/s 497 CrPC', category: 'Criminal', court: 'High Court / Court of Session',
    fields: [
      { key: 'court', label: 'Court', type: 'text' },
      { key: 'petitioner', label: 'Petitioner (accused)', type: 'text' },
      { key: 'fir_no', label: 'FIR No. & date', type: 'text' },
      { key: 'police_station', label: 'Police Station', type: 'text' },
      { key: 'offence', label: 'Offence (sections)', type: 'text' },
      { key: 'grounds', label: 'Grounds', type: 'textarea' },
      { key: 'advocate', label: 'Advocate', type: 'text' },
    ],
    body: `IN THE {{court}}

Criminal Miscellaneous No. ______ / 20__

{{petitioner}}  ......... Petitioner
VERSUS
The State  ......... Respondent

FIR No. {{fir_no}}, Police Station {{police_station}}, Offence u/s {{offence}}

PETITION UNDER SECTION 497 Cr.P.C. FOR GRANT OF POST-ARREST BAIL

Respectfully Sheweth:

1. That the petitioner has been falsely implicated in the above-mentioned FIR.

2. GROUNDS:
{{grounds}}

PRAYER
It is, therefore, most respectfully prayed that the petitioner may kindly be admitted to post-arrest bail in the above case.

Through
{{advocate}}
Advocate High Court`,
  },
  {
    id: 't-declaration', title: 'Suit for Declaration and Permanent Injunction', category: 'Civil', court: 'Civil Court',
    fields: [
      { key: 'court', label: 'Court', type: 'text' },
      { key: 'plaintiff', label: 'Plaintiff', type: 'text' },
      { key: 'defendant', label: 'Defendant', type: 'text' },
      { key: 'property', label: 'Suit property', type: 'textarea' },
      { key: 'facts', label: 'Facts', type: 'textarea' },
      { key: 'advocate', label: 'Advocate', type: 'text' },
    ],
    body: `IN THE COURT OF {{court}}

{{plaintiff}}  ......... Plaintiff
VERSUS
{{defendant}}  ......... Defendant

SUIT FOR DECLARATION AND PERMANENT INJUNCTION

Respectfully Sheweth:

1. That the plaintiff is the lawful owner in possession of the following property:
{{property}}

2. FACTS:
{{facts}}

3. That the cause of action arose within the territorial jurisdiction of this Honourable Court.

PRAYER
It is prayed that a decree for declaration be passed in favour of the plaintiff, and the defendant be permanently restrained from interfering with the suit property.

Through
{{advocate}}
Advocate`,
  },
  {
    id: 't-vakalatnama', title: 'Vakalatnama', category: 'Civil', court: 'Any Court',
    fields: [
      { key: 'court', label: 'Court', type: 'text' },
      { key: 'case_title', label: 'Case title', type: 'text' },
      { key: 'client', label: 'Client', type: 'text' },
      { key: 'advocate', label: 'Advocate', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
    body: `VAKALATNAMA

IN THE {{court}}

In the matter of: {{case_title}}

I/We, {{client}}, do hereby appoint and retain {{advocate}}, Advocate, to appear, plead and act on my/our behalf in the above matter, and to do all acts necessary for its conduct, including filing and withdrawing documents and receiving payments.

Dated: {{date}}

Signature of Client: ____________          Accepted: ____________
                                                    {{advocate}}`,
  },
  {
    id: 't-ws', title: 'Written Statement', category: 'Civil', court: 'Civil Court',
    fields: [
      { key: 'court', label: 'Court', type: 'text' },
      { key: 'suit_no', label: 'Suit No.', type: 'text' },
      { key: 'plaintiff', label: 'Plaintiff', type: 'text' },
      { key: 'defendant', label: 'Defendant', type: 'text' },
      { key: 'preliminary', label: 'Preliminary objections', type: 'textarea' },
      { key: 'reply', label: 'Reply on facts', type: 'textarea' },
      { key: 'advocate', label: 'Advocate', type: 'text' },
    ],
    body: `IN THE COURT OF {{court}}

Suit No. {{suit_no}}

{{plaintiff}}  ......... Plaintiff
VERSUS
{{defendant}}  ......... Defendant

WRITTEN STATEMENT ON BEHALF OF THE DEFENDANT

PRELIMINARY OBJECTIONS:
{{preliminary}}

REPLY ON FACTS:
{{reply}}

It is prayed that the suit may be dismissed with costs.

Through
{{advocate}}
Advocate`,
  },
  {
    id: 't-writ', title: 'Writ Petition under Article 199', category: 'Constitutional', court: 'High Court',
    fields: [
      { key: 'court', label: 'High Court', type: 'text' },
      { key: 'petitioner', label: 'Petitioner', type: 'text' },
      { key: 'respondents', label: 'Respondents', type: 'textarea' },
      { key: 'impugned', label: 'Impugned order / action', type: 'text' },
      { key: 'grounds', label: 'Grounds', type: 'textarea' },
      { key: 'advocate', label: 'Advocate', type: 'text' },
    ],
    body: `IN THE {{court}}

Writ Petition No. ______ / 20__

{{petitioner}}  ......... Petitioner
VERSUS
{{respondents}}  ......... Respondents

WRIT PETITION UNDER ARTICLE 199 OF THE CONSTITUTION OF THE ISLAMIC REPUBLIC OF PAKISTAN, 1973

Impugned: {{impugned}}

GROUNDS:
{{grounds}}

PRAYER
It is prayed that the impugned action be declared illegal, without lawful authority and of no legal effect.

Through
{{advocate}}
Advocate High Court`,
  },
];

const diary: Db['diary'] = [
  { id: 'd1', date: d(0, '08:00'), caseId: 'k1', authorId: 'm1', text: 'Carry certified copy of FIR and medical report. Cite the latest SC bail judgment on further inquiry.' },
  { id: 'd2', date: d(0, '08:15'), caseId: 'k2', authorId: 'm2', text: 'PW-2 (sister) confirmed attendance. Keep salary slips of defendant ready for cross.' },
  { id: 'd3', date: d(-1, '18:30'), authorId: 'm1', text: 'Bar Council election meeting at 4 pm Friday.' },
  { id: 'd4', date: d(-3, '17:00'), caseId: 'k3', authorId: 'm1', text: 'Client to send sales tax returns for last 3 years before next date.' },
  { id: 'd5', date: d(1, '07:45'), caseId: 'k4', authorId: 'm3', text: 'File brief to be collected from IHC photocopy shop; 3 sets.' },
  { id: 'd6', date: d(-7, '19:00'), caseId: 'k1', authorId: 'm2', text: 'Partial arguments went well; judge asked about recovery memo.' },
];

const news: Db['news'] = [
  { id: 'nw1', date: k(0), title: 'High Courts to expand e-filing for civil matters', source: 'Demo News', summary: 'Illustrative item: e-filing to be extended to civil miscellaneous applications from next month.' },
  { id: 'nw2', date: k(-1), title: 'Supreme Court Public Portal adds SMS alerts', source: 'Demo News', summary: 'Illustrative item: litigants can now subscribe to hearing alerts by case number.' },
  { id: 'nw3', date: k(-2), title: 'Punjab Bar Council announces CPD sessions', source: 'Demo News', summary: 'Illustrative item: continuing professional development sessions on new evidence technology.' },
  { id: 'nw4', date: k(-4), title: 'Amendments proposed to Family Courts Act', source: 'Demo News', summary: 'Illustrative item: draft bill proposes timelines for maintenance execution.' },
  { id: 'nw5', date: k(-6), title: 'Federal Constitutional Court issues new practice directions', source: 'Demo News', summary: 'Illustrative item: guidelines on filing and fixation of constitutional petitions.' },
  { id: 'nw6', date: k(-9), title: 'Sindh High Court launches advocate-wise case search app update', source: 'Demo News', summary: 'Illustrative item: improved advocate-wise search and cause list notifications.' },
];

const notifications: Db['notifications'] = [
  { id: 'n1', date: d(0, '07:00'), kind: 'hearing', title: '3 of your cases are fixed today', read: false, href: '/app/cause-list/' },
  { id: 'n2', date: d(0, '06:30'), kind: 'hearing', title: 'Sana Iqbal v. CDA fixed tomorrow at IHC, Court 2', read: false, href: '/app/cases/k4/' },
  { id: 'n3', date: d(-1, '16:00'), kind: 'judgment', title: 'New SC judgment on bail u/s 497 CrPC relevant to 1 case', read: false, href: '/app/case-law/j1/' },
  { id: 'n4', date: d(-2, '12:00'), kind: 'news', title: 'High Courts to expand e-filing', read: true, href: '/app/news/' },
  { id: 'n5', date: d(-3, '10:00'), kind: 'system', title: 'Bilal Ahmed joined your chamber', read: true, href: '/app/chamber/' },
  { id: 'n6', date: d(-5, '09:00'), kind: 'hearing', title: 'Judgment reserved in Pak Agro v. FBR', read: true, href: '/app/cases/k8/' },
  { id: 'n7', date: d(-8, '09:00'), kind: 'system', title: 'Welcome to Legal Brain', read: true },
  { id: 'n8', date: d(-9, '15:00'), kind: 'judgment', title: 'Limitation: SC on condonation of delay', read: true, href: '/app/case-law/j10/' },
];

const books: Db['books'] = [
  { id: 'b1', title: 'Commentary on the Code of Criminal Procedure (my copy)', author: 'Uploaded by owner', ownerId: 'm1', pages: 1840, addedOn: k(-200) },
  { id: 'b2', title: 'Law of Evidence — Qanun-e-Shahadat (my copy)', author: 'Uploaded by owner', ownerId: 'm1', pages: 1120, addedOn: k(-150) },
  { id: 'b3', title: 'Family Laws of Pakistan (my copy)', author: 'Uploaded by owner', ownerId: 'm1', pages: 760, addedOn: k(-90) },
  { id: 'b4', title: 'Civil Procedure Code with Rules (my copy)', author: 'Uploaded by owner', ownerId: 'm1', pages: 2010, addedOn: k(-30) },
];

const docs: Db['docs'] = [
  { id: 'f1', name: 'Bail petition - Usman.pdf', folder: 'Pleadings', caseId: 'k1', sizeKb: 412, uploadedOn: k(-40), uploadedBy: 'm2' },
  { id: 'f2', name: 'FIR 512-26 certified copy.pdf', folder: 'Evidence', caseId: 'k1', sizeKb: 220, uploadedOn: k(-39), uploadedBy: 'm3' },
  { id: 'f3', name: 'Order sheet 07-day.pdf', folder: 'Orders', caseId: 'k1', sizeKb: 95, uploadedOn: k(-7), uploadedBy: 'm3' },
  { id: 'f4', name: 'Plaint - maintenance.docx', folder: 'Pleadings', caseId: 'k2', sizeKb: 88, uploadedOn: k(-120), uploadedBy: 'm2' },
  { id: 'f5', name: 'Nikahnama.jpg', folder: 'Evidence', caseId: 'k2', sizeKb: 1310, uploadedOn: k(-118), uploadedBy: 'm3' },
  { id: 'f6', name: 'Writ petition - Zahid Traders.pdf', folder: 'Pleadings', caseId: 'k3', sizeKb: 640, uploadedOn: k(-60), uploadedBy: 'm1' },
  { id: 'f7', name: 'Interim order.pdf', folder: 'Orders', caseId: 'k3', sizeKb: 120, uploadedOn: k(-55), uploadedBy: 'm3' },
  { id: 'f8', name: 'Appointment letter.pdf', folder: 'Evidence', caseId: 'k4', sizeKb: 300, uploadedOn: k(-90), uploadedBy: 'm3' },
  { id: 'f9', name: 'Letter to CDA.docx', folder: 'Correspondence', caseId: 'k4', sizeKb: 45, uploadedOn: k(-85), uploadedBy: 'm2' },
  { id: 'f10', name: 'Judgment - revision allowed.pdf', folder: 'Orders', caseId: 'k11', sizeKb: 880, uploadedOn: k(-380), uploadedBy: 'm1' },
  { id: 'f11', name: 'Bar license renewal.pdf', folder: 'Personal', sizeKb: 150, uploadedOn: k(-20), uploadedBy: 'm1' },
  { id: 'f12', name: 'CPLA paper book.pdf', folder: 'Pleadings', caseId: 'k8', sizeKb: 5400, uploadedOn: k(-150), uploadedBy: 'm1' },
];

const P = (n: number, amount: number, mode: FeePayment['mode'], note?: string): FeePayment => ({ date: k(n), amount, mode, note });
const fees: Db['fees'] = [
  { caseId: 'k1', agreed: 150000, payments: [P(-40, 75000, 'Cash', 'Retainer'), P(-8, 25000, 'Bank transfer')] },
  { caseId: 'k2', agreed: 80000, payments: [P(-60, 40000, 'Cash', 'Retainer'), P(-12, 20000, 'Online')] },
  { caseId: 'k3', agreed: 350000, payments: [P(-50, 200000, 'Cheque', 'Retainer'), P(-5, 150000, 'Cheque', 'Final instalment')] },
  { caseId: 'k4', agreed: 120000, payments: [P(-30, 60000, 'Bank transfer', 'Retainer')] },
  { caseId: 'k5', agreed: 500000, payments: [P(-300, 200000, 'Cheque', 'Retainer'), P(-120, 100000, 'Cheque'), P(-25, 50000, 'Bank transfer')] },
  { caseId: 'k6', agreed: 60000, payments: [P(-45, 30000, 'Cash', 'Retainer')] },
  { caseId: 'k7', agreed: 200000, payments: [P(-70, 100000, 'Bank transfer', 'Retainer'), P(-2, 50000, 'Online')] },
  { caseId: 'k8', agreed: 750000, payments: [P(-160, 400000, 'Cheque', 'Retainer'), P(-15, 150000, 'Cheque')] },
  { caseId: 'k9', agreed: 180000, payments: [P(-200, 180000, 'Cash', 'Paid in full')] },
  { caseId: 'k10', agreed: 300000, payments: [P(-35, 100000, 'Bank transfer', 'Retainer')] },
  { caseId: 'k11', agreed: 90000, payments: [P(-500, 90000, 'Cash', 'Paid in full')] },
  { caseId: 'k12', agreed: 70000, payments: [P(-20, 35000, 'Online', 'Retainer')] },
  { caseId: 'k13', agreed: 150000, payments: [P(-28, 50000, 'Bank transfer', 'Retainer')] },
  { caseId: 'k14', agreed: 250000, payments: [P(-55, 125000, 'Cheque', 'Retainer'), P(-1, 25000, 'Online')] },
];

export const seed: Db = {
  chamber: { id: 'ch1', name: 'Khan & Associates', members },
  me: members[0],
  courts,
  clients,
  cases,
  causeList,
  statutes,
  judgments,
  templates,
  diary,
  news,
  notifications,
  books,
  docs,
  fees,
  tasks: [
    { id: 't1', title: 'Apply for certified copy of order dated last week', caseId: 'k6', assigneeId: 'm3', due: k(1), done: false, createdAt: d(-2) },
    { id: 't2', title: 'Prepare written arguments', caseId: 'k3', assigneeId: 'm2', due: k(3), done: false, createdAt: d(-4) },
    { id: 't3', title: 'Collect brief from photocopy shop (3 sets)', caseId: 'k4', assigneeId: 'm3', due: k(0), done: false, createdAt: d(-1) },
    { id: 't4', title: 'Call client for salary slips', caseId: 'k2', assigneeId: 'm2', due: k(-1), done: true, createdAt: d(-5) },
  ],
  deadlines: [
    { id: 'dl1', caseId: 'k9', remedyId: 'crim-appeal-hc', orderDate: k(-40), copyAppliedOn: k(-38), copyReadyOn: k(-30), note: 'Appeal against conviction u/s 489-F' },
  ],
  precedents: [
    { id: 'p1', citation: 'Illustrative: SC bail principle', title: 'Bail in non-prohibitory offences is the rule', court: 'Supreme Court', year: 2026, tags: ['bail', '497 CrPC'], note: 'Use for post-arrest bail where offence is outside the prohibitory clause.', caseIds: ['k1'] },
    { id: 'p2', citation: 'Illustrative: LHC 489-F security cheque', title: 'Security cheque does not attract 489-F', court: 'Lahore High Court', year: 2026, tags: ['489-F', 'cheque'], note: 'Distinguish where cheque was given as guarantee.', caseIds: ['k9'] },
  ],
  expenses: [
    { id: 'e1', caseId: 'k5', date: k(-60), amount: 15000, kind: 'Court fee', reimbursed: true },
    { id: 'e2', caseId: 'k8', date: k(-20), amount: 4500, kind: 'Photocopies', note: 'Paper books, 6 sets', reimbursed: false },
    { id: 'e3', caseId: 'k1', date: k(-8), amount: 1200, kind: 'Certified copy', reimbursed: false },
  ],
};
