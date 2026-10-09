import { Injectable } from '@angular/core';

interface TimedRecord<T> {
  value: T;
  expiresAt: number;
}

export class TypedStorage {
  constructor(private storage: Storage) {}

  get<T>(key: string): T | undefined {
    const raw = this.#read(key);
    if (raw === undefined) {
      return undefined;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  set<T>(key: string, value: T): void {
    const string = JSON.stringify(value);
    debugger
    this.storage.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    this.storage.removeItem(key);
  }

  #read(key: string): string | undefined {
    const raw = this.storage.getItem(key);
    return raw === null ? undefined : raw;
  }
}

export class TimedStorage {
  #timeouts = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private storage: Storage,
    private prefix = 'timed:',
  ) {
    this.#restoreTimers();
  }

  get<T>(key: string): T | undefined {
    const record = this.#read<T>(key);
    if (!record) {
      return undefined;
    }

    if (Date.now() >= record.expiresAt) {
      this.remove(key);
      return undefined;
    }

    return record.value;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (ttlMs <= 0) {
      this.remove(key);
      return;
    }

    const expiresAt = Date.now() + ttlMs;
    this.storage.setItem(this.#key(key), JSON.stringify({ value, expiresAt } satisfies TimedRecord<T>));
    this.#schedule(key, ttlMs);
  }

  remove(key: string): void {
    this.#clearTimer(key);
    this.storage.removeItem(this.#key(key));
  }

  #read<T>(key: string): TimedRecord<T> | undefined {
    const raw = this.storage.getItem(this.#key(key));
    if (raw === null) {
      return undefined;
    }

    try {
      const record = JSON.parse(raw) as TimedRecord<T>;
      if (typeof record?.expiresAt !== 'number') {
        return undefined;
      }
      return record;
    } catch {
      return undefined;
    }
  }

  #restoreTimers(): void {
    const keys: string[] = [];

    for (let index = 0; index < this.storage.length; index++) {
      const storageKey = this.storage.key(index);
      if (storageKey?.startsWith(this.prefix)) {
        keys.push(storageKey.slice(this.prefix.length));
      }
    }

    for (const key of keys) {
      const record = this.#read(key);
      if (!record) {
        this.remove(key);
        continue;
      }

      const remaining = record.expiresAt - Date.now();
      if (remaining <= 0) {
        this.remove(key);
      } else {
        this.#schedule(key, remaining);
      }
    }
  }

  #schedule(key: string, ttlMs: number): void {
    this.#clearTimer(key);
    const timeoutId = setTimeout(() => this.remove(key), ttlMs);
    this.#timeouts.set(key, timeoutId);
  }

  #clearTimer(key: string): void {
    const timeoutId = this.#timeouts.get(key);
    if (timeoutId === undefined) {
      return;
    }

    clearTimeout(timeoutId);
    this.#timeouts.delete(key);
  }

  #key(key: string): string {
    return `${this.prefix}${key}`;
  }
}

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  readonly local = new TypedStorage(localStorage);
  readonly session = new TypedStorage(sessionStorage);
  readonly timed = new TimedStorage(localStorage);
}
