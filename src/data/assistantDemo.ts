export interface DemoQA {
  prompt: string;
  keywords: string;
  answer: string;
  citations: { label: string; href: string }[];
}

/** Canned answers for the Phase 0 demo. The real assistant (Phase 5) answers from the chamber's documents and Pakistani law. */
export const assistantDemo: DemoQA[] = [
  {
    prompt: 'What are the grounds for post-arrest bail under section 497 CrPC?',
    keywords: 'bail 497 post-arrest grounds further inquiry prohibitory',
    answer:
      'Key grounds usually argued under s.497 CrPC:\n\n1. Offence not within the prohibitory clause — bail is the rule, refusal the exception.\n2. Case calls for further inquiry (s.497(2)) — e.g. delay in FIR, no recovery, contradictions.\n3. Statutory delay in conclusion of trial (third proviso).\n4. Accused is a woman, minor, or sick/infirm (first proviso).\n5. Co-accused with similar role already granted bail (rule of consistency).\n\nFor Muhammad Usman v. The State (fixed today at LHC), grounds 1 and 2 look strongest from your notes.',
    citations: [
      { label: 'S. 497 CrPC', href: '/app/laws/crpc-1898/#s-497' },
      { label: 'Tariq Bashir v. The State (demo)', href: '/app/case-law/j1/' },
      { label: 'Case: Muhammad Usman v. The State', href: '/app/cases/k1/' },
    ],
  },
  {
    prompt: 'What is the limitation for a civil revision, and can copy time be excluded?',
    keywords: 'limitation revision civil 115 copy time exclude section 12',
    answer:
      'A civil revision under s.115 CPC is generally filed within 90 days of the decision. Under s.12 of the Limitation Act, the time taken to obtain certified copies of the order is excluded when computing limitation. If you are late, an application under s.5 Limitation Act must explain each day of delay.\n\nUse the Limitation Calculator in Tools to work out the exact last date.',
    citations: [
      { label: 'S. 115 CPC', href: '/app/laws/cpc-1908/#s-115' },
      { label: 'S. 12 Limitation Act', href: '/app/laws/limitation-1908/#s-12' },
      { label: 'Ghulam Rasool v. Muhammad Din (demo)', href: '/app/case-law/j10/' },
      { label: 'Limitation Calculator', href: '/app/tasks/?tab=calculator' },
    ],
  },
  {
    prompt: 'Summarise the judgment on dishonoured cheques given as security (489-F).',
    keywords: 'summarise summary judgment 489-f cheque security',
    answer:
      'Asghar Ali v. Additional Sessions Judge (LHC, demo): the Court held that where a cheque was given only as security and not towards repayment of a loan or fulfilment of an obligation, the essential ingredient of s.489-F PPC may be missing. The matter was remanded for fresh decision.\n\nRelevance: your Crl. Appeal 330/2025 (Muhammad Usman) involves s.489-F — worth checking whether the cheque was security.',
    citations: [
      { label: 'Asghar Ali v. ASJ (demo)', href: '/app/case-law/j2/' },
      { label: 'S. 489-F PPC', href: '/app/laws/ppc-1860/#s-489-F' },
      { label: 'Case: Crl. Appeal 330/2025', href: '/app/cases/k9/' },
    ],
  },
  {
    prompt: 'Give me points for a written statement in a maintenance suit.',
    keywords: 'written statement maintenance family points defence',
    answer:
      'Suggested structure for the defendant’s written statement:\n\nPreliminary objections — jurisdiction of the Family Court; suit not maintainable as framed; concealment of material facts.\n\nOn facts — admit the marriage; deny refusal to maintain; set out payments actually made (attach proof); state the defendant’s real income; plead that the plaintiff left the house without lawful excuse, if true.\n\nNote: the Court may fix interim maintenance under s.17A at any stage.\n\nOpen the Written Statement template in Legal Drafting to turn these into a draft.',
    citations: [
      { label: 'S. 17A Family Courts Act', href: '/app/laws/family-courts-1964/#s-17A' },
      { label: 'Mst. Saima v. Judge Family Court (demo)', href: '/app/case-law/j5/' },
      { label: 'Written Statement template', href: '/app/drafting/t-ws/' },
    ],
  },
];
