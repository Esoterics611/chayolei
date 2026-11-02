// UI state shared across the new UI: language, theme, toasts, the
// confirm-and-sign dialog, the shared forms and the command palette.

import type { Locale, RuleKey } from './types';

export type Theme = 'system' | 'light' | 'dark';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  text: string;
}

/** A consequential action, shown with its consequences and confirmed with a (simulated) passkey. */
export interface SignRequest {
  title: string;
  lines: string[];
  warnings?: string[];
  confirmLabel?: string;
  /** Runs the action; false (or a promise of false) means it was refused. */
  onConfirm: () => boolean | void | Promise<boolean | void>;
}

/** The app's shared forms, opened from any screen or the command palette. */
export type DialogRequest =
  | { kind: 'newObjective' }
  | { kind: 'newDeliverable'; objectiveId?: string }
  | { kind: 'suggestPlan'; objectiveId: string }
  | { kind: 'aiReview'; changeId: string }
  | { kind: 'aiSummary'; ref: { type: 'deliverable' | 'change'; id: string } }
  | { kind: 'aiSources'; deliverableId: string }
  | { kind: 'proposeRule'; ruleKey?: RuleKey }
  | { kind: 'proposeRoles'; memberId?: string }
  | { kind: 'requestMoney'; type?: 'transfer' | 'budget'; objectiveId?: string; to?: string }
  | { kind: 'contribute' }
  | { kind: 'requestChanges'; changeId: string }
  | { kind: 'invite' };

const PREFS_KEY = 'chayolei-ui-v1';

function readPrefs(): { locale?: Locale; theme?: Theme } {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

class UiState {
  locale = $state<Locale>('en');
  theme = $state<Theme>('system');
  toasts = $state<Toast[]>([]);
  sign = $state<SignRequest | null>(null);
  paletteOpen = $state(false);
  dialog = $state<DialogRequest | null>(null);
  /** The demo simulates signing; the live app waits for the real action. Set by the store. */
  demo = $state(true);
  private nextToast = 1;

  dir = $derived<'rtl' | 'ltr'>(this.locale === 'he' ? 'rtl' : 'ltr');

  /** Read saved preferences, falling back to the browser's language. */
  init(): void {
    if (typeof window === 'undefined') return;
    const prefs = readPrefs();
    this.locale = prefs.locale ?? (navigator.language?.startsWith('he') ? 'he' : 'en');
    this.theme = prefs.theme ?? 'system';
    this.apply();
  }

  setLocale(l: Locale): void {
    this.locale = l;
    this.save();
    this.apply();
  }

  setTheme(th: Theme): void {
    this.theme = th;
    this.save();
    this.apply();
  }

  /** Whether this app set <html data-theme>; on "system" it removes only its own. */
  private themed = false;

  apply(): void {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    html.lang = this.locale;
    html.dir = this.dir;
    if (this.theme !== 'system') {
      html.setAttribute('data-theme', this.theme);
      this.themed = true;
    } else if (this.themed) {
      // Leave a theme set by whatever hosts the page (e.g. an embedding viewer).
      html.removeAttribute('data-theme');
      this.themed = false;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ locale: this.locale, theme: this.theme }));
    } catch {
      // Storage unavailable (private window): preferences last for this visit only.
    }
  }

  toast(kind: Toast['kind'], text: string, ms = 3800): void {
    const id = this.nextToast++;
    this.toasts = [...this.toasts, { id, kind, text }];
    setTimeout(() => this.dismiss(id), ms);
  }

  dismiss(id: number): void {
    this.toasts = this.toasts.filter(x => x.id !== id);
  }

  askToSign(req: SignRequest): void {
    this.sign = req;
  }

  openDialog(req: DialogRequest): void {
    this.paletteOpen = false;
    this.dialog = req;
  }

  /** A form to open once the confirm-and-sign dialog has closed. */
  afterSign: DialogRequest | null = null;

  /** Called by the sign dialog when it closes. */
  signClosed(): void {
    this.sign = null;
    const next = this.afterSign;
    this.afterSign = null;
    if (next) this.openDialog(next);
  }
}

export const ui = new UiState();
