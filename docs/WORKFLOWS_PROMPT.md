# Chayolei Beis Dovid — Workflow Enhancement Prompt

## Overview
The app is currently a **read-only display layer** over mock data. Every page renders correctly but zero user actions work. This prompt adds all CRUD operations, state-machine transitions, form handlers, and feedback required to make the app functional.

**Stack**: SvelteKit 2 + Svelte 5 runes + Tailwind CSS v4 + TypeScript strict  
**Pattern**: Class-based `AppStore` singleton with `$state`/`$derived` runes  
**Language**: All UI text in Hebrew, RTL layout  
**Theme**: Sacred night — bg `#06080f`, gold `#f5c842`, sapphire `#5b8ff5`

---

## Session 1: AppStore Mutations + Toast System

### 1A. Toast Notification System
Create `src/lib/components/Toast.svelte` and toast store:

**`src/lib/stores/toast.svelte.ts`**
```
class ToastStore {
  toasts = $state<Toast[]>([]);
  
  success(message: string, duration = 3000)
  error(message: string, duration = 5000)
  info(message: string, duration = 3000)
  dismiss(id: string)
}
```
- Toast type: `{ id, message, type: 'success'|'error'|'info', duration }`
- Component: fixed bottom-left stack, RTL, auto-dismiss, gold border for success, red for error, sapphire for info
- Mount in `+layout.svelte`

### 1B. AppStore — ID Generation + Activity Logging
Add to AppStore:
```typescript
private nextId(prefix: string): string  // e.g. "mivtza-6", "masima-10"
private logActivity(type, actorId, targetTitle, description): void  // pushes to activities[]
```

### 1C. AppStore — Mivtza CRUD
```typescript
addMivtza(data: Omit<Mivtza, 'id'|'createdAt'|'updatedAt'>): Mivtza
updateMivtza(id: string, data: Partial<Mivtza>): void
deleteMivtza(id: string): void  // also deletes child masimot, tafkidim
```

### 1D. AppStore — Masima CRUD
```typescript
addMasima(data: Omit<Masima, 'id'|'createdAt'|'updatedAt'>): Masima
updateMasima(id: string, data: Partial<Masima>): void
deleteMasima(id: string): void  // also deletes child tafkidim
```

### 1E. AppStore — Tafkid CRUD
```typescript
addTafkid(data: Omit<Tafkid, 'id'|'createdAt'|'updatedAt'>): Tafkid
updateTafkid(id: string, data: Partial<Tafkid>): void
deleteTafkid(id: string): void
```

### 1F. AppStore — Talmid Management
```typescript
addTalmid(data: Omit<Talmid, 'id'>): Talmid
updateTalmid(id: string, data: Partial<Talmid>): void
promoteTalmid(id: string): void  // advance to next rank, log activity, award tokens
```

### 1G. AppStore — Enrollment
```typescript
enrollInMivtza(talmidId: string, mivtzaId: string): void  // push to enrolledTalmidim[]
unenrollFromMivtza(talmidId: string, mivtzaId: string): void
```

### 1H. AppStore — Peer Reviews
```typescript
addPeerReview(data: Omit<PeerReview, 'id'|'createdAt'>): PeerReview
acknowledgePeerReview(id: string): void  // set status to 'acknowledged'
```

### 1I. AppStore — Discussions
```typescript
addDiscussion(data: Omit<Discussion, 'id'|'createdAt'>): Discussion
```

### 1J. AppStore — Donations & Treasury
```typescript
addDonation(data: Omit<Donation, 'id'|'createdAt'>): void  // also updates treasury totals
redeemTmim(talmidId: string, amount: number): void  // deduct from balance, update treasury
```

### 1K. AppStore — State Machine Transitions
```typescript
// Tafkid lifecycle: todo → in_progress → submitted → approved
startTafkid(id: string): void      // set status='in_progress', set startedAt
submitTafkid(id: string): void     // set status='submitted', set completedAt
approveTafkid(id: string): void    // set status='approved', award tokens to assignee

// Masima lifecycle: open → in_progress → submitted → in_review → approved|revision_requested → published
startMasima(id: string): void
submitMasima(id: string, contentUrl?: string): void
startReviewMasima(id: string): void
approveMasima(id: string): void         // award tokens
requestRevisionMasima(id: string): void
publishMasima(id: string): void
```

All state transitions should:
- Validate current status before transitioning
- Update `updatedAt` timestamp
- Log an activity entry
- Show toast on success
- Award TMIM tokens where applicable (use rank multiplier from RANK_META)

---

## Session 2: Wire Existing Forms + Create New Forms

### 2A. Wire `/mivtzaot/new` Form
- Connect the existing form's submit handler to `app.addMivtza()`
- Add field validation (shem required, tokenAllocation > 0)
- Show toast on success, redirect to new mivtza detail page
- Add cancel button that goes back

### 2B. Create `/masimot/new/+page.svelte`
Form fields:
- `shem` (text input, required)
- `description` (textarea)
- `mivtzaId` (select dropdown from app.mivtzaot, required)
- `type` (radio cards: research / writing / presentation / exam / project)
- `assigneeId` (select dropdown from enrolled talmidim, optional — "פנוי לשיוך")
- `researchQuestion` (text input, shown when type=research)
- `tmimReward` (number input, default from mivtza allocation)
- `dueDate` (date input)

Officer/NCO only guard. Submit calls `app.addMasima()`, toast, redirect.

### 2C. Create `/tafkidim/new/+page.svelte`
Form fields:
- `shem` (text input, required)
- `description` (textarea)
- `masimaId` (select from app.masimot, required)
- `type` (radio: study / write / review / present / discuss)
- `assigneeId` (select from masima's enrolled talmidim, optional)
- `priority` (radio: low / medium / high / urgent)
- `dueDate` (date input)
- `tmimReward` (number)

Submit calls `app.addTafkid()`, toast, redirect.

### 2D. Peer Review Submission Form
Add to `/masimot/[id]/+page.svelte` in the reviews tab:
- Star rating (1-5 clickable stars)
- Comments textarea (required)
- Suggestions list (add/remove items)
- Submit button → `app.addPeerReview()`
- Only show if current user is not the masima assignee
- Only show if masima status is 'submitted' or 'in_review'

### 2E. Wire Discussion Thread
In `DiscussionThread.svelte`:
- Bind the reply textarea to a local state variable
- Wire submit button to `app.addDiscussion()` with `parentId` for replies
- Clear textarea after submit
- Toast confirmation

### 2F. Donation Form in Treasury
Add to `/treasury/+page.svelte`:
- Expandable "תרום" (Donate) section
- Amount (number), type (radio: crypto/fiat), designation (text), donor name
- Submit → `app.addDonation()`, toast

---

## Session 3: Wire Action Buttons + State Transitions

### 3A. Tafkid Action Buttons (`/tafkidim/+page.svelte`)
Wire existing buttons:
- "התחל" → `app.startTafkid(id)` (only if assigned to current user, status='todo')
- "הגש" → `app.submitTafkid(id)` (only if status='in_progress')
- Update kanban board reactively after state change

### 3B. Tafkid Actions in Masima Detail (`/masimot/[id]`)
Wire the start/submit buttons in the tafkidim tab:
- Same logic as 3A
- Also show "אשר" (approve) button for officers viewing submitted tafkidim

### 3C. Masima Action Buttons (`/masimot/[id]`)
Wire header action buttons based on status + role:
- "התחל עבודה" → `app.startMasima(id)` (assignee, status='open')
- "הגש" → opens submit modal with content URL field → `app.submitMasima(id, url)`
- "הגש מחדש" → same as submit (status='revision_requested')
- "התחל ביקורת" → `app.startReviewMasima(id)` (officer, status='submitted')
- "אשר" → `app.approveMasima(id)` (officer, status='in_review')
- "בקש תיקון" → opens modal with notes → `app.requestRevisionMasima(id)`
- "פרסם" → `app.publishMasima(id)` (officer, status='approved')

### 3D. Review Page Actions (`/review/+page.svelte`)
Wire the three buttons per masima:
- "אשר" → `app.approveMasima(id)`, toast, remove from pending list
- "בקש תיקון" → prompt for notes, `app.requestRevisionMasima(id)`, toast
- "דחה" → confirm dialog, sets status back to 'open', toast

Wire tafkid review:
- "אשר" → `app.approveTafkid(id)`, toast

### 3E. Enroll Button in Mivtza Detail
In `/mivtzaot/[id]`:
- If current user not enrolled, show "הצטרף למבצע" (Join Campaign) button
- On click → `app.enrollInMivtza(currentUser.id, mivtzaId)`, toast
- If enrolled, show "עזוב מבצע" with confirmation

### 3F. Promote Button in Profile
In `/anash/[id]`:
- If viewer is officer and viewing enlisted/NCO, show "קדם דרגה" button
- Confirmation dialog showing current → next rank
- On click → `app.promoteTalmid(id)`, toast

### 3G. Redeem TMIM Button in Treasury
Wire the existing "פדה TMIM" button:
- Opens modal with amount input (max = current balance)
- Shows conversion: X TMIM = $Y USD (rate: 1 TMIM = $0.10)
- Confirm → `app.redeemTmim(currentUser.id, amount)`, toast

---

## Session 4: Edit Flows + Validation + Polish

### 4A. Edit Mivtza
- Add ✏️ edit button on `/mivtzaot/[id]` header (officer only)
- Toggles inline edit mode: fields become editable inputs
- Save/Cancel buttons replace edit button
- Calls `app.updateMivtza(id, changes)`, toast

### 4B. Edit Masima
- Same pattern on `/masimot/[id]` header
- Editable: shem, description, assigneeId, dueDate, tmimReward
- Only when status is 'open' or 'revision_requested'

### 4C. Edit Tafkid
- Inline edit on tafkid cards or a modal
- Editable: shem, description, assigneeId, priority, dueDate

### 4D. Edit Talmid Profile
- On `/anash/[id]` when viewing own profile or as officer
- Editable: bio/about, avatar (mock), makomId

### 4E. Delete with Confirmation
- Delete buttons on mivtza/masima/tafkid detail pages (officer only)
- Confirmation modal: "האם למחוק את X? פעולה זו אינה הפיכה"
- Cascade deletes children
- Toast confirmation, redirect to list

### 4F. Form Validation
Add validation to all forms:
- Required fields highlighted with red border + error message
- Number fields: min/max constraints
- Date fields: must be future
- Prevent double submission (disable button while processing)

### 4G. Confirmation Dialog Component
Create `src/lib/components/ConfirmDialog.svelte`:
- Modal overlay with dark backdrop
- Title, message, confirm/cancel buttons
- Confirm button is red for destructive actions, gold for promotions
- Used by: delete flows, promotion, redeem TMIM, unenroll

### 4H. Empty States
Update all list pages to show helpful empty states when no data:
- Illustration/icon + Hebrew message
- CTA button to create first item
- Example: "אין מבצעים עדיין — צור מבצע ראשון" with button to /mivtzaot/new

---

## Implementation Notes

- All mutations happen in-memory on the `$state` arrays — no backend/API
- Use `crypto.randomUUID()` or simple incrementing IDs
- All timestamps use `new Date().toISOString()`
- Token awards use `RANK_META[talmid.rank].tokenMultiplier` (add this field if missing)
- Activity logging: push to beginning of `activities[]` array
- Toast on every successful mutation
- Permission checks: use `RANK_META[app.currentUser.rank].tier` — officer for admin actions, nco+ for create masima/tafkid
- Keep all mock data as initial state — new items get added alongside
