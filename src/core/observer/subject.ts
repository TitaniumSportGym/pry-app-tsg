export type Listener<TEvent> = (event: TEvent) => void;
export type Unsubscribe = () => void;

/**
 * Patrón Observer: el sujeto guarda una lista de observadores y les avisa a
 * todos cuando ocurre algo, sin saber quiénes son.
 */
export class Subject<TEvent> {
  private readonly listeners = new Set<Listener<TEvent>>();

  /** Registra un observador; llama a la función que devuelve para dejar de escuchar. */
  subscribe(listener: Listener<TEvent>): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(event: TEvent) {
    // Se copia primero: un observador puede desuscribirse (o suscribir a otros) mientras se le notifica.
    for (const listener of [...this.listeners]) {
      try {
        listener(event);
      } catch {
        // Si un observador falla, los demás deben seguir recibiendo el aviso.
        console.error('Observer failed while handling an event');
      }
    }
  }

  get observerCount() {
    return this.listeners.size;
  }
}
