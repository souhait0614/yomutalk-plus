import { createContext } from 'svelte';

export interface ManageLoadedNovelDocumentsDialogContext {
  open: () => void;
}

export const [getManageLoadedNovelDocumentsDialogContext, setManageLoadedNovelDocumentsDialogContext] = createContext<ManageLoadedNovelDocumentsDialogContext>();
