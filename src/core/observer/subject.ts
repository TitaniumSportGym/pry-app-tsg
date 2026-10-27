export type Listener<TEvent> = (event: TEvent) => void;
export type Unsubscribe = () => void;

/**
 * Observer pattern: the subject keeps a list of observers and notifies all of
 * them when something happens, without knowing who they are.
 */
export class Subject<TEvent> {
  private readonly listeners = new Set<Listener<TEvent>>();

  /** Registers an observer; call the returned function to stop listening. */
  subscribe(listener: Listener<TEvent>): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(event: TEvent) {
    // Copy first: an observer may unsubscribe (or subscribe others) while being notified.
    for (const listener of [...this.listeners]) {
      try {
        listener(event);
      } catch (error) {
        // One failing observer must not stop the rest from being notified.
        console.error('Observer failed while handling an event', error);
      }
    }
  }

  get observerCount() {
    return this.listeners.size;
  }
}
