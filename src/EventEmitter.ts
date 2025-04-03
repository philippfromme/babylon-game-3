type EventMap = {
  [event: string]: (...args: any[]) => void;
};

export default class EventEmitter<T extends EventMap> {
  private listeners: { [K in keyof T]?: T[K][] } = {};

  on<K extends keyof T>(event: K, listener: T[K]) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
  }

  off<K extends keyof T>(event: K, listener: T[K]) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event]!.filter(
        (l) => l !== listener
      );
    }
  }

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>) {
    if (this.listeners[event]) {
      for (const listener of this.listeners[event]!) {
        listener(...args);
      }
    }
  }
}
