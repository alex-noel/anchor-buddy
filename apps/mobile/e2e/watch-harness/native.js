// Test-only lifecycle emitter; all UI primitives remain React Native Web.
export * from 'react-native-web';
const listeners = new Set();
export const AppState = {
  currentState: 'active',
  addEventListener(_event, listener) {
    listeners.add(listener);
    return { remove: () => listeners.delete(listener) };
  },
};
globalThis.setWatchAppState = (state) => {
  AppState.currentState = state;
  for (const listener of listeners) listener(state);
};
