// Wellsprings (מעיינות, docs/MAAYAN.md): each discourse taught is a wellspring
// where its readers gather. They ask, the teacher answers, and they follow
// the next wellsprings. A member signs in with an email only; a wallet is
// linked later, when they come to hold TMIM (the team app).

import type { Text } from '$lib/team/types';

export type WellspringStatus = 'open' | 'upcoming';

export interface Wellspring {
  /** The slug in links: /maayan/<id>. */
  id: string;
  status: WellspringStatus;
  title: Text;
  /** Whose discourse and where it stands, under the title. */
  subtitle: Text;
  /** The discourse's own words: what it opens. */
  slogan: Text;
  /** What a reader meets in it, a few sentences. */
  about: Text;
  /** The printed edition or the text online. */
  link?: { label: Text; url: string };
  /** The editorial team working on it (the team app), if there is one. */
  teamId?: string;
  order: number;
}

/**
 * pending: waits for the teacher (a member's first question);
 * published: anyone can read it, it waits for an answer;
 * answered: carries the teacher's answer; hidden: declined, seen by its author only.
 */
export type QuestionStatus = 'pending' | 'published' | 'answered' | 'hidden';

export interface Answer {
  text: string;
  byId: string;
  byName: string;
  at: string;
}

export interface Question {
  id: string;
  wellspringId: string;
  authorId: string;
  /** The name the member chose to show. */
  authorName: string;
  text: string;
  status: QuestionStatus;
  createdAt: string;
  answer?: Answer;
  /** Sample content of the demo, marked as such where it shows. */
  sample?: boolean;
}

export interface MaayanMember {
  uid: string;
  name: string;
  /** Private: never shown to other members. */
  email: string;
  follows: string[];
  /** One email when the teacher answers, or a new wellspring opens. */
  notify: boolean;
  /** May a question be quoted, without the name, in a later edition. */
  quoteOk: boolean;
  /** How they first came: e.g. 'booklet:padah-beshalom'. */
  joinedFrom: string;
  joinedAt: string;
  /** Questions of theirs the teacher has let through: after the first, they post directly. */
  approved: number;
  /** Linked later, from the team app's wallet page. */
  wallet?: string;
  teacher?: boolean;
}
