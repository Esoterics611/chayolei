// The wellsprings, and the demo's sample questions.
//
// WELLSPRINGS is real: the discourses of Sefer Forge (github.com/Esoterics611/sefer-forge)
// that readers can gather around. The live app seeds Firestore from it
// (scripts/maayan-setup.mjs). The sample questions exist only in the demo
// and are marked as samples wherever they show; their answers are the
// printed booklet's own words (its הקדמה), not new teaching.

import type { MaayanMember, Question, Wellspring } from './types';
import list from './wellsprings.json';

// The list itself is wellsprings.json, read by the setup script too.
export const WELLSPRINGS: Wellspring[] = list as Wellspring[];

/** How many study each wellspring in the demo (the live app counts its followers). */
export const SAMPLE_STUDYING: Record<string, number> = {
  'padah-beshalom': 43,
  'shaar-hayichud': 61,
  'levushei-haneshama': 28,
  'kavanot-shacharit': 112,
};

export const DEMO_TEACHER: MaayanMember = {
  uid: 'demo-teacher',
  name: 'המלמד',
  email: 'teacher@example.org',
  follows: WELLSPRINGS.map(w => w.id),
  notify: true,
  quoteOk: true,
  joinedFrom: 'demo',
  joinedAt: '2026-11-01T09:00:00Z',
  approved: 0,
  teacher: true,
};

const ago = (days: number, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 3_600_000).toISOString();

export function sampleQuestions(): Question[] {
  const q = (id: string, authorName: string, text: string, days: number, answer?: string, answeredDays?: number): Question => ({
    id,
    wellspringId: 'padah-beshalom',
    authorId: `sample-${id}`,
    authorName,
    text,
    status: answer ? 'answered' : 'published',
    createdAt: ago(days),
    sample: true,
    ...(answer ? { answer: { text: answer, byId: DEMO_TEACHER.uid, byName: DEMO_TEACHER.name, at: ago(answeredDays ?? days - 1, 3) } } : {}),
  });
  return [
    q('s1', 'מנחם מ.', 'מהי היחידה, ולמה דווקא הגילוי שלה הוא המפתח?', 9,
      'היחידה היא הנקודה הפנימית ביותר בנפש. היא קשורה בנקודה הפנימית ביותר בתורה, שהיא פנימיות התורה, ופנימיות התורה קשורה בנקודה הפנימית ביותר באלקות, כביכול. כשהיחידה מתגלה, היצר הרע אינו יכול להתגבר כנגדה: זהו "פדה בשלום נפשי".', 8),
    q('s2', 'שרה ל.', 'למה דווקא כשהתפילה מתחזקת, גם היצר מתחזק?', 6,
      'בתפילה הנפש האלקית באה לברר את הבהמית, להוציא ממנה את הטוב ולתקן אותה, והיצר הרע נלחם כנגדה; וככל שהנפש האלקית מתגברת, מתגבר גם הוא. המלחמה הזאת היא עבודת כל הדורות עד הגאולה.', 5),
    q('s3', 'יוסף ק.', 'מה הקשר בין עיסוק בצרכי הכלל לבין "פדה בשלום"?', 4,
      'היחידה היא גם הנקודה שבה כל ישראל אחד. כשאדם יוצא מעצמו לעסוק בצרכי הכלל, הוא כבר אינו אדם פרטי בלבד: הנקודה הזאת מתגלה בו, וגם כך הוא נפדה בשלום.', 3),
    q('s4', 'דוד ר.', 'איך מתחילים להתבונן בפנימיות התורה בשעת התפילה, למי שעוד לא למד חסידות?', 1),
    { ...q('s5', 'אורי ש.', 'האם יש קשר בין המאמר לבין המאסר של אדמו"ר האמצעי עצמו?', 0), status: 'pending' },
  ];
}
