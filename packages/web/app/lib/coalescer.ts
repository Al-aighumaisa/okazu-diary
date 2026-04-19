export type State<V, K = string> = Map<K, Entry<V>>;

export interface Options {
  signal?: AbortSignal | undefined;
}

interface Entry<V> {
  abort: AbortController;
  signals: AbortSignal[];
  value: Promise<V>;
}

/** Coalesce concurrent identical requests. */
export default async function coalesce<T, Args extends unknown[], K = string>(
  state: State<T, K>,
  key: K,
  f: (signal?: AbortSignal, ...args: Args) => Promise<T>,
  args: Args,
  opts?: Options,
): Promise<T> {
  if (state.has(key)) {
    const entry = state.get(key)!;

    const signal = opts?.signal;
    if (signal) {
      entry.signals.push(signal);
      signal.addEventListener(
        'abort',
        abortEventHandler(signal, entry.abort, entry.signals),
      );
    }

    return entry.value;
  } else {
    const abort = new AbortController();
    const signals: AbortSignal[] = [];

    const signal = opts?.signal;
    if (signal) {
      signals.push(signal);
      signal.addEventListener(
        'abort',
        abortEventHandler(signal, abort, signals),
      );
    }

    const value = f(abort.signal, ...args).finally(() => state.delete(key));
    const entry = {
      abort,
      signals,
      value,
    } satisfies Entry<T>;
    state.set(key, entry);

    return value;
  }
}

function abortEventHandler(
  target: AbortSignal,
  abort: AbortController,
  signals: AbortSignal[],
): () => void {
  return () => {
    if (signals.every((s) => s.aborted)) {
      abort.abort(target.reason);
    }
  };
}
