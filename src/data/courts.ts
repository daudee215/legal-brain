/**
 * The courts list that ships with the app (never stored in the database).
 * Kept in its own file so the public client status page can name a court without shipping the demo data.
 */
import type { Court } from '../types';

export const courts: Court[] = [
  { id: 'sc', name: 'Supreme Court of Pakistan', shortName: 'SC', level: 'SC', city: 'Islamabad', statusUrl: 'https://www.supremecourt.gov.pk' },
  { id: 'fcc', name: 'Federal Constitutional Court', shortName: 'FCC', level: 'FCC', city: 'Islamabad', statusUrl: 'https://www.fccp.gov.pk/online-case-information' },
  { id: 'lhc', name: 'Lahore High Court', shortName: 'LHC', level: 'HC', city: 'Lahore', statusUrl: 'https://www.lhc.gov.pk' },
  { id: 'ihc', name: 'Islamabad High Court', shortName: 'IHC', level: 'HC', city: 'Islamabad', statusUrl: 'https://www.ihc.gov.pk' },
  { id: 'shc', name: 'Sindh High Court', shortName: 'SHC', level: 'HC', city: 'Karachi', statusUrl: 'https://sindhhighcourt.gov.pk/causelist.php' },
  { id: 'cjl', name: 'Civil Courts Lahore', shortName: 'Civil Lhr', level: 'District', city: 'Lahore', statusUrl: 'https://www.lhc.gov.pk' },
  { id: 'phc', name: 'Peshawar High Court', shortName: 'PHC', level: 'HC', city: 'Peshawar', statusUrl: 'https://www.peshawarhighcourt.gov.pk/app/site/4/p/Causelists_List.html' },
  { id: 'ict-east', name: 'District Courts Islamabad (East)', shortName: 'ICT East', level: 'District', city: 'Islamabad', statusUrl: 'https://mis.ihc.gov.pk/frmCausLst' },
  { id: 'ict-west', name: 'District Courts Islamabad (West)', shortName: 'ICT West', level: 'District', city: 'Islamabad', statusUrl: 'https://mis.ihc.gov.pk/frmCausLst' },
];
