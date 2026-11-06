import { registerRootComponent } from 'expo';
import App from './src/App';
import { prepareOfflineShell } from './src/lib/offlineShell';
// Registration failure must not prevent online/core usage. Explicit map downloads
// await this operation and surface a useful error if offline startup is not ready.
void prepareOfflineShell().catch(() => {});
registerRootComponent(App);
