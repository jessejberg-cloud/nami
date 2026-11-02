# Designing for ADHD: a portable guide

Distilled from the Wide Margin app suite's design law. App-specific screens, code paths, build history and the open-gaps list are removed; what remains holds for any app. Each rule is something the author decided, or learned from something that broke on a phone or with a tester.

**The mission:** help a person with ADHD or executive-function challenges see their life in a low-pressure, low-demand environment that adapts to how they think, to reduce anxiety and stress.

**The test for every screen, in the first three seconds after opening:** "This makes sense. It is manageable and not overwhelming. I can see what's happening and where I'm headed."

---

## The whole thing on one page

1. **Lower the demand.** Nothing is required. No mandatory step, field, ritual or review.
2. **No shame, no pressure.** Never count what was not done. No streaks, overdue, red, badges or countdowns.
3. **Calm the nervous system.** Slow, eased motion at one pace. Muted color. Nothing snaps, flashes or nags.
4. **Less on the screen.** Headings at a glance, details on a tap. Fewer words, bigger type.
5. **One thing at a time.** One question per screen. One primary action.
6. **Nothing is ever lost.** Everything typed autosaves. Nothing is deleted unless the user deletes it.
7. **Everything can be undone.** Delete is an archive with an Undo.
8. **It adapts to you.** A sensible default and always a way to change it.
9. **It explains itself.** Name things, not actions. Nothing needs a manual.
10. **Plain words.** Short, practical, warm, never demanding.
11. **Setup is skippable and the app already works.**
12. **A finished page stays finished.** Reading is not a form. Nothing fake is seeded.

---

## 1. Lower the demand

The app is a place, not a supervisor. It never asks for anything it can work without.

- Nothing is required to be sorted, tagged, filed, reviewed or emptied. Retrieval over ritual: search must find things that were never organized. Filing is optional polish, never the price of getting something back.
- A pile of unsorted things is not an inbox. Show the newest few, never "N to sort". A count frames it as a debt.
- No daily ritual by default. Check-ins and reviews are opt-in.
- Catching a thing costs one tap and asks no question. Offering options at capture time is friction. Any offer comes afterwards, quietly, and can be ignored.
- Nothing is gated behind setup. Optional integrations are opt-in, and the app is fully usable without them and says so.
- Low-demand is the default, not a mode.
- Reminders and prompts are gentle and dismissible. Two mentions is an offer; three is nagging.

*Watch for:* a count on a pile, "complete your profile", a button that says "should", a step with no Skip, a feature that only works after something else is set up.

## 2. No shame, no pressure

- **Never count what someone did not do. Counting forward is fine.** The line is which way a number points. Backward, at a gap ("4 of 12", a progress bar, an inbox badge, days skipped): never. Forward, at what you're about to do ("Add 4 meals" on a button): fine. Test: does the number describe something the person is choosing to do, or something they failed to finish?
- No streaks, penalties, scores, percentages or "you didn't do this" tracking. Ever.
- **No-shame rollover.** An unfinished item carries forward into today with no badge, no red, no count, marked quietly as "carried".
- **No red or hot colors for urgency, priority, overdue or lingering status**, including a user-chosen flag. Where urgency is real, show it ambiently by color and shape, never by countdown or nudge.
- **Demand-shaped words stay out:** should, must, overdue, deadline, failed, behind, don't forget. Plain is not the same as demanding: "Today" is fine, "Overdue" is not. Check headings over fields, not just page names; a banned word doesn't live where you look for it.
- A half-finished list is not a report card. No "4 of 12", no remaining-count.
- A doubtful thing (an AI guess) looks doubtful, without blame. The mark is about the machine's confidence, never the person's.
- Projects are never "Completed". A stage is a place, not a verdict.
- A pause screen says "No rush. Either is fine."

*Watch for:* any number pointing backward, red used as "look here", any sentence starting "You haven't".

## 3. Calm the nervous system

"Keep the user's nervous system calm, not stimulated." Pace, color and quiet are design, not polish.

- **Transitions are first-class and slow.** Treat timing as design. Define the pace in one place; anything that appears or goes takes that number and never picks its own. Nothing is faster than the default.
- Gradual, eased motion. A new row fades in and the rows beneath slide to make room. On e-ink, motion is off.
- **Muted, earthy color.** A burnt orange rather than fluorescent, a washed-out earthy blue rather than bold. Several colors, not one accent. No pastels. Muted is a sensory constraint, not a taste.
- **Muted is not thin.** Keep the hue and move the lightness; thinning ink toward white leaves "paper with a rumour of teal in it".
- **Hand-drawn feel.** Sketchbook edges, round uneven corners, a handwriting face. A ruled border and a perfect circle look like a spreadsheet; a drawn line looks like a notebook, and a notebook makes no demands.
- Ambient, not loud. Color and shape carry state; badges, counters and notifications do not.
- No visible timers. A shrinking bar is a countdown.
- Notifications are few and chosen by the user. Nothing else pings.
- Coming back is calm. After a few minutes away, open on the home screen at the top; a page you leave and return to is where you left it.
- **The keyboard follows the field.** The field arrives first at the app's pace, and only then is the keyboard called. Never `autoFocus`.
- **A ring (alarm) rises, holds, and never comes back uninvited.** It starts from silence over about twenty seconds in one low voice, stays up until answered (Done or a Snooze list), never flashes, and if left unanswered leaves a quiet mark rather than repeating. Nothing rings unless the user turned ringing on for that thing.

*Watch for:* a duration chosen for one element, a cut where there should be a fade, a saturated fill, a shape drawn with a ruler, a badge, a ring that repeats on its own.

## 4. Less on the screen

"As little on the home screen as possible, especially text, while still painting a full picture of the person's life." When unsure, take it off Home and put it behind a tap.

- **Headings at a glance, details on a tap: the default everywhere.** Every screen opens closed; a heading is one line; opening one leaves the others alone (not an accordion); editing follows the same rule as reading.
- **If words aren't needed they shouldn't be there.** Prefer visuals that show several data points at once. Delete a label the picture already says. No caption under a tile explaining what it's for.
- **A visual carries several facts at once** (line weight = energy, size = length, color = calendar, position = distance).
- **A place to type has no frame.** At the moment a thought is being got out of the head, every border is one more thing to look at. One drawn line, plain words under it to keep or cancel.
- **A wall of identical boxes is a wall however few boxes there are.** A group of options is a closed heading; the chosen one sorts first and is filled.
- **A card is its name.** A choice card, toggle row or status card carries its name and nothing under it. If the name needs a line to explain it, the name is wrong.
- **A setting made of choices is one line.** Closed, it shows the chosen option; a tap opens the choices, small; picking one closes it.
- Collapse rather than crowd. Options for a busy screen go behind one icon.
- **Big enough to read without glasses.** Sizes never go smaller; type size is a setting.
- A tile shows what's inside it, not just a word.
- **A control is a few big choices plus one exact field**, not a wall of small ones. A few near-choices as pills (today, tomorrow, 1 hour), plus one precise picker.
- A heading is never smaller than the list it names.
- Never offer a peek of the page already open.

*Watch for:* a sentence where a heading would do, a label that repeats the icon, a screen that opens fully expanded, a font under body size, a control that opens what's already open.

## 5. One thing at a time

Attention that has to choose between three things goes somewhere else.

- **Five options is the ceiling a person chooses between at once; three is ideal.** Don't nest a submenu under a submenu. If a level holds only a few rows, it shouldn't be a level. The tension between fewer clicks and less clutter is real: cite both halves, never just one. A list of the user's *own* things (seven projects) is not a menu of options and isn't capped.
- If no submenu is needed, don't add one. Depth must be paid for by clutter it actually removes.
- **One question per screen.** A screen with three choices makes a person stop and work out which path is theirs; that pause is where ADHD attention goes.
- **One button, then the choices.** "Add a photo", then how. A row of parallel buttons is the same wall of options in a different shape.
- **A tile is a glance, not a workspace.** At most one new line, or the words of one existing item in a one-field popup. Real writing happens one tap deeper.
- A field is easier to fill in when it's the only one on screen.
- The home screen does one job: the whole of life at a glance. Depth lives one tap in.
- A peek is not a move: you can look without leaving.

*Watch for:* two primary actions on one screen, a form on a tile, a detail view reached by accident.

## 6. Nothing is ever lost

Trust that nothing will vanish is what lets someone stop holding it in their head.

- **Everything typed or spoken autosaves, with no save step, even when the user backs out of a screen.** Commit on losing focus; tapping outside a popup keeps what was typed. A breach of this is a bug.
- **Nothing is deleted unless the user deletes it.**
- Catch first, ask nothing: a thought, photo, link, file or voice note is one tap and it's in.
- **A file survives the thing it was attached to.** Abandon the to-do and the photo stays, unattached. Only the arrow is dropped.
- A voice capture keeps its recording. The audio is what was promised; the words are the bonus.
- Search finds everything, filed or not, and costs no extra tap.
- Connecting things is vital and must be findable. Two mechanisms only: Move (relocates) and Link (connects without relocating).
- There is an archive and a library, distinct from the unsorted pile. A crossed-off item goes to the archive, not into nothing.
- Data stays on the device unless the owner decides otherwise in plain terms.
- **Setup is easy and nothing is lost across devices, reinstalls or updates.**
- A ticked item comes back if it's needed again (a second recipe wanting an already-ticked ingredient unticks it).
- Quantities are joined, never summed: "1 cup" plus "200ml" has no right answer, and a plausible wrong number is worse than an honest pair.
- A stored field is never dropped to fix a name. Renames change what people see, not what they saved.
- **Taking something out of a view takes it out of that view only.** A hide is a drawing, never a deletion.
- **Friction matches what the person will fear, not what the code does.** Two identical operations can warrant different confirmation if one looks like turning an alarm off. Say what the drawing can't ("It will still ring").

*Watch for:* a Cancel that discards, a delete that deletes, a field cleared on blur, a hide that quietly removes the thing everywhere, one confirmation on everything or on nothing.

## 7. Everything can be undone

Mistakes are expected and cost nothing.

- **Undo is always available.** Delete is an archive with an Undo. A brief Undo bar (about seven seconds) then fades; a permanent bar reads as an unresolved thing demanding attention. Permanent deletion lives in one place and asks first.
- **Where Undo exists, crossing off is one tap with no confirm question.** "Are you sure?" is for the places that have no way back.
- Nothing vanishes on its own. Ticking is not deleting.
- **Nothing moves under your thumb.** A ticked line stays where it is, struck through and dimmed; a list that re-sorts itself loses the place your eye was holding.
- **Back closes the top thing first**: popup, field, sheet, menu, before it ever asks about leaving the app.
- Nothing set in onboarding is permanent; everything is changeable in Settings.

*Watch for:* "Are you sure?" where an Undo would do, a list that re-sorts on a tick, an action with no way back.

## 8. It adapts to you

- **A sensible default, and always a way to change it.** Both halves, or it isn't the rule. A default with no override takes a decision away; a choice with no default is a question asked of someone who came to do something else.
  - The default does the right thing for someone who never touches it: not the safest thing, the thing they'd have chosen.
  - **The override is stored; the default is not.** Absence means "default", a stored value means "they chose this". This also makes a new control safe to ship with no migration.
  - **The control lives on the thing**, where the person already is when they have the opinion, not in a preferences screen.
  - Exceptions protect data or a person (anything that would let a gesture destroy rather than archive), never "building the override was awkward". Exceptions are asked about, not decided.
- **Anything that can be on/off shows its state on the list and flips with one tap.** Tapping the name opens its details.
- Self-set parameters, in onboarding and in Settings, never locked: palette, type size, layout, which tiles show, navigation shortcuts, sounds.
- Palettes are all muted and differ by color family, not loudness.
- A chosen option is filled, never just outlined harder. Selection you can see across the room.
- Fields grow with use: pick-lists with "add new", not freeform and not a locked preset.
- What a view draws is the user's to choose, one thing at a time.
- Tester builds carry a safety net, never a way past the choice.
- Device-type behavior (e-ink, tablet) branches on a **user setting**, never on detected hardware.

*Watch for:* a value that can only be set once, a preference hidden from Settings, a default that overrides a saved choice.

## 9. It explains itself

- **Name things, not actions.** A verb is a small instruction, and a screen of small instructions is a screen making demands. A button that does something takes a verb; something that goes somewhere takes a noun.
- **The look says what a thing is.** A dashed outline = not built yet. A filled tag = press me. A drawn rule under a heading = this opens.
- Icons appear only when there's something to show (a paperclip when there's an attachment), never as decoration.
- The obvious control does the obvious thing. A chevron means "open".
- **A door wears an arrow; a button wears none, and shows what it did.**
- **One-time hints:** one line, on a card, at the moment the thing is first in reach, until tapped away. Never a count, a tour, or a hint over a hint. Offer "Later" beside "Got it". Hints can be turned off or shown again.
- Nothing needs to be remembered to check later. Surface it.
- The empty state names what can go there instead of reporting that nothing does.
- A hold on empty space starts something new.
- **A thing that's put away says where it went**, whatever door it came in by. One line, then it goes: "Saved to Unsorted." Never a count, never a button, never a second line. Filing costs nothing, so the app owes the person the one fact filing would have given them: where to look.

*Watch for:* a verb on a tile, an icon on every row, a feature only a tour would reveal, a thing saved with no word about where it is now.

## 10. Plain words

- **One thing, one name; one name, one thing.** The second half bites harder: two things wearing one word is worse than one thing wearing two. A door and the room behind it share a name. A page carries its name unless its content states it. This applies to notes and code too.
- **A menu row is named for what it does**, not for the category it sits in. The test isn't "is the word plain" but "does it name this function and nothing else". "A day" is plain and still wrong if "a day" already means a calendar date elsewhere.
- **Concise, literal, practical. Less metaphor, no poetry.** A metaphor on something you press costs executive function. A *drawing* may be metaphorical; a row you press may not.
- **A container is a literal noun, an action is a verb, a visual display is a noun and may be metaphorical.** A container's name doesn't take "All" (the button, the Settings row and the page title are one word). The shortest name isn't automatically right; it must be unclaimed as well as short.
- Short, brief, practical. Retire themed vocabulary; a clever name adds a decoding step.
- Warm and non-judgmental, never clinical.
- No reassurance sentence where a blank line reads fine. Unasked-for reassurance reads as "you were supposed to worry."
- Empty states are a mark, not a sentence, and never a count of what isn't there.
- No em dashes in anything the user reads. American English.
- A time reads the way it is said: 1:05pm, never 13:05. One helper, so no two screens disagree.
- Never promise about a page you don't control ("three taps on Google's site"). Describe the destination, name the button, never count the taps.
- Say what a setting really does, and make a sentence conditional if it's true on one build and false on another.
- **Cut a word that carries nothing.** "3 weeks", not "in 3 weeks". Remove leading prepositions, articles and "there are", never a word doing work. Test: does removing it change the meaning?
- A name is the owner's to decide: propose, don't ship.

*Watch for:* a metaphor, "should", a sentence under an empty list, a page named with a verb, "All X" where the page is just "X".

## 11. Setup is skippable, and the app already works

- **Bare bones is the default, and it already works.** Skipping everything is a legitimate way to use it.
- **Every step can be skipped, and Skip sits beside Next at the same size.** No "are you sure?".
- Snooze is a first-class answer ("Remind me later"). Ask once more, then stop.
- Setup comes in pieces: a few things on day one, the rest as small modules offered one at a time. A piece already moved off its default counts as done.
- **Every step has a way out that is legible as a way out.** Feeling trapped breaks a walkthrough faster than any single sentence.
- Cut every page that doesn't earn its place. Don't ask for a name the app doesn't use.
- Nothing in the first run invites an action that can't work yet (a photo prompt before the key is set up).
- Defaults are real answers, pre-filled. Tapping Next all the way through gives a well-configured app.
- Progress is a row of marks that fills, never "3 of 7".
- Technical setup is walked, not explained: one action at a time, what it costs and gives, the link provided, a one-tap paste button.
- The first run ends by catching one real thing, so the home screen is never first seen empty.
- A guided flow (next, next, next) beats one big form.

*Watch for:* a step with no Skip, a screen with two questions, a first run that opens on a camera before there's anything to point it at.

## 12. A finished page stays finished

- Reading is not a form. A recipe you're cooking from reads as a recipe; one quiet pencil turns the boxes on. A brand-new empty record opens already in edit mode.
- A field with nothing in it shows nothing. No heading naming what hasn't been done.
- **Nothing fake is seeded.** Day one shows the structure (a planner page with its bands drawn), not fake content pretending to be theirs.
- **AI output is a draft, never a commit.** It runs only when asked, fills a normal edit form, and nothing saves until the person reviews it. Merging never overwrites what they typed.
- The app is honest about what it did: a failed copy is said out loud; an Undo line says what happened without a number.

## 13. Every container is the same container, until its purpose says otherwise

Projects, events, notebooks and whatever comes next share one shape: same header, same navigation, same gestures, same doors. A container leaves the template only where its own purpose gives it a reason, and **an exception is asked about, never decided.** Familiarity is a demand lowered: a person who has learned one container has learned them all.

Containers are for slow thinking and the home screen for fast thinking, so a container may carry a menu where the home screen carries a gesture, provided every container carries the same menu.

*Watch for:* a feature added to one container and not its twins (the partial sweep), and the opposite: flattening a container's own reason into the template without asking.

## 14. Consistency, made executable

- One function, one name. One type of item, one set of gestures. One field component per kind of field. One save behavior per kind of field. A name is a noun for a container and a verb for an action.
- **Every rule that matters becomes a checker**, not a paragraph. A rule written only in prose goes stale; it was stated in three files and obeyed on six screens of seventeen until a check enforced it.
- A check that can't tell a true finding from a false one is worse than no check.

---

## 15. Why it works: what the ADHD brain runs on

**Dodson's four motivators: Interest, Challenge, Novelty, Urgency.** The ADHD nervous system engages through these, not through importance or willpower. Lean on at least one: visually engaging rather than grey text (interest); a small satisfying interaction, a tick or a fill, over a passive list (challenge); variation without gamified streaks (novelty); real urgency shown ambiently, never by countdown or guilt (urgency).

**Brown's six executive-function clusters, and the response:**

| Cluster | What it impairs | Design response |
|---|---|---|
| Activation | Organizing, prioritizing, starting | Remove the first step: capture needs no setup and no blank page |
| Focus | Sustaining and shifting attention | One thing at a time; minimal simultaneous decisions |
| Effort | Sustaining effort, regulating alertness | Short, low-effort interactions; never a long unbroken task to get value |
| Emotion | Frustration tolerance, regulation | No blame or shame in copy; no shouting red; gentle, dismissible prompts |
| Memory | Working memory, recall | Nothing to remember to check later; surface it; frictionless capture |
| Action | Self-monitoring, follow-through | Show what's true now, plainly, instead of asking the person to track progress |

**Pathological demand avoidance** is why the language rules are strict. A word shaped like a demand ("should", "must", "due") can trigger avoidance before the task is even considered.

## 16. How a principle gets into this guide

- It came from the owner, a tester, or something that broke. Not from a blog post.
- Quote their words with the date; paraphrase drifts.
- One rule, one reason, one thing to watch for. No "watch for" means it isn't a rule yet.
- When a rule is amended, the new wording replaces the old.
- A rule that turns out to be about one app stays in that app's documents.
