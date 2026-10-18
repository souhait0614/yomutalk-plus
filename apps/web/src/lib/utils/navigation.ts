import { goto } from '$app/navigation';
import { resolve } from '$app/paths';

export function goBackOrHome(): void {
  if (navigation.canGoBack) {
    history.back();
    return;
  }

  void goto(resolve('/'), { replaceState: true });
}
