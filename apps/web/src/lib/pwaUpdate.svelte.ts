type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

class PwaUpdate {
  updateAvailable = $state(false);
  #updateServiceWorker: UpdateServiceWorker | undefined;

  setUpdater(updateServiceWorker: UpdateServiceWorker) {
    this.#updateServiceWorker = updateServiceWorker;
  }

  markUpdateAvailable() {
    this.updateAvailable = true;
  }

  async applyUpdate() {
    if (!this.#updateServiceWorker) return;
    await this.#updateServiceWorker(true);
  }
}

export const pwaUpdate = new PwaUpdate();
