# Q34 conservative watch readiness

The audible test is authorized only by native test success in the current lifecycle and a local monotonic clock starting at request time. It expires after 600000ms, clears hearing confirmation, and never uses a wall-clock/native saved timestamp to authorize readiness. Old expiry callbacks cannot invalidate newer tests. Native arming enforcement is unchanged.

Readiness has anchor/radius inline reasons, links to missing actions, detailed missing permission flags, and current native connection requirements. Background/resume invalidates pending native permission, alarm-test, and status replies; an iOS inactive location prompt can finish capture. A delayed permission reply requests an explicit recheck. Finite nonnegative connection age is required.

Independent Sol review identified lifecycle and stale-reply issues; all were fixed and a second read-only review found no remaining blocker. Focused helper/bridge tests passed (9). Isolated mounted harness passed 6 tests including five watch scenarios at 390×844 plus card/field matrix. Wall-clock rollback does not prolong the test; monotonic expiry disables Arm; backgrounding cannot restore hearing/permission readiness from a pending reply.

Run: `npm exec --workspace=@anchor-buddy/mobile -- playwright test --config=e2e/watch-harness/playwright.config.ts`. The bundle substitutes native bridge, location, lifecycle, history storage and icons only under e2e/watch-harness; the production browser stays unavailable and no native contract changed. esbuild is a pinned direct dev dependency.

Physical audible confirmation, native background acquisition and supported-device acceptance remain blocked by Q36/Q37 toolchains/devices; no physical native success is claimed.
