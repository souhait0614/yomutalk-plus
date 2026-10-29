<script lang='ts'>
  import { IconDatabaseExport, IconDatabaseImport, IconInfoCircle, IconTrashX } from '@tabler/icons-svelte';
  import { resolve } from '$app/paths';
  import { novelDocumentViewFontSize, shiftMainByGesture, showRuby } from '$lib/appSettings.svelte';
  import NavigationItem from '$lib/components/NavigationItem.svelte';
  import { dexieExportDataFileExtension } from '$lib/constants';
  import { appDatabase, resetDatabase } from '$lib/db';
  import { m } from '$lib/paraglide/messages';
  import { getLocale, setLocale } from '$lib/paraglide/runtime';
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
  const getCurrentLocale = () => getLocale();
  const setCurrentLocale = (locale: string | undefined) => {
    if (locale === 'ja' || locale === 'en') void setLocale(locale);
  };

  let backupDialogOpen = $state(false);
  let isExporting = $state(false);

  const openBackupDialog = () => {
    backupDialogOpen = true;
  };

  const exportDexieDatabase = async () => {
    if (isExporting) return;
    isExporting = true;
    try {
      const dexieExportImport = await import('dexie-export-import');
      const blob = await dexieExportImport.exportDB(appDatabase);
      const compressedBlob = await new Response(
        blob.stream().pipeThrough(new CompressionStream('gzip')),
      ).blob();
      downloadBlob(compressedBlob, `yomutalk-plus-data-backup-${getCurrentDateString()}.${dexieExportDataFileExtension}`);
      backupDialogOpen = false;
    } catch (error) {
      toast.error(m.settings_backup_failed());
      console.error('Failed to export the database:', error);
    } finally {
      isExporting = false;
    }
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
      toast.success(m.settings_delete_data_success());
      location.href = resolve('/');
    } catch (error) {
      toast.error(m.settings_delete_data_failed());
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
      toast.success(m.settings_import_success());
    } catch (error) {
      if (error instanceof FileNotSelectedError) return;
      toast.error(m.settings_import_failed());
      console.error('Failed to import the database:', error);
    } finally {
      isImporting = false;
    }
  };
</script>

<div class='flex flex-col gap-2'>
  <Field.Group class='p-4'>
    <Field.Field orientation='horizontal'>
      <Field.Label for='theme'>{m.settings_theme()}</Field.Label>
      <NativeSelect id='theme' bind:value={getCurrentTheme, setCurrentTheme}>
        <NativeSelectOption value='system'>{m.theme_system()}</NativeSelectOption>
        <NativeSelectOption value='light'>{m.theme_light()}</NativeSelectOption>
        <NativeSelectOption value='dark'>{m.theme_dark()}</NativeSelectOption>
      </NativeSelect>
    </Field.Field>
    <Field.Field orientation='horizontal'>
      <Field.Label for='language'>{m.settings_language()}</Field.Label>
      <NativeSelect id='language' bind:value={getCurrentLocale, setCurrentLocale}>
        <NativeSelectOption value='ja'>日本語</NativeSelectOption>
        <NativeSelectOption value='en'>English</NativeSelectOption>
      </NativeSelect>
    </Field.Field>
    <Field.Field orientation='horizontal'>
      <Field.Label for='novel-document-view-font-size'>{m.settings_novel_font_size()}</Field.Label>
      <ToggleGroup.Root
        variant='outline'
        type='single'
        size='sm'
        bind:value={novelDocumentViewFontSize.current}>
        <ToggleGroup.Item value='sm' aria-label={m.settings_font_size_small()}>
          <span class='text-sm'>文</span>
        </ToggleGroup.Item>
        <ToggleGroup.Item value='md' aria-label={m.settings_font_size_medium()}>
          <span class='text-base'>文</span>
        </ToggleGroup.Item>
        <ToggleGroup.Item value='lg' aria-label={m.settings_font_size_large()}>
          <span class='text-lg'>文</span>
        </ToggleGroup.Item>
        <ToggleGroup.Item value='xl' aria-label={m.settings_font_size_extra_large()}>
          <span class='text-xl'>文</span>
        </ToggleGroup.Item>
      </ToggleGroup.Root>
    </Field.Field>
    <Field.Field orientation='horizontal'>
      <Field.Content>
        <Field.Label for='show-ruby'>{m.settings_show_ruby()}</Field.Label>
        <Field.Description>
          {m.settings_show_ruby_description()}
        </Field.Description>
      </Field.Content>
      <Switch id='show-ruby' bind:checked={showRuby.current}/>
    </Field.Field>
    <Field.Field orientation='horizontal'>
      <Field.Content>
        <Field.Label for='shift-main-by-gesture'>{m.settings_shift_main_by_gesture()}</Field.Label>
        <Field.Description>
          {m.settings_shift_main_by_gesture_description()}
        </Field.Description>
      </Field.Content>
      <Switch id='shift-main-by-gesture' bind:checked={shiftMainByGesture.current}/>
    </Field.Field>
  </Field.Group>
  <Separator/>
  <NavigationItem onclick={openBackupDialog}>
    {#snippet startIcon()}
      <IconDatabaseExport/>
    {/snippet}
    {m.settings_backup()}
    {#snippet description()}
      {m.settings_backup_description({ ext: dexieExportDataFileExtension })}
    {/snippet}
  </NavigationItem>
  <NavigationItem onclick={openImportDialog}>
    {#snippet startIcon()}
      <IconDatabaseImport/>
    {/snippet}
    {m.settings_restore()}
    {#snippet description()}
      {m.settings_restore_description({ ext: dexieExportDataFileExtension })}
    {/snippet}
  </NavigationItem>
  <Separator/>
  <NavigationItem variant='destructive' onclick={openDeleteDataDialog}>
    {#snippet startIcon()}
      <IconTrashX/>
    {/snippet}
    {m.settings_delete_data()}
    {#snippet description()}
      {m.settings_delete_data_description()}
    {/snippet}
  </NavigationItem>
  <Separator/>
  <NavigationItem href={resolve('/settings/info')}>
    {#snippet startIcon()}
      <IconInfoCircle/>
    {/snippet}
    {m.nav_about()}
  </NavigationItem>
</div>

<AlertDialog.Root bind:open={backupDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{m.settings_backup_confirm_title()}</AlertDialog.Title>
      <AlertDialog.Description>
        <span class='block'>{m.settings_backup_confirm_description({ ext: dexieExportDataFileExtension })}</span>
        <span class='block'>{m.settings_backup_restore_guide()}</span>
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={isExporting}>{m.common_cancel()}</AlertDialog.Cancel>
      <AlertDialog.Action disabled={isExporting} onclick={exportDexieDatabase}>
        {m.settings_backup_submit()}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={importDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{m.settings_restore_confirm_title()}</AlertDialog.Title>
      <AlertDialog.Description>
        {m.settings_restore_confirm_description()}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={isImporting}>{m.common_cancel()}</AlertDialog.Cancel>
      <AlertDialog.Action variant='destructive' disabled={isImporting} onclick={importDexieDatabase}>
        {m.settings_restore_submit()}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<Dialog.Root bind:open={deleteDataDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{m.settings_delete_data_confirm_title()}</Dialog.Title>
      <Dialog.Description>
        {m.settings_delete_data_description()}
      </Dialog.Description>
    </Dialog.Header>
    <Field.Field>
      <Field.Label for='delete-data-confirmation'>{m.settings_delete_data_confirmation_label({ word: m.settings_delete_data_confirm_word() })}</Field.Label>
      <Input
        id='delete-data-confirmation'
        bind:value={deleteConfirmationText}
        autocomplete='off'
        disabled={isDeleting}/>
    </Field.Field>
    <Dialog.Footer>
      <Button variant='outline' disabled={isDeleting} onclick={() => (deleteDataDialogOpen = false)}>
        {m.common_cancel()}
      </Button>
      <Button
        variant='destructive'
        disabled={deleteConfirmationText !== m.settings_delete_data_confirm_word() || isDeleting}
        onclick={deleteAllAppData}>
        {m.common_delete()}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
