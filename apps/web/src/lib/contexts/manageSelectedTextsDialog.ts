import { createContext } from 'svelte';

export interface ManageSelectedTextsDialogContext {
  open: () => void;
}

export const [getManageSelectedTextsDialogContext, setManageSelectedTextsDialogContext] = createContext<ManageSelectedTextsDialogContext>();
