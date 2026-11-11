import { useEffect, useReducer, useRef } from 'react';
import {
  initialWorkspace,
  workspaceReducer,
  RequestGeneration,
  type ModalName,
  type WorkspaceState,
} from './workspaceController';

/** UI transition state; device/network effects stay outside the reducer. */
export function useWorkspaceController() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);
  function set<K extends Exclude<keyof WorkspaceState, 'modal'>>(key: K, value: WorkspaceState[K]) {
    dispatch({ type: 'set', key, value });
  }
  const modal = (name: ModalName, open: boolean) =>
    dispatch(open ? { type: 'openModal', name } : { type: 'closeModal', name });
  const dataRequest = useRef<AbortController | null>(null);
  const generation = useRef(new RequestGeneration());
  const mounted = useRef(true);
  const cancelDataRequest = () => {
    generation.current.cancel();
    dataRequest.current?.abort();
  };
  useEffect(() => {
    mounted.current = true;
    generation.current.mount();
    return () => {
      mounted.current = false;
      generation.current.dispose();
      dataRequest.current?.abort();
    };
  }, []);
  return { state, dispatch, set, modal, dataRequest, generation, mounted, cancelDataRequest };
}
