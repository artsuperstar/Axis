# Active Workout — Stage 13B

Fitness → Workout renders the unfinished session as normal screen content. The start choices appear only when no session is active. Module entry and Home Resume select Workout automatically; internal Routines, Exercises and History navigation remains available.

## Interaction

- The session heading and each exercise are plain grouped sections using Calm Utility typography, surfaces and spacing.
- Logged sets are 44-point minimum touch rows with wrapping values. Tap to edit; Delete is inside the set editor and retains its confirmation. Display numbering follows the current list, leaving persisted IDs/positions intact.
- Add set sits beneath each exercise and retains previous-set defaults. Add exercise follows the exercise list and uses the existing autocomplete/richer creation flow.
- Notes and Actions use quiet controls near headings. Remove exercise and Discard live in focused action sheets, with existing destructive confirmations.
- Strength focuses Weight, then Reps; Bodyweight focuses Reps before optional Added weight. Duration pairs Minutes/Seconds, wrapping at narrow widths or larger font scales. Distance precedes optional duration. Parsing and integer persistence are unchanged.
- Finish is primary and confirmed. Success returns Workout to its start state; completed detail remains read-only in History. Multiple completed sessions per day remain supported.

## Layout, tabs and keyboard

The Fitness tab disables its automatic content insets. The existing `react-native-screens/experimental` SafeAreaView applies native top/bottom/side insets, including the native tab bar, to the entire screen. This follows Expo's documented native-tabs approach for layouts that need manual inset handling. Other tabs retain their current inset behavior.

Within that safe area, the navigation header, one flexing ScrollView, and a non-overlapping Finish footer are normal sibling regions. The footer consumes layout space rather than floating over the last exercise. Scroll offsets are retained separately per internal destination. No nested workout ScrollView is introduced.

Workout has no inline keyboard inputs. Numeric and note inputs remain inside the existing keyboard-aware AdaptiveSheet in a native Modal. During editing that focused sheet takes precedence; dismissal returns to the same parent scroll position and Finish footer. No keyboard positioning logic is duplicated into Workout.

## Reads and refreshes

`useFitness` reads the overview and only the active session detail in Workout. Routine details load only for the Routines manager. Completed detail loads on explicit History opening; History summary paging stays unchanged. All requested refresh results publish together, preserving last-known-good data on failure. Set/note editors keep the inputs captured when opened, independent of refreshed session objects.

Home Resume navigates to the existing Fitness tab. Completed-today Home links retain their read-only History detail route. There is a single active-workout presentation, including legacy active source entries.

## Physical-device review

Automated tests verify component structure, callbacks, actual SQLite writes, restoration, targeted reads and refresh failure behavior. They do not simulate native layout, tab-bar insets, VoiceOver, keyboard animation or gestures.

On iPhone Expo Go, start a routine and log/edit sets of all four types. Switch destinations and return, background/foreground, then restart. Scroll a long session and confirm the last exercise, Add exercise and Finish remain accessible above tabs. Check light/dark, long names/values, large text, duration wrapping, keyboard dismissal, VoiceOver edit/delete announcements, notes, destructive cancellation, finish and History. Check the same inset/keyboard behavior on Android when available.
