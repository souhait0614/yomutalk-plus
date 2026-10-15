import { createContext } from 'svelte';

export interface AddLoadedNovelDocumentDialogContext {
  open: () => void;
}

export const [getAddLoadedNovelDocumentDialogContext, setAddLoadedNovelDocumentDialogContext] = createContext<AddLoadedNovelDocumentDialogContext>();
