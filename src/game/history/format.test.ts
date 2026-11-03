import { describe, expect, it } from 'vitest'
import { formatPwn } from '../format'
import { countOf, deckName, listOf, ofName, squareName, squareNameAt } from './format'

const THIN_NBSP = ' '
const NBSP = ' '

describe('amounts', () => {
  it('are written with a no-break space before the symbol and between thousands', () => {
    expect(formatPwn(60)).toBe(`60${NBSP}Ᵽ`)
    expect(formatPwn(1500)).toBe(`1${THIN_NBSP}500${NBSP}Ᵽ`)
  })
})

describe('squareName', () => {
  it('names a square from its identifier or from its index on the board', () => {
    expect(squareName('neobank')).toBe('Néobanque')
    expect(squareName('proxy-node')).toBe('Nœud Proxy')
    expect(squareNameAt(7)).toBe('Frigo connecté')
    expect(squareNameAt(30)).toBe('Détecté !')
  })
})

describe('deckName', () => {
  it('names the two decks', () => {
    expect(deckName('exploit')).toBe('Exploit')
    expect(deckName('patch')).toBe('Patch')
  })
})

describe('countOf', () => {
  it('keeps the noun singular for one and puts it in the plural from two', () => {
    expect(countOf(1, 'backdoor')).toBe(`1${NBSP}backdoor`)
    expect(countOf(3, 'backdoor')).toBe(`3${NBSP}backdoors`)
  })

  it('takes an irregular plural', () => {
    expect(countOf(2, 'Clé de déchiffrement', 'Clés de déchiffrement')).toBe(`2${NBSP}Clés de déchiffrement`)
  })
})

describe('listOf', () => {
  it('joins the last two items with « et » and the others with commas', () => {
    expect(listOf(['Forum'])).toBe('Forum')
    expect(listOf(['Forum', 'Blog'])).toBe('Forum et Blog')
    expect(listOf(['Forum', 'Blog', 'Nœud Tor'])).toBe('Forum, Blog et Nœud Tor')
  })
})

describe('ofName', () => {
  it('elides « de » before a vowel', () => {
    expect(ofName('Alice')).toBe('d’Alice')
    expect(ofName('Intranet')).toBe('d’Intranet')
    expect(ofName('Écran')).toBe('d’Écran')
  })

  it('keeps « de » before a consonant', () => {
    expect(ofName('Bob')).toBe('de Bob')
    expect(ofName('la banque')).toBe('de la banque')
  })
})
