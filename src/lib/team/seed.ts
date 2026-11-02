// Sample teams for the demo, built by replaying real engine actions with
// back-dated timestamps, so every balance, budget, rule version and ledger
// entry is consistent. Times are relative to `now`.

import type { Team } from './types';
import * as E from './engine';

const DAY = 86_400_000;
const HOUR = 3_600_000;

export interface SeedResult {
  teams: Team[];
  /** Default acting member per team. */
  acting: Record<string, string>;
}

export function seedTeams(nowIso: string): SeedResult {
  const now = new Date(nowIso).getTime();
  // Seed steps are whole hours apart; a jitter under an hour, the same for equal
  // times, makes the clock look lived-in without reordering anything.
  const at = (days: number, hours = 0) => {
    const time = now - days * DAY - hours * HOUR;
    const jitter = (Math.imul(Math.floor(time / HOUR), 2654435761) >>> 0) % 47;
    return new Date(time - jitter * 60_000).toISOString();
  };
  const brachos = seedBrachos(at);
  const radio = seedRadio(at);
  return {
    teams: [brachos, radio],
    acting: { [brachos.id]: 'mendel', [radio.id]: 'ada' },
  };
}

// ── Team 1: a Torah translation team (editorial charter) ──────────

const CH1_V1 = [
  'From when may one recite the Shema in the evening? From the hour the priests go in to eat their terumah until the end of the first watch, in the words of Rabbi Eliezer.',
  'The Sages say: until midnight. Rabban Gamliel says: until dawn rises.',
  'His sons once came home from a wedding feast and said: we have not yet recited the Shema. He told them: if dawn has not risen, you are obliged to recite it.',
];
const CH1_V2 = [
  CH1_V1[0],
  CH1_V1[1],
  'His sons once came home from a wedding feast and said to him: we have not recited the Shema. He told them: if the dawn has not yet risen, you are obliged to recite it.',
  'Terumah: the portion of produce given to the priests; see the glossary.',
];
const CH2_V1 = [
  'If one was reading in the Torah and the time for reciting the Shema arrived: if he directed his heart, he has fulfilled his obligation.',
  'Between the sections one may greet out of respect and return a greeting; in the middle of a section one may greet out of fear and return a greeting.',
];
const CH3_V1 = [
  'One whose dead lies before him is exempt from reciting the Shema and from tefillin.',
  'Those who carry the bier, and those who take their place, and those who take the place of these, whether before the bier or after it, are exempt.',
];
const CH3_V2 = [
  'One whose dead relative lies before him, awaiting burial, is exempt from reciting the Shema, from prayer and from tefillin.',
  'Those who carry the bier, and those who take their place, and those who take the place of these, whether before the bier or after it: those needed for the bier are exempt.',
  'Once they have buried the dead and returned, if they can begin and finish before reaching the line of mourners, they begin.',
];
const CH3_V3 = [
  'One whose dead relative lies before him is exempt from the Shema, from prayer and from tefillin until the burial.',
  CH3_V2[1],
  CH3_V2[2],
  'Rashi, on the words "one whose dead": because he is occupied with the needs of the dead, and one occupied with a commandment is exempt from another.',
];
const CH4_V1 = [
  'The morning prayer may be said until midday. Rabbi Yehudah says: until the fourth hour.',
  'The afternoon prayer, until evening. Rabbi Yehudah says: until the middle of the afternoon.',
];
const CH4_V2 = [
  CH4_V1[0],
  CH4_V1[1],
  'The evening prayer has no fixed time; the additional prayer may be said all day.',
  'Note: "the fourth hour" counts seasonal hours from sunrise, a third of the daylight.',
];
const INTRO_V1 = [
  'This volume presents a new English translation of the first chapters of tractate Brachos, with sources and brief notes for the reader who is new to the text.',
  'Each chapter was translated, reviewed and accepted by the team; the ledger at the back lists who did each part.',
];
const GLOSSARY_V1 = [
  'Shema: the declaration of faith recited morning and evening.',
  'Terumah: the portion of produce given to the priests.',
  'Tefillin: the leather boxes containing scripture, worn during weekday morning prayer.',
];
const RASHI1_V1 = [
  'Rashi on 1:1, "from the hour the priests go in": that is, when the stars come out.',
];

function seedBrachos(at: (d: number, h?: number) => string): Team {
  const team = E.createTeam({
    name: { en: 'Brachos Translation Group', he: 'חבורת תרגום ברכות' },
    purpose: { en: 'Translate and publish the first volume of tractate Brachos, with sources and notes.', he: 'לתרגם ולהוציא לאור את הכרך הראשון של מסכת ברכות, עם מקורות והערות.' },
    templateId: 'editorial',
    founder: { id: 'mendel', name: { en: 'Mendel Katz', he: 'מנדל כ"ץ' }, initials: 'MK', wallet: '0x7a1c4e2b9d0f3a6c8e5b1d4f7a2c9e0b3d6f8a1c' },
  }, at(75));
  team.id = 'brachos';
  E.addMember(team, { id: 'yosef', name: { en: 'Yosef Adler', he: 'יוסף אדלר' }, initials: 'YA', wallet: '0x3f9e1b7d5c2a8e4f6b0d9c1a7e3f5b2d8c4a6e9f', roleIds: ['reviewer'] }, at(75, -1));
  E.addMember(team, { id: 'levi', name: { en: 'Levi Stern', he: 'לוי שטרן' }, initials: 'LS', wallet: '0x8c2d6a0e4b9f1c7a3e5d8b2f6c0a4e9d1b7f3c5a' }, at(75, -2));
  E.addMember(team, { id: 'shmuel', name: { en: 'Shmuel Gold', he: 'שמואל גולד' }, initials: 'SG', wallet: '0x1e5b9d3f7a2c6e0b4d8f2a6c9e1b5d7f3a0c8e4b' }, at(75, -3));
  E.addMember(team, { id: 'rivka', name: { en: 'Rivka Levin', he: 'רבקה לוין' }, initials: 'RL', wallet: '0x6d0a4c8e2f7b1d5a9c3e7f1b5d9a3c7e0f4b8d2a' }, at(75, -4));

  // Objectives and their budgets (above the spend limit, so by vote).
  const vol1 = E.addObjective(team, 'mendel', {
    title: { en: 'Translate & publish Brachos — Volume 1', he: 'תרגום והוצאה לאור של ברכות — כרך א׳' },
    description: { en: 'Chapters 1–5 in English with an introduction, glossary and typeset edition.', he: 'פרקים א׳–ה׳ באנגלית, עם מבוא, מילון מונחים ומהדורה מעומדת.' },
    due: at(-120),
  }, at(74));
  const b1 = E.requestMoney(team, 'mendel', {
    action: { type: 'budget', objectiveId: vol1.id, to: 20000 },
    title: { en: 'Budget for Volume 1', he: 'תקציב לכרך א׳' },
    why: { en: 'Five chapters, introduction, glossary and typesetting.', he: 'חמישה פרקים, מבוא, מילון ועימוד.' },
  }, at(74, -1));
  for (const [m, h] of [['mendel', 2], ['yosef', 6], ['levi', 9], ['shmuel', 12]] as const) E.vote(team, m, b1.id, 'for', at(74, -h));
  E.closeVoting(team, 'mendel', b1.id, at(73));

  const rashi = E.addObjective(team, 'mendel', {
    title: { en: 'Rashi companion', he: 'נלווה: רש״י' },
    description: { en: 'Rashi’s comments on chapters 1–5, translated and keyed to the main text.', he: 'פירוש רש״י על פרקים א׳–ה׳, מתורגם ומקושר לטקסט.' },
  }, at(73, -2));
  const b2 = E.requestMoney(team, 'mendel', {
    action: { type: 'budget', objectiveId: rashi.id, to: 8000 },
    title: { en: 'Budget for the Rashi companion', he: 'תקציב לנלווה רש״י' },
    why: { en: 'Two source collections and weekly source checking.', he: 'שני ליקוטי מקורות ובדיקת מקורות שבועית.' },
  }, at(73, -3));
  for (const [m, h] of [['mendel', 4], ['yosef', 7], ['rivka', 10], ['levi', 14], ['shmuel', 20]] as const) E.vote(team, m, b2.id, 'for', at(73, -h));

  // The plan.
  const add = (o: string, en: string, he: string, scopeEn: string, scopeHe: string, reward: number) =>
    E.addDeliverable(team, 'mendel', o, { title: { en, he }, scope: { en: scopeEn, he: scopeHe }, reviewerId: 'yosef', reward }, at(72));
  const intro = add(vol1.id, 'Introduction', 'מבוא', 'Purpose of the volume and how to read it.', 'מטרת הכרך ואיך לקרוא אותו.', 1200);
  const ch1 = add(vol1.id, 'Chapter 1 — Me’eimasai', 'פרק א׳ — מאימתי', 'Mishnah and translation of chapter 1, with notes.', 'משנה ותרגום של פרק א׳, עם הערות.', 2400);
  const ch2 = add(vol1.id, 'Chapter 2 — Hayah Korei', 'פרק ב׳ — היה קורא', 'Translation of chapter 2.', 'תרגום פרק ב׳.', 1800);
  const ch3 = add(vol1.id, 'Chapter 3 — Mi Shemeiso', 'פרק ג׳ — מי שמתו', 'Translation of chapter 3, with Rashi where needed.', 'תרגום פרק ג׳, עם רש״י כשצריך.', 1800);
  const ch4 = add(vol1.id, 'Chapter 4 — Tefillas HaShachar', 'פרק ד׳ — תפלת השחר', 'Translation of chapter 4, with notes on the times of prayer.', 'תרגום פרק ד׳, עם הערות על זמני התפילה.', 1800);
  add(vol1.id, 'Chapter 5 — Ein Omdin', 'פרק ה׳ — אין עומדין', 'Translation of chapter 5.', 'תרגום פרק ה׳.', 1800);
  const gloss = add(vol1.id, 'Glossary of terms', 'מילון מונחים', 'Short definitions of recurring terms.', 'הגדרות קצרות למונחים חוזרים.', 800);
  const typeset = add(vol1.id, 'Typesetting and layout', 'עימוד ועיצוב', 'Typeset the accepted chapters for print and screen.', 'לעמד את הפרקים שאושרו לדפוס ולמסך.', 1500);
  const r1 = add(rashi.id, 'Rashi sources for chapters 1–2', 'מקורות רש״י לפרקים א׳–ב׳', 'Collect and translate Rashi on chapters 1–2.', 'ללקט ולתרגם את רש״י לפרקים א׳–ב׳.', 1200);
  add(rashi.id, 'Rashi sources for chapters 3–5', 'מקורות רש״י לפרקים ג׳–ה׳', 'Collect and translate Rashi on chapters 3–5.', 'ללקט ולתרגם את רש״י לפרקים ג׳–ה׳.', 1200);
  E.addTask(team, 'mendel', typeset.id, { title: { en: 'Choose typefaces for Hebrew and English', he: 'לבחור גופנים לעברית ולאנגלית' }, ownerId: 'mendel' }, at(72, -1));

  // Everything below is in time order, oldest first, as the ledger records it.
  team.treasury.schedules.push({
    id: 'sched-rivka', memberId: 'rivka', objectiveId: rashi.id, amount: 150, every: 'week',
    nextAt: at(28), until: at(-60),
  });

  // Introduction: written, reviewed, accepted, released.
  E.take(team, 'shmuel', intro.id, at(70));
  E.saveVersion(team, 'shmuel', intro.id, INTRO_V1, { en: 'First full draft', he: 'טיוטה מלאה ראשונה' }, at(66));
  let c = E.requestReview(team, 'shmuel', intro.id, at(66, -1));
  E.comment(team, 'yosef', c.id, 'Clear and short. Approved from my side.', undefined, at(64));
  E.markReviewed(team, 'yosef', c.id, at(64, -1));
  E.acceptAndPay(team, 'mendel', c.id, at(63));
  E.release(team, 'mendel', intro.id, at(60));
  E.take(team, 'shmuel', ch1.id, at(60, -2));
  E.contribute(team, 'shmuel', 500, at(59));
  E.take(team, 'levi', gloss.id, at(58));
  E.saveVersion(team, 'levi', gloss.id, GLOSSARY_V1, { en: 'Core terms', he: 'מונחי יסוד' }, at(52));
  const cg = E.requestReview(team, 'levi', gloss.id, at(52, -1));
  E.saveVersion(team, 'shmuel', ch1.id, CH1_V1, { en: 'Translation of the mishnah', he: 'תרגום המשנה' }, at(50));
  c = E.requestReview(team, 'shmuel', ch1.id, at(50, -1));
  E.markReviewed(team, 'yosef', cg.id, at(50, -2));
  E.acceptAndPay(team, 'mendel', cg.id, at(49));
  E.contribute(team, 'levi', 300, at(48));
  E.requestChanges(team, 'yosef', c.id, 'Explain “terumah” for the reader, and keep the wording of the story consistent.', at(47));
  E.saveVersion(team, 'shmuel', ch1.id, CH1_V2, { en: 'Added a note on terumah', he: 'נוספה הערה על תרומה' }, at(45));
  c = E.requestReview(team, 'shmuel', ch1.id, at(45, -1));
  E.markReviewed(team, 'yosef', c.id, at(44));
  E.acceptAndPay(team, 'mendel', c.id, at(43));
  E.contribute(team, 'shmuel', 1000, at(42));

  // A rule the team amended earlier: the default deliverable reward.
  const rc = E.proposeRule(team, 'mendel', {
    ruleKey: 'deliverable_reward', to: 1500,
    title: { en: 'Raise the default deliverable reward', he: 'העלאת התגמול הבסיסי לתוצר' },
    why: { en: 'Chapters are taking longer than we planned for.', he: 'הפרקים לוקחים יותר זמן ממה שתכננו.' },
  }, at(40));
  for (const [m, h] of [['mendel', 1], ['yosef', 5], ['levi', 8], ['shmuel', 11], ['rivka', 20]] as const) E.vote(team, m, rc.id, 'for', at(40, -h));

  E.take(team, 'rivka', r1.id, at(30));
  E.paySchedule(team, 'mendel', 'sched-rivka', at(28, -1));
  E.take(team, 'shmuel', ch3.id, at(25));
  E.paySchedule(team, 'mendel', 'sched-rivka', at(21, -1));
  E.take(team, 'levi', ch2.id, at(20));
  const t1 = E.addTask(team, 'levi', ch2.id, { title: { en: 'Draft Mishnah 2:1–2', he: 'טיוטת משנה ב׳:א׳–ב׳' }, ownerId: 'levi' }, at(19));
  E.addTask(team, 'levi', ch2.id, { title: { en: 'Check against the Vilna edition', he: 'השוואה לדפוס וילנא' }, ownerId: 'levi' }, at(19, -1));
  E.saveVersion(team, 'shmuel', ch3.id, CH3_V1, { en: 'First translation', he: 'תרגום ראשון' }, at(18));
  c = E.requestReview(team, 'shmuel', ch3.id, at(18, -1));
  E.take(team, 'rivka', ch4.id, at(16));
  E.requestChanges(team, 'yosef', c.id, 'The mishnah also exempts from prayer; and the last clause is missing.', at(15));
  E.addTask(team, 'rivka', ch4.id, { title: { en: 'Footnotes on the times of prayer', he: 'הערות שוליים על זמני התפילה' }, ownerId: 'rivka' }, at(15, -1));
  E.paySchedule(team, 'mendel', 'sched-rivka', at(14, -1));
  E.saveVersion(team, 'shmuel', ch3.id, CH3_V2, { en: 'Added prayer and the burial clause', he: 'נוספו התפילה וסעיף הקבורה' }, at(12));
  c = E.requestReview(team, 'shmuel', ch3.id, at(12, -1));
  E.saveVersion(team, 'rivka', ch4.id, CH4_V1, { en: 'Mishnah 4:1', he: 'משנה ד׳:א׳' }, at(12, -2));
  E.requestChanges(team, 'yosef', c.id, 'Tighten the opening, and cite Rashi on “one whose dead”.', at(10));

  // Chapter 2 goes quiet after this (stalled).
  E.saveVersion(team, 'levi', ch2.id, CH2_V1, { en: 'Mishnah 2:1–2', he: 'משנה ב׳:א׳–ב׳' }, at(9, 2));
  E.setTaskDone(team, 'levi', t1.id, true, at(9));
  E.paySchedule(team, 'mendel', 'sched-rivka', at(7, -1));

  // Levi asks to be reimbursed for a printed edition (within the spend limit).
  E.requestMoney(team, 'levi', {
    action: { type: 'transfer', to: 'levi', amount: 600 },
    title: { en: 'Reimburse the Vilna edition reprint', he: 'החזר על הדפסת דפוס וילנא' },
    why: { en: 'I bought a printed edition to check the text against.', he: 'קניתי דפוס כדי להשוות אליו את הנוסח.' },
  }, at(6));
  E.saveVersion(team, 'rivka', r1.id, RASHI1_V1, { en: 'First comments', he: 'פירושים ראשונים' }, at(4));

  // Chapter 3, round three: reviewed, waiting for the approver.
  const ch3c = E.addTask(team, 'shmuel', ch3.id, { title: { en: 'Check Rashi citations', he: 'בדיקת ציטוטי רש״י' }, ownerId: 'yosef' }, at(4, -1));
  E.saveVersion(team, 'shmuel', ch3.id, CH3_V3, { en: 'Tightened the opening, added Rashi', he: 'צומצם הפתיח, נוסף רש״י' }, at(3));
  c = E.requestReview(team, 'shmuel', ch3.id, at(3, -1));
  E.setTaskDone(team, 'yosef', ch3c.id, true, at(2, 4));
  E.postMessage(team, 'yosef', { type: 'deliverable', id: ch3.id }, 'Rashi should be cited by his opening words, so readers can find him.', at(2, 3));
  E.postMessage(team, 'shmuel', { type: 'deliverable', id: ch3.id }, 'Done in v3, the last paragraph.', at(2, 2));
  E.comment(team, 'yosef', c.id, 'Much tighter. Good.', 0, at(2, 1));
  E.comment(team, 'yosef', c.id, 'Exactly the citation I meant.', 3, at(2, 1));
  E.markReviewed(team, 'yosef', c.id, at(2));

  // Chapter 4, second version, waiting on the reviewer.
  E.saveVersion(team, 'rivka', ch4.id, CH4_V2, { en: 'Added the evening prayer and a note on hours', he: 'נוספו תפילת ערבית והערה על השעות' }, at(1, 6));
  E.requestReview(team, 'rivka', ch4.id, at(1, 5));

  // An open vote: raise the review reward.
  const rv = E.proposeRule(team, 'yosef', {
    ruleKey: 'review_reward', to: 150,
    title: { en: 'Raise the review reward', he: 'העלאת התגמול על ביקורת' },
    why: { en: 'A careful review takes about two hours; 100 TMIM doesn’t cover it.', he: 'ביקורת יסודית לוקחת כשעתיים; 100 TMIM לא מכסים אותה.' },
  }, at(1));
  E.vote(team, 'yosef', rv.id, 'for', at(1, -1));
  E.vote(team, 'levi', rv.id, 'for', at(0, 20));
  E.vote(team, 'rivka', rv.id, 'against', at(0, 10));

  // An open vote on roles: Rivka as a reviewer too, so reviews wait less.
  const rr = E.proposeRoles(team, 'yosef', {
    memberId: 'rivka', to: ['reviewer', 'contributor'],
    title: { en: 'Rivka reviews too', he: 'גם רבקה תבקר' },
    why: { en: 'With one reviewer, every chapter waits for me. Rivka knows the sources well.', he: 'עם מבקר אחד, כל פרק מחכה לי. רבקה מכירה היטב את המקורות.' },
  }, at(0, 8));
  E.vote(team, 'yosef', rr.id, 'for', at(0, 7));

  // Rivka's weekly pay is due again today.
  team.treasury.schedules[0].nextAt = at(0, 2);
  return team;
}

// ── Team 2: a community radio collective (everything by vote) ─────

function seedRadio(at: (d: number, h?: number) => string): Team {
  const team = E.createTeam({
    name: { en: 'Harbor Community Radio', he: 'רדיו קהילתי הנמל' },
    purpose: { en: 'A weekly radio show made by and about the people of the harbor.', he: 'תוכנית רדיו שבועית של אנשי הנמל ועליהם.' },
    templateId: 'collective',
    founder: { id: 'ada', name: 'Ada Okafor', initials: 'AO', wallet: '0x2b6f0d4a8c1e5b9d3f7a0c4e8b2d6f1a5c9e3b7d' },
  }, at(40));
  team.id = 'radio';
  E.addMember(team, { id: 'kofi', name: 'Kofi Mensah', initials: 'KM', wallet: '0x9e3a7c1f5b8d2e6a0c4f8b1d5e9a3c7f2b6d0e4a' }, at(40, -2));
  E.addMember(team, { id: 'mira', name: 'Mira Haddad', initials: 'MH', wallet: '0x4c8e2a6d0f3b7e1c5a9d2f6b0e4c8a1d5f9b3e7c' }, at(39));
  E.addMember(team, { id: 'tomas', name: 'Tomás Rivera', initials: 'TR', wallet: '0x0f4b8e2c6a1d5f9b3e7c0a4d8f2b6e1c5a9d3f7b' }, at(38));
  E.addMember(team, { id: 'jonah', name: 'Jonah Bell', initials: 'JB', wallet: '0x5a1e9c3f7b2d6a0e4c8f1b5d9e3a7c2f6b0d4e8a' }, at(38, -2));

  const s1 = E.addObjective(team, 'ada', {
    title: { en: 'Season 1: six episodes', he: 'עונה 1: שישה פרקים' },
    description: { en: 'Six half-hour episodes, one a week.', he: 'שישה פרקים של חצי שעה, אחד בשבוע.' },
  }, at(37));
  const b = E.requestMoney(team, 'ada', {
    action: { type: 'budget', objectiveId: s1.id, to: 6000 },
    title: { en: 'Budget for season 1', he: 'תקציב לעונה 1' },
    why: { en: 'Six episodes at about 500 each, plus editing.', he: 'שישה פרקים בכ־500 כל אחד, ועוד עריכה.' },
  }, at(37, -1));
  for (const [m, h] of [['ada', 2], ['kofi', 5], ['mira', 9], ['tomas', 14], ['jonah', 18]] as const) E.vote(team, m, b.id, 'for', at(37, -h));

  const ep = (en: string, he: string) =>
    E.addDeliverable(team, 'ada', s1.id, { title: { en, he }, scope: { en: 'Script, recording and edit.', he: 'תסריט, הקלטה ועריכה.' } }, at(36));
  const e1 = ep('Episode 1 — Who keeps the harbor lights on', 'פרק 1 — מי מדליק את אורות הנמל');
  const e2 = ep('Episode 2 — The fish market at dawn', 'פרק 2 — שוק הדגים עם שחר');
  const e3 = ep('Episode 3 — Night shift on the ferry', 'פרק 3 — משמרת לילה במעבורת');
  const e4 = ep('Episode 4 — Letters from the lighthouse', 'פרק 4 — מכתבים מהמגדלור');
  E.setPeople(team, 'ada', e1.id, { reviewerId: 'mira' }, at(36));
  E.setPeople(team, 'ada', e2.id, { reviewerId: 'kofi' }, at(36));

  E.take(team, 'kofi', e1.id, at(34));
  E.take(team, 'jonah', e4.id, at(33));
  E.saveVersion(team, 'jonah', e4.id, [
    'Cold open: a letter from 1962, read aloud by the keeper’s granddaughter.',
    'Segment one: the logbook, and what the keepers wrote about the storms.',
  ], 'Outline', at(30));
  E.saveVersion(team, 'kofi', e1.id, [
    'Cold open: the foghorn at 5 a.m., and Joe, who has kept the harbor lights for thirty-one years.',
    'Segment one: how the lights are checked every night, lamp by lamp.',
    'Close: what Joe will miss when he retires.',
  ], 'Script and rough edit', at(28));
  let c = E.requestReview(team, 'kofi', e1.id, at(28, -1));
  E.markReviewed(team, 'mira', c.id, at(26));
  E.acceptAndPay(team, 'ada', c.id, at(25));
  E.release(team, 'ada', e1.id, at(21));

  E.take(team, 'mira', e2.id, at(20));
  // Jonah moves away; his outline stays as v1 for whoever takes the episode next.
  E.leave(team, 'jonah', at(16));
  E.saveVersion(team, 'mira', e2.id, [
    'Cold open: ice cracking under the crates at 4 a.m.',
    'Segment one: the auction, in the buyers’ own words.',
  ], 'Script', at(9));
  E.take(team, 'tomas', e3.id, at(5));
  E.saveVersion(team, 'mira', e2.id, [
    'Cold open: ice cracking under the crates at 4 a.m., and the first shout of the auction.',
    'Segment one: the auction, in the buyers’ own words.',
    'Segment two: what happens to the fish nobody bought.',
  ], 'Added segment two', at(3));
  c = E.requestReview(team, 'mira', e2.id, at(3, -1));
  E.markReviewed(team, 'kofi', c.id, at(1));
  return team;
}
