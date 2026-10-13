/* Flux, small: a page's state lives in one store. Views dispatch actions, a
   pure reducer returns the next state, and listeners (views, effects) react.
   State only one component cares about stays in that component (useState). */

type Reducer<S, A> = (state: S, action: A) => S;
export type Listener<S, A> = (state: S, previous: S, action: A) => void;

export interface Store<S, A> {
  getState(): S;
  dispatch(action: A): void;
  subscribe(listener: Listener<S, A>): () => void;
}

export function createStore<S, A>(reducer: Reducer<S, A>, initial: S): Store<S, A> {
  let state = initial;
  const listeners = new Set<Listener<S, A>>();
  // An action dispatched by a listener waits its turn, so every listener sees every change in order
  const queue: A[] = [];
  let dispatching = false;
  return {
    getState: () => state,
    dispatch(action) {
      queue.push(action);
      if (dispatching) return;
      dispatching = true;
      for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
        const previous = state;
        state = reducer(state, next);
        for (const listener of listeners) listener(state, previous, next);
      }
      dispatching = false;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// Draws now, then on every change
export function follow<S, A>(store: Store<S, A>, draw: (state: S) => void) {
  draw(store.getState());
  store.subscribe(draw);
}

// Something on its way from the network: coming, here (its data), or not coming (and why)
export type Load<T> = { status: 'loading' } | { status: 'loaded'; data: T } | { status: 'failed'; error: string };
