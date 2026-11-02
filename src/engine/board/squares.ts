import type { DeckKind, FamilyId, PurchasableSquare, Square, SquareId, SystemSquare } from '../types'

type Rents = SystemSquare['rents']

function system(
  index: number,
  id: SquareId,
  name: string,
  family: FamilyId,
  price: number,
  rents: Rents,
  backdoorCost: number,
): Square {
  return { index, id, name, kind: 'system', family, price, rents, backdoorCost, mortgageValue: price / 2 }
}

function node(index: number, id: SquareId, name: string): Square {
  return { index, id, name, kind: 'node', price: 200, mortgageValue: 100 }
}

function service(index: number, id: SquareId, name: string): Square {
  return { index, id, name, kind: 'service', price: 150, mortgageValue: 75 }
}

function card(index: number, deck: DeckKind): Square {
  return { index, id: `${deck}-${index}`, name: deck === 'exploit' ? 'Exploit' : 'Patch', kind: 'card', deck }
}

/** The 40 squares of the Monopwnly board, in the direction of travel (see docs/plateau.md). */
export const BOARD: readonly Square[] = [
  { index: 0, id: 'boot', name: 'Boot', kind: 'corner', corner: 'boot' },
  system(1, 'minitel', 'Minitel', 'retro', 60, [4, 20, 55, 150, 200, 250], 50),
  card(2, 'exploit'),
  system(3, 'modem-56k', 'Modem 56k', 'retro', 60, [4, 20, 55, 150, 200, 250], 50),
  node(4, 'vpn-node', 'Nœud VPN'),
  { index: 5, id: 'ransomware', name: 'Rançongiciel', kind: 'tax', amount: 200 },
  system(6, 'wifi-bulb', 'Ampoule Wi‑Fi', 'iot', 100, [6, 30, 85, 230, 300, 370], 50),
  system(7, 'smart-fridge', 'Frigo connecté', 'iot', 100, [6, 30, 85, 230, 300, 370], 50),
  card(8, 'patch'),
  system(9, 'ip-camera', 'Caméra IP', 'iot', 120, [8, 40, 110, 305, 400, 495], 50),
  { index: 10, id: 'quarantine', name: 'Quarantaine', kind: 'corner', corner: 'quarantine' },
  system(11, 'network-printer', 'Imprimante réseau', 'office', 140, [10, 50, 140, 380, 500, 620], 100),
  system(12, 'work-mail', 'Messagerie pro', 'office', 140, [10, 50, 140, 380, 500, 620], 100),
  service(13, 'datacenter', 'Datacenter'),
  system(14, 'intranet', 'Intranet', 'office', 160, [12, 60, 170, 455, 600, 745], 100),
  card(15, 'exploit'),
  system(16, 'forum', 'Forum', 'web', 180, [14, 70, 195, 530, 700, 870], 100),
  system(17, 'blog', 'Blog', 'web', 180, [14, 70, 195, 530, 700, 870], 100),
  node(18, 'tor-node', 'Nœud Tor'),
  system(19, 'online-shop', 'Boutique en ligne', 'web', 200, [16, 80, 225, 610, 800, 990], 100),
  { index: 20, id: 'dmz', name: 'DMZ', kind: 'corner', corner: 'dmz' },
  system(21, 'news-feed', "Fil d'actualité", 'social', 220, [18, 90, 250, 685, 900, 1115], 150),
  card(22, 'patch'),
  system(23, 'encrypted-messenger', 'Messagerie chiffrée', 'social', 220, [18, 90, 250, 685, 900, 1115], 150),
  system(24, 'video-platform', 'Plateforme vidéo', 'social', 240, [20, 100, 280, 760, 1000, 1240], 150),
  node(25, 'proxy-node', 'Nœud Proxy'),
  system(26, 'cash-machine', 'Distributeur de billets', 'finance', 260, [22, 110, 310, 835, 1100, 1365], 150),
  card(27, 'exploit'),
  system(28, 'neobank', 'Néobanque', 'finance', 260, [22, 110, 310, 835, 1100, 1365], 150),
  system(29, 'online-exchange', 'Bourse en ligne', 'finance', 280, [24, 120, 335, 910, 1200, 1490], 150),
  { index: 30, id: 'detected', name: 'Détecté !', kind: 'corner', corner: 'detected' },
  system(31, 'power-grid', 'Réseau électrique', 'infrastructure', 300, [26, 130, 365, 990, 1300, 1610], 200),
  system(32, 'satellite', 'Satellite', 'infrastructure', 300, [26, 130, 365, 990, 1300, 1610], 200),
  service(33, 'cloud', 'Cloud'),
  system(34, 'submarine-cable', 'Câble sous-marin', 'infrastructure', 320, [28, 140, 390, 1065, 1400, 1735], 200),
  card(35, 'patch'),
  node(36, 'mesh-node', 'Nœud Mesh'),
  system(37, 'state-mainframe', "Mainframe d'État", 'core', 350, [35, 175, 490, 1330, 1750, 2170], 200),
  { index: 38, id: 'gdpr-fine', name: 'Amende RGPD', kind: 'tax', amount: 100 },
  system(39, 'ai-kernel', "Noyau de l'IA", 'core', 400, [50, 250, 700, 1900, 2500, 3100], 200),
]

/** Display names of the families. */
export const FAMILY_NAMES: Record<FamilyId, string> = {
  retro: 'Rétro',
  iot: 'Objets connectés',
  office: 'Bureautique',
  web: 'Web',
  social: 'Social',
  finance: 'Finance',
  infrastructure: 'Infrastructure',
  core: 'Cœur',
}

/** Square identifiers of each family, in board order. */
export const FAMILY_SQUARES: Record<FamilyId, SquareId[]> = Object.fromEntries(
  (Object.keys(FAMILY_NAMES) as FamilyId[]).map((family) => [
    family,
    BOARD.filter((s) => s.kind === 'system' && s.family === family).map((s) => s.id),
  ]),
) as Record<FamilyId, SquareId[]>

export const BOARD_SIZE = 40
export const STARTING_CASH = 1500
export const SALARY = 200
export const QUARANTINE_INDEX = 10
export const QUARANTINE_FINE = 50
export const MAX_QUARANTINE_ATTEMPTS = 3
export const BANK_BACKDOORS = 32
export const BANK_ROOTKITS = 12
export const NODE_RENTS = [25, 50, 100, 200] as const
export const SERVICE_MULTIPLIERS = [4, 10] as const
export const MIN_BID = 10
export const UNMORTGAGE_INTEREST = 0.1

const byId = new Map(BOARD.map((s) => [s.id, s]))

/** Returns the square at a board index. */
export function squareAt(index: number): Square {
  const square = BOARD[index]
  if (!square) throw new Error(`No square at index ${index}`)
  return square
}

/** Returns the square with the given identifier; throws for an unknown identifier. */
export function squareById(id: SquareId): Square {
  const square = byId.get(id)
  if (!square) throw new Error(`Unknown square ${id}`)
  return square
}

/** Returns the purchasable square with the given identifier, or null. */
export function purchasableById(id: SquareId): PurchasableSquare | null {
  const square = byId.get(id)
  if (!square) return null
  return square.kind === 'system' || square.kind === 'node' || square.kind === 'service' ? square : null
}
