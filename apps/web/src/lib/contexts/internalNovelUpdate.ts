import { createContext } from 'svelte';

export interface InternalNovelUpdateContext {
  readonly updatedDocumentIds: ReadonlySet<string>;
  readonly updatingDocumentIds: ReadonlySet<string>;
  readonly updateDocument: (documentId: string) => Promise<void>;
}

export const [getInternalNovelUpdateContext, setInternalNovelUpdateContext] = createContext<InternalNovelUpdateContext>();
