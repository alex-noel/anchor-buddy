# Q33 position capture validation

The planner and watch now share finite-coordinate, freshness and accuracy validation with explicit caller bounds: map latitude ±85°, watch latitude ±90°, longitude ±180°. Accuracy must be finite and 0–15 metres, fix age must be no more than 15 seconds old or 5 seconds in the future.

Watch capture has a cancellation generation separate from watch commands. Manual coordinate changes, Cancel, unmount, a newer capture and an active native status invalidate the outstanding capture. Start watch is disabled while acquisition is pending. Existing native sessions are not changed by this helper or by editing a draft.

Four focused tests pass for invalid fixes, exact bounds, permission cancellation, late replies/new requests, denial and malformed acquisition. Mobile typecheck passed. A separate Terra/high review found no actionable code defect in validation, cancellation or active-session preservation.

Mounted native-screen wiring and physical GPS acquisition remain unverified because this host has no runnable native build. These are explicit acceptance gaps, not inferred from helper tests; Q38 and Q36/Q37 own the required mounted/device evidence.

Integrator mounted verification: actual WatchScreen in isolated native-bridge/location test harness passed delayed manual-edit/cancel/unmount, active-watch anchor preservation, valid 88° capture across inactive/active permission-prompt lifecycle. No arm call occurred. Capture cancels on actual backgrounding; temporary iOS inactivity does not discard its own location prompt. Independent second review accepted the lifecycle fix. Physical GPS acquisition remains pending Q36/Q37.
