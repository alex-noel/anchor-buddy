import { WatchKernel } from './kernel';
import type { ArmOptions, WatchFix, WatchPermissions, WatchStatus } from '../types';

/** Test-only replay harness. It is not exported or imported by the application runtime. */
export class WatchSimulator {
  private kernel = new WatchKernel(true);
  private listeners = new Set<(status: WatchStatus) => void>();
  private timer?: ReturnType<typeof setInterval>;
  private clock() {
    return { wallMs: Date.now(), monotonicMs: globalThis.performance?.now() ?? Date.now() };
  }
  private emit(status = this.kernel.snapshot()) {
    this.listeners.forEach((listener) => listener(status));
    return status;
  }
  async getStatus() {
    return this.emit(this.kernel.tick(this.clock()));
  }
  async requestPermissions(): Promise<WatchPermissions> {
    return {
      location: false,
      precise: false,
      background: false,
      notifications: false,
      canArm: false,
      message: 'Simulation only. This environment cannot monitor or sound a native alarm.',
    };
  }
  async testAlarm(): Promise<void> {
    this.kernel.testAlarm(this.clock());
    this.emit();
  }
  async arm(options: ArmOptions) {
    const status = this.kernel.arm(options, this.clock());
    this.timer = setInterval(() => this.emit(this.kernel.tick(this.clock())), 2_000);
    return this.emit(status);
  }
  async acknowledge() {
    return this.emit(this.kernel.acknowledge());
  }
  async stop() {
    clearInterval(this.timer);
    return this.emit(this.kernel.stop());
  }
  async updateRadius(radiusM: number, confirmed: boolean) {
    return this.emit(this.kernel.updateRadius(radiusM, confirmed, this.clock()));
  }
  injectFix(fix: WatchFix) {
    return this.emit(this.kernel.fix(fix, this.clock()));
  }
  interrupt() {
    clearInterval(this.timer);
    return this.emit(this.kernel.interrupt(this.clock()));
  }
  subscribe(listener: (status: WatchStatus) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
