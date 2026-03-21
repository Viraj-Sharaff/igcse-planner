export const SUBJECTS = [
  {
    id: 'addmaths',
    name: 'Additional Maths',
    shortName: 'Add Maths',
    code: '0606',
    color: '#3b82f6',
    papers: [
      { id: 'addmaths_p1', label: 'Paper 1', duration: 120 },
      { id: 'addmaths_p2', label: 'Paper 2', duration: 120 },
    ],
  },
  {
    id: 'intmaths',
    name: "Int'l Mathematics",
    shortName: 'Int Maths',
    code: '0607',
    color: '#818cf8',
    papers: [
      { id: 'intmaths_p2', label: 'Paper 2', duration: 45 },
      { id: 'intmaths_p4', label: 'Paper 4', duration: 135 },
      { id: 'intmaths_p6', label: 'Paper 6', duration: 60 },
    ],
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    shortName: 'Chemistry',
    code: '0620',
    color: '#10b981',
    papers: [
      { id: 'chemistry_p2', label: 'Paper 2', duration: 45 },
      { id: 'chemistry_p4', label: 'Paper 4', duration: 75 },
      { id: 'chemistry_p6', label: 'Paper 6', duration: 60 },
    ],
  },
  {
    id: 'physics',
    name: 'Physics',
    shortName: 'Physics',
    code: '0625',
    color: '#06b6d4',
    papers: [
      { id: 'physics_p2', label: 'Paper 2', duration: 45 },
      { id: 'physics_p4', label: 'Paper 4', duration: 75 },
      { id: 'physics_p6', label: 'Paper 6', duration: 60 },
    ],
  },
  {
    id: 'economics',
    name: 'Economics',
    shortName: 'Economics',
    code: '0455',
    color: '#f59e0b',
    papers: [
      { id: 'economics_p1', label: 'Paper 1', duration: 90 },
      { id: 'economics_p2', label: 'Paper 2', duration: 150 },
    ],
  },
  {
    id: 'cs',
    name: 'Computer Science',
    shortName: 'CS',
    code: '0478',
    color: '#f97316',
    papers: [
      { id: 'cs_p1', label: 'Paper 1', duration: 105 },
      { id: 'cs_p2', label: 'Paper 2', duration: 105 },
    ],
  },
  {
    id: 'business',
    name: 'Business Studies',
    shortName: 'Business',
    code: '0450',
    color: '#ef4444',
    papers: [
      { id: 'business_p1', label: 'Paper 1', duration: 90 },
      { id: 'business_p2', label: 'Paper 2', duration: 90 },
    ],
  },
  {
    id: 'fle',
    name: 'First Language English',
    shortName: 'FLE',
    code: '0500',
    color: '#a855f7',
    papers: [
      { id: 'fle_p1', label: 'Paper 1', duration: 120 },
      { id: 'fle_p2', label: 'Paper 2', duration: 120 },
    ],
  },
  {
    id: 'lit',
    name: 'Literature in English',
    shortName: 'Literature',
    code: '0475',
    color: '#ec4899',
    papers: [
      { id: 'lit_session', label: 'Study Session', duration: 60 },
    ],
  },
];

export const TUTORS = [
  {
    id: 'shweta',
    name: 'Shweta',
    subjects: ['Add Maths', 'Int Maths', 'Chemistry', 'Physics'],
    duration: 60,
    color: '#818cf8',
  },
  {
    id: 'ramaa',
    name: 'Ramaa',
    subjects: ['First Language English'],
    duration: 60,
    color: '#c084fc',
  },
  {
    id: 'lyka',
    name: 'Lyka',
    subjects: ['Literature'],
    duration: 60,
    color: '#f472b6',
  },
  {
    id: 'econ',
    name: 'Econ',
    subjects: ['Economics'],
    duration: 60,
    color: '#fbbf24',
  },
  {
    id: 'cs_tutor',
    name: 'CS',
    subjects: ['Computer Science'],
    duration: 60,
    color: '#fb923c',
  },
  {
    id: 'business_tutor',
    name: 'Business',
    subjects: ['Business Studies'],
    duration: 120,
    color: '#f87171',
  },
];

// Build a quick lookup map: paperId → { subject, paper }
export const PAPER_MAP = {};
SUBJECTS.forEach((subject) => {
  subject.papers.forEach((paper) => {
    PAPER_MAP[paper.id] = { subject, paper };
  });
});

export const TUTOR_MAP = {};
TUTORS.forEach((tutor) => {
  TUTOR_MAP[tutor.id] = tutor;
});
