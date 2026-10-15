<script lang='ts'>
  import { IconDatabaseExport, IconDatabaseImport, IconInfoCircle, IconTrashX } from '@tabler/icons-svelte';
  import { resolve } from '$app/paths';
  import { novelDocumentViewFontSize, showRuby } from '$lib/appSettings.svelte';
  import NavigationItem from '$lib/components/NavigationItem.svelte';
  import { dexieExportDataFileExtension } from '$lib/constants';
  import { appDatabase, resetDatabase } from '$lib/db';
  import * as AlertDialog from '$lib/shadcn-svelte/components/ui/alert-dialog';
  import { Button } from '$lib/shadcn-svelte/components/ui/button';
  import * as Dialog from '$lib/shadcn-svelte/components/ui/dialog';
  import * as Field from '$lib/shadcn-svelte/components/ui/field';
  import { Input } from '$lib/shadcn-svelte/components/ui/input';
  import NativeSelectOption from '$lib/shadcn-svelte/components/ui/native-select/native-select-option.svelte';
  import NativeSelect from '$lib/shadcn-svelte/components/ui/native-select/native-select.svelte';
  import { Separator } from '$lib/shadcn-svelte/components/ui/separator';
  import Switch from '$lib/shadcn-svelte/components/ui/switch/switch.svelte';
  import * as ToggleGroup from '$lib/shadcn-svelte/components/ui/toggle-group';
  import { downloadBlob, FileNotSelectedError, getCurrentDateString, pickSingleFile } from '$lib/utils/misc';
  import { resetMode, setMode, userPrefersMode } from 'mode-watcher';
  import { toast } from 'svelte-sonner';

  const getCurrentTheme = () => userPrefersMode.current;
  const setCurrentTheme = (theme: string) => {
    if (theme === 'system') {
      resetMode();
    } else if (theme === 'light') {
      setMode('light');
    } else if (theme === 'dark') {
      setMode('dark');
    }
  };

  const exportDexieDatabase = async () => {
    const dexieExportImport = await import('dexie-export-import');
    const blob = await dexieExportImport.exportDB(appDatabase);
    const compressedBlob = await new Response(
      blob.stream().pipeThrough(new CompressionStream('gzip')),
    ).blob();
    downloadBlob(compressedBlob, `yomutalk-plus-data-backup-${getCurrentDateString()}.${dexieExportDataFileExtension}`);
  };

  let importDialogOpen = $state(false);
  let isImporting = $state(false);

  const openImportDialog = () => {
    importDialogOpen = true;
  };

  let deleteDataDialogOpen = $state(false);
  let deleteConfirmationText = $state('');
  let isDeleting = $state(false);

  const openDeleteDataDialog = () => {
    deleteConfirmationText = '';
    deleteDataDialogOpen = true;
  };

  const deleteAllAppData = async () => {
    if (isDeleting) return;
    isDeleting = true;
    try {
      await resetDatabase();
      localStorage.clear();
      toast.success('アプリのデータを削除しました');
      location.href = resolve('/');
    } catch (error) {
      toast.error('アプリのデータの削除に失敗しました');
      console.error('Failed to delete the app data:', error);
      isDeleting = false;
    }
  };

  const importDexieDatabase = async () => {
    if (isImporting) return;
    isImporting = true;
    try {
      const importFile = await pickSingleFile({
        accept: `.${dexieExportDataFileExtension}`,
      });
      const blob = await new Response(
        importFile.stream().pipeThrough(new DecompressionStream('gzip')),
      ).blob();
      const dexieExportImport = await import('dexie-export-import');
      await dexieExportImport.importInto(appDatabase, blob, {
        clearTablesBeforeImport: true,
      });
      importDialogOpen = false;
      toast.success('小説・ブックマークをインポートしました');
    } catch (error) {
      if (error instanceof FileNotSelectedError) return;
      toast.error('小説・ブックマークのインポートに失敗しました');
      console.error('Failed to import the database:', error);
    } finally {
      isImporting = false;
    }
  };
</script>

<div class='flex flex-col gap-2'>
  <Field.Group>
    <Field.Field orientation='horizontal'>
      <Field.Label for='novel-document-view-font-size'>小説文字サイズ</Field.Label>
      <ToggleGroup.Root
        variant='outline'
        type='single'
        size='sm'
        bind:value={novelDocumentViewFontSize.current}>
        <ToggleGroup.Item value='sm' aria-label='小'><span class='text-sm'>文</span></ToggleGroup.Item>
        <ToggleGroup.Item value='md' aria-label='中'><span class='text-base'>文</span></ToggleGroup.Item>
        <ToggleGroup.Item value='lg' aria-label='大'><span class='text-lg'>文</span></ToggleGroup.Item>
        <ToggleGroup.Item value='xl' aria-label='特大'><span class='text-xl'>文</span></ToggleGroup.Item>
      </ToggleGroup.Root>
    </Field.Field>
    <Field.Field orientation='horizontal'>
      <Field.Label for='show-ruby'>ルビを表示</Field.Label>
      <Switch id='show-ruby' bind:checked={showRuby.current}/>
    </Field.Field>
    <Field.Field orientation='horizontal'>
      <Field.Label for='theme'>テーマ</Field.Label>
      <NativeSelect id='theme' bind:value={getCurrentTheme, setCurrentTheme}>
        <NativeSelectOption value='system'>システムに追従</NativeSelectOption>
        <NativeSelectOption value='light'>ライト</NativeSelectOption>
        <NativeSelectOption value='dark'>ダーク</NativeSelectOption>
      </NativeSelect>
    </Field.Field>
  </Field.Group>
  <Separator/>
  <NavigationItem onclick={exportDexieDatabase}>
    {#snippet startIcon()}
      <IconDatabaseExport/>
    {/snippet}
    小説・ブックマークをバックアップ
    {#snippet description()}
      小説・ブックマークのデータを{dexieExportDataFileExtension}形式のファイルにバックアップします
    {/snippet}
  </NavigationItem>
  <NavigationItem onclick={openImportDialog}>
    {#snippet startIcon()}
      <IconDatabaseImport/>
    {/snippet}
    小説・ブックマークを復元
    {#snippet description()}
      {dexieExportDataFileExtension}形式のファイルから小説・ブックマークのデータを復元します
    {/snippet}
  </NavigationItem>
  <Separator/>
  <NavigationItem variant='destructive' onclick={openDeleteDataDialog}>
    {#snippet startIcon()}
      <IconTrashX/>
    {/snippet}
    アプリのデータを削除
    {#snippet description()}
      小説・ブックマークのデータおよびアプリの設定を削除し初期状態に戻します。この操作は取り消せません。
    {/snippet}
  </NavigationItem>
  <Separator/>
  <NavigationItem href={resolve('/settings/info')}>
    {#snippet startIcon()}
      <IconInfoCircle/>
    {/snippet}
    このアプリについて
  </NavigationItem>
</div>

<AlertDialog.Root bind:open={importDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>データを復元しますか？</AlertDialog.Title>
      <AlertDialog.Description>
        現在の小説・ブックマークは削除され、選択したバックアップのデータで上書きされます。この操作は取り消せません。
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={isImporting}>キャンセル</AlertDialog.Cancel>
      <AlertDialog.Action variant='destructive' disabled={isImporting} onclick={importDexieDatabase}>
        復元
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<Dialog.Root bind:open={deleteDataDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>アプリのデータを削除しますか？</Dialog.Title>
      <Dialog.Description>
        小説・ブックマークのデータおよびアプリの設定を削除し初期状態に戻します。この操作は取り消せません。
      </Dialog.Description>
    </Dialog.Header>
    <Field.Field>
      <Field.Label for='delete-data-confirmation'>確認のため「削除」と入力してください</Field.Label>
      <Input
        id='delete-data-confirmation'
        bind:value={deleteConfirmationText}
        autocomplete='off'
        disabled={isDeleting}/>
    </Field.Field>
    <Dialog.Footer>
      <Button variant='outline' disabled={isDeleting} onclick={() => (deleteDataDialogOpen = false)}>
        キャンセル
      </Button>
      <Button
        variant='destructive'
        disabled={deleteConfirmationText !== '削除' || isDeleting}
        onclick={deleteAllAppData}>
        削除
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
