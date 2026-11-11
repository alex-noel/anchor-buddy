import { useEffect, useReducer, useRef } from 'react';
import {
  initialWorkspace,
  workspaceReducer,
  RequestGeneration,
  cancelWorkspaceRequest,
  disposeWorkspaceRequest,
  type ModalName,
  type WorkspaceState,
} from './workspaceController';

/** UI transition state; device/network effects stay outside the reducer. */
export function useWorkspaceController() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);
  function set<K extends Exclude<keyof WorkspaceState, 'modal'>>(
    key: K,
    value: NoInfer<WorkspaceState[K]>,
  ) {
    dispatch({ type: 'set', key, value } as Parameters<typeof workspaceReducer>[1]);
  }
  const modal = (name: ModalName, open: boolean) =>
    dispatch(open ? { type: 'openModal', name } : { type: 'closeModal', name });
  const dataRequest = useRef<AbortController | null>(null);
  const generation = useRef(new RequestGeneration());
  const mounted = useRef(true);
  const cancelDataRequest = () => {
    cancelWorkspaceRequest(generation.current, dataRequest.current);
  };
  useEffect(() => {
    mounted.current = true;
    generation.current.mount();
    return () => {
      mounted.current = false;
      disposeWorkspaceRequest(generation.current, dataRequest.current);
    };
  }, []);
  const send = (action: import('./workspaceController').WorkspaceAction) => dispatch(action);
  return { state, dispatch: send, set, modal, dataRequest, generation, mounted, cancelDataRequest };
}
