import type { ButtonId, InteractionView } from './interaction'

/** A key of the keyboard that triggers a command of the HUD, named as in aria-keyshortcuts. */
export type Shortcut = 'Enter' | 'Escape' | 'Space' | 'C' | 'E' | 'F' | 'G' | 'M' | 'N' | 'P' | 'R'

/** What a key asks for: let the presentation go on (skip the animation, dismiss the card), or press a button of the HUD. */
export type ShortcutCommand = { kind: 'continue' } | { kind: 'press'; id: ButtonId }

/** Keys of the commands that are not buttons of the turn: send what is composed, close what is open, go on with the presentation. */
export const COMMAND_SHORTCUTS = { submit: 'Enter', close: 'Escape', continue: 'Space' } as const satisfies Record<string, Shortcut>

const NAMES: Partial<Record<Shortcut, string>> = { Enter: 'Entrer', Escape: 'Échap', Space: 'Espace' }

/** Name of the key as the HUD shows it next to an action. */
export function shortcutName(shortcut: Shortcut): string {
  return NAMES[shortcut] ?? shortcut
}

/** The shortcut a `KeyboardEvent.key` stands for: Space for the space bar, letters in upper case. */
export function shortcutOfKey(key: string): string {
  if (key === ' ') return 'Space'
  return key.length === 1 ? key.toUpperCase() : key
}

function press(id: ButtonId): ShortcutCommand {
  return { kind: 'press', id }
}

function closeCommand(view: InteractionView): ShortcutCommand | null {
  if (view.sheet) return press('closeSheet')
  if (view.trade) return press('closeTrade')
  return view.buttons.some((b) => b.id === 'doneManaging') ? press('doneManaging') : null
}

/** The command a key triggers: only Space while the presentation plays; Escape closes the sheet, then the trade composer, then the management mode; the composer keeps Enter to send its offer; any other key presses the enabled button bound to it. */
export function shortcutCommand(shortcut: string, view: InteractionView, presenting: boolean): ShortcutCommand | null {
  if (presenting) return shortcut === COMMAND_SHORTCUTS.continue ? { kind: 'continue' } : null
  if (shortcut === COMMAND_SHORTCUTS.close) return closeCommand(view)
  if (view.trade) return shortcut === COMMAND_SHORTCUTS.submit && view.trade.check.allowed ? press('proposeTrade') : null
  const button = view.buttons.find((b) => b.shortcut === shortcut)
  return button?.enabled ? press(button.id) : null
}
