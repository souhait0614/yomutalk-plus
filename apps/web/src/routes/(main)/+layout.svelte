<script lang='ts'>
  import { setInternalNovelUpdateContext } from '$lib/contexts/internalNovelUpdate';
  import { getLoadedNovelDocuments, updateLoadedInternalNovelDocument } from '$lib/db';
  import { downloadInternalNovel, fetchInternalNovelHash } from '$lib/internalNovels';
  import { m } from '$lib/paraglide/messages';
  import { stateQuery } from 'dexie-svelte-query';
  import { toast } from 'svelte-sonner';
  import { SvelteSet } from 'svelte/reactivity';

  const { children } = $props();

  const loadedNovelDocumentsQuery = stateQuery(getLoadedNovelDocuments);
  const loadedNovelDocuments = $derived(loadedNovelDocumentsQuery.current ?? []);

  const updatedDocumentIds = new SvelteSet<string>();

  const updatingDocumentIds = new SvelteSet<string>();

  let checkRunId = 0;

  $effect(() => {
    const internalDocuments = loadedNovelDocuments.flatMap((document) => (
      document.type === 'internal'
        ? [{ id: document.id, novelId: document.novelId, hash: document.hash }]
        : []
    ));
    if (internalDocuments.length === 0) return;

    const runId = ++checkRunId;
    void (async () => {
      for (const document of internalDocuments) {
        const latestHash = await fetchInternalNovelHash(document.novelId).catch(() => undefined);
        if (runId !== checkRunId || latestHash === undefined) continue;
        if (latestHash === document.hash) updatedDocumentIds.delete(document.id);
        else updatedDocumentIds.add(document.id);
      }
    })();
  });

  const updateDocument = async (documentId: string) => {
    const document = loadedNovelDocuments.find((candidate) => candidate.id === documentId);
    if (document?.type !== 'internal' || updatingDocumentIds.has(documentId)) return;

    updatingDocumentIds.add(documentId);
    try {
      const { fileData, hash } = await downloadInternalNovel(document.novelId);
      await updateLoadedInternalNovelDocument(documentId, {
        title: document.title,
        fileType: document.fileType,
        fileData,
        hash,
      });
      updatedDocumentIds.delete(documentId);
      toast.success(m.library_updated_novel({ title: document.title }));
    } catch {
      toast.error(m.library_update_built_in_failed());
    } finally {
      updatingDocumentIds.delete(documentId);
    }
  };

  setInternalNovelUpdateContext({
    updatedDocumentIds,
    updatingDocumentIds,
    updateDocument,
  });
</script>

{@render children()}
