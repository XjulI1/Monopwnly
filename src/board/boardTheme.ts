import type { FamilyId } from '../engine'

/** Neon color of each family band. */
export const FAMILY_COLORS: Record<FamilyId, string> = {
  retro: '#c8874f',
  iot: '#4fe0a8',
  office: '#3f9dff',
  web: '#a66bff',
  social: '#ff5fae',
  finance: '#ffd23f',
  infrastructure: '#ff4b3e',
  core: '#00e5ff',
}

/** Colors offered to players, distinct from the family colors. */
export const PLAYER_COLORS = ['#ff8a1c', '#39ff6a', '#2f5bff', '#ff38f0', '#f2f4f8', '#9a9aff'] as const

/** Colors of the board scene. */
export const SCENE_COLORS = {
  background: '#04060c',
  grid: '#0d3346',
  table: '#070b14',
  center: '#0b1220',
  tile: '#1a2130',
  tileEdge: '#19e3ff',
  text: '#e8f1ff',
  mutedText: '#8fa3bf',
  exploit: '#ff4b6e',
  patch: '#3fe0c5',
} as const
