# Native build preflight for the app quality work

Observed 17 November 2026 on the local execution host. These are fresh environment checks, not native compilation or device results.

| Check | Observed result |
| --- | --- |
| Node / npm | v24.6.0 / 11.5.1 |
| `xcode-select -p` | `/Library/Developer/CommandLineTools` |
| `xcrun --sdk iphoneos --show-sdk-path` | Failed: iphoneos SDK cannot be located |
| Full Xcode application | Not present in the inspected `/Applications` listing |
| CocoaPods executable | `/Users/alexnoel/.rbenv/shims/pod` exists; not evidence of SDK availability |
| Java | Azul OpenJDK 11.0.15; the only JVM returned by `java_home -V` |
| Default Android SDK | `/Users/alexnoel/Library/Android/sdk` absent |

Q36 cannot compile iOS without full Xcode/iOS SDK. Physical-device acceptance also needs signing and hardware. Q37 requires a supported JDK and configured Android SDK/NDK before a real build; no Android build was claimed. No native toolchain, account or system configuration was changed by this preflight.

The browser and TypeScript/reference tests do not establish native background location, sound delivery, foreground-service reliability or overnight watch operation. Those gates remain explicit while app implementation proceeds.
