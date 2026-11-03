import { readonly, ref, type Ref } from 'vue'

/** Rappels acceptés par `registerSW` de `virtual:pwa-register` (sous-ensemble utilisé). */
export interface RegisterOptions {
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
  onRegisterError?: (error: unknown) => void
}

/** Signature de `registerSW` : renvoie la fonction qui active la version en attente. */
export type RegisterServiceWorker = (options: RegisterOptions) => (reloadPage?: boolean) => Promise<void>

export interface UpdateState {
  /** Vrai quand une nouvelle version est téléchargée et attend d'être activée. */
  updateReady: Readonly<Ref<boolean>>
  /** Active la version en attente et recharge la page. */
  applyUpdate: () => Promise<void>
}

/**
 * État « nouvelle version prête ». Sans fonction d'enregistrement (développement, navigateur sans
 * service worker), l'état reste faux. Une erreur d'enregistrement est ignorée : l'application
 * fonctionne alors comme un site ordinaire.
 */
export function createUpdateState(register?: RegisterServiceWorker): UpdateState {
  const updateReady = ref(false)
  if (!register) return { updateReady: readonly(updateReady), applyUpdate: async () => {} }

  const updateServiceWorker = register({
    onNeedRefresh: () => {
      updateReady.value = true
    },
    onOfflineReady: () => {},
    onRegisterError: () => {},
  })
  return { updateReady: readonly(updateReady), applyUpdate: () => updateServiceWorker(true) }
}
