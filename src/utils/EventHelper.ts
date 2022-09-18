// prettier-ignore
type EventMap<T extends EventTarget> =
  T extends MediaRecorder ? MediaRecorderEventMap :
  T extends MediaQueryList ? MediaQueryListEventMap :
  T extends Document ? DocumentEventMap :
  T extends Window ? WindowEventMap :
  HTMLElementEventMap;

type EventTypes<T extends EventTarget> = keyof EventMap<T> & string;
type EventValue<T extends EventTarget, K extends EventTypes<T>> = Extract<EventMap<T>[K], Event>;

export function promisifyEvent<T extends EventTarget, K extends EventTypes<T>, V extends EventValue<T, K> = EventValue<T, K>>(target: T, type: K, options: AddEventListenerOptions = {}) {
  return new Promise<V>((resolve) => target.addEventListener(type, resolve as EventListenerOrEventListenerObject, { ...options, once: true }));
}
