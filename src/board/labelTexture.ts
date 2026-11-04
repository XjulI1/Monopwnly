import { CanvasTexture, SRGBColorSpace } from 'three'
import { FAMILY_NAMES, type Square } from '../engine'
import { FAMILY_COLORS, SCENE_COLORS } from './boardTheme'
import { BAND_SHARE } from './geometry/slots'

const PIXELS_PER_UNIT = 48
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif'

type Pen = { ctx: CanvasRenderingContext2D; w: number; h: number; u: number }

function formatPrice(amount: number): string {
  return `${amount.toLocaleString('fr-FR').replace(/\s/g, ' ')} Ᵽ`
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else line = candidate
  }
  if (line) lines.push(line)
  return lines.slice(0, maxLines)
}

function text(pen: Pen, value: string, y: number, size: number, color: string = SCENE_COLORS.text, weight = 700): void {
  const { ctx, w } = pen
  ctx.fillStyle = color
  ctx.font = `${weight} ${size * pen.u}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lines = wrap(ctx, value, w * 0.88, 2)
  const lineHeight = size * pen.u * 1.15
  const top = y * pen.u - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((line, i) => ctx.fillText(line, w / 2, top + i * lineHeight))
}

function strokeIcon(pen: Pen, color: string, draw: (ctx: CanvasRenderingContext2D) => void): void {
  const { ctx } = pen
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 0.22 * pen.u
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowColor = color
  ctx.shadowBlur = 0.4 * pen.u
  draw(ctx)
  ctx.restore()
}

function nodeIcon(pen: Pen, cx: number, cy: number): void {
  const u = pen.u
  strokeIcon(pen, SCENE_COLORS.tileEdge, (ctx) => {
    const points = [
      [cx, cy - 1.1],
      [cx - 1.2, cy + 0.8],
      [cx + 1.2, cy + 0.8],
    ] as const
    ctx.beginPath()
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * u, y * u) : ctx.lineTo(x * u, y * u)))
    ctx.closePath()
    ctx.stroke()
    for (const [x, y] of points) {
      ctx.beginPath()
      ctx.arc(x * u, y * u, 0.35 * u, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

function serviceIcon(pen: Pen, cx: number, cy: number): void {
  const u = pen.u
  strokeIcon(pen, SCENE_COLORS.tileEdge, (ctx) => {
    for (let i = 0; i < 3; i++) {
      ctx.strokeRect((cx - 1.3) * u, (cy - 1.2 + i * 0.85) * u, 2.6 * u, 0.65 * u)
      ctx.beginPath()
      ctx.arc((cx + 0.9) * u, (cy - 0.88 + i * 0.85) * u, 0.12 * u, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

function taxIcon(pen: Pen, cx: number, cy: number): void {
  const u = pen.u
  strokeIcon(pen, '#ff4b3e', (ctx) => {
    ctx.beginPath()
    ctx.moveTo(cx * u, (cy - 1.3) * u)
    ctx.lineTo((cx + 1.4) * u, (cy + 1.1) * u)
    ctx.lineTo((cx - 1.4) * u, (cy + 1.1) * u)
    ctx.closePath()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx * u, (cy - 0.45) * u)
    ctx.lineTo(cx * u, (cy + 0.3) * u)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx * u, (cy + 0.7) * u, 0.1 * u, 0, Math.PI * 2)
    ctx.fill()
  })
}

function cardIcon(pen: Pen, cx: number, cy: number, exploit: boolean): void {
  const u = pen.u
  const color = exploit ? SCENE_COLORS.exploit : SCENE_COLORS.patch
  strokeIcon(pen, color, (ctx) => {
    ctx.strokeRect((cx - 1.1) * u, (cy - 1.5) * u, 2.2 * u, 3 * u)
    ctx.font = `800 ${1.7 * u}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowBlur = 0
    ctx.fillText(exploit ? '?' : '+', cx * u, cy * u)
  })
}

function drawSystem(pen: Pen, square: Extract<Square, { kind: 'system' }>): void {
  const { ctx, w, h, u } = pen
  const band = h * BAND_SHARE
  ctx.fillStyle = FAMILY_COLORS[square.family]
  ctx.fillRect(0, 0, w, band)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.font = `600 ${0.8 * u}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(FAMILY_NAMES[square.family].toUpperCase(), w / 2, band / 2)
  text(pen, square.name, (band / u) + 2.6, 1.15)
  text(pen, formatPrice(square.price), h / u - 1.4, 1.05, SCENE_COLORS.mutedText, 600)
}

function drawSimple(pen: Pen, square: Square): void {
  const { h, u } = pen
  const across = h / u
  const cx = pen.w / u / 2
  text(pen, square.name, 1.9, 1.1)
  const iconY = across / 2 + 0.2
  if (square.kind === 'node') nodeIcon(pen, cx, iconY)
  if (square.kind === 'service') serviceIcon(pen, cx, iconY)
  if (square.kind === 'tax') taxIcon(pen, cx, iconY)
  if (square.kind === 'card') cardIcon(pen, cx, iconY, square.deck === 'exploit')
  if (square.kind === 'node' || square.kind === 'service') {
    text(pen, formatPrice(square.price), across - 1.4, 1.05, SCENE_COLORS.mutedText, 600)
  }
  if (square.kind === 'tax') text(pen, `Payez ${formatPrice(square.amount)}`, across - 1.4, 1, '#ff8a80', 700)
}

function drawCorner(pen: Pen, square: Extract<Square, { kind: 'corner' }>): void {
  const { ctx, w, h, u } = pen
  const size = h / u
  switch (square.corner) {
    case 'boot':
      text(pen, 'BOOT', size / 2 - 1.2, 2.6, SCENE_COLORS.tileEdge, 900)
      text(pen, 'Salaire 200 Ᵽ', size / 2 + 1.6, 1, SCENE_COLORS.text, 600)
      strokeIcon(pen, SCENE_COLORS.tileEdge, (c) => {
        c.beginPath()
        c.moveTo(w * 0.75, h * 0.82)
        c.lineTo(w * 0.25, h * 0.82)
        c.lineTo(w * 0.33, h * 0.76)
        c.moveTo(w * 0.25, h * 0.82)
        c.lineTo(w * 0.33, h * 0.88)
        c.stroke()
      })
      return
    case 'quarantine': {
      const half = size / 2
      const x0 = 0
      const x1 = (half + half * 0.2) * u
      const y0 = 0
      const y1 = (half + half * 0.1) * u
      ctx.fillStyle = 'rgba(255, 75, 62, 0.18)'
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
      strokeIcon(pen, '#ff4b3e', (c) => {
        c.strokeRect(x0 + 0.2 * u, y0 + 0.2 * u, x1 - x0 - 0.4 * u, y1 - y0 - 0.4 * u)
        for (let i = 1; i < 5; i++) {
          c.beginPath()
          c.moveTo(x0 + ((x1 - x0) * i) / 5, y0 + 0.2 * u)
          c.lineTo(x0 + ((x1 - x0) * i) / 5, y1 - 0.2 * u)
          c.stroke()
        }
      })
      ctx.fillStyle = SCENE_COLORS.text
      ctx.font = `900 ${1.05 * u}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('QUARANTAINE', (x0 + x1) / 2, (y0 + y1) / 2)
      ctx.fillStyle = SCENE_COLORS.mutedText
      ctx.font = `600 ${0.85 * u}px ${FONT}`
      ctx.fillText('Simple visite', w / 2, h - 0.6 * u)
      return
    }
    case 'dmz':
      text(pen, 'DMZ', size / 2 - 1, 3, '#4fe0a8', 900)
      text(pen, 'Zone de repos', size / 2 + 1.8, 1, SCENE_COLORS.text, 600)
      return
    case 'detected':
      strokeIcon(pen, '#ff4b3e', (c) => {
        c.beginPath()
        c.ellipse(w / 2, h * 0.36, 2.2 * u, 1.2 * u, 0, 0, Math.PI * 2)
        c.stroke()
        c.beginPath()
        c.arc(w / 2, h * 0.36, 0.55 * u, 0, Math.PI * 2)
        c.fill()
      })
      text(pen, 'DÉTECTÉ !', size / 2 + 1.4, 1.7, '#ff4b3e', 900)
      text(pen, 'Allez en quarantaine', size / 2 + 3.4, 0.9, SCENE_COLORS.text, 600)
  }
}

/** Texture of the top face of a square: family band, name, icon and price, oriented for the outer edge. */
export function squareLabelTexture(square: Square, along: number, across: number): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(along * PIXELS_PER_UNIT)
  canvas.height = Math.round(across * PIXELS_PER_UNIT)
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const pen: Pen = { ctx, w: canvas.width, h: canvas.height, u: PIXELS_PER_UNIT }
    ctx.fillStyle = SCENE_COLORS.tile
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (square.kind === 'system') drawSystem(pen, square)
    else if (square.kind === 'corner') drawCorner(pen, square)
    else drawSimple(pen, square)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/** Texture of the center of the board: logo and the places of the two decks. */
export function centerTexture(side: number): CanvasTexture {
  const canvas = document.createElement('canvas')
  const size = Math.round(side * 20)
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const u = size / side
    ctx.fillStyle = SCENE_COLORS.center
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = SCENE_COLORS.grid
    ctx.lineWidth = 0.08 * u
    for (let i = 1; i < 12; i++) {
      ctx.beginPath()
      ctx.moveTo((side * i * u) / 12, 0)
      ctx.lineTo((side * i * u) / 12, size)
      ctx.moveTo(0, (side * i * u) / 12)
      ctx.lineTo(size, (side * i * u) / 12)
      ctx.stroke()
    }
    ctx.save()
    ctx.translate(size / 2, size / 2)
    ctx.rotate(-Math.PI / 4)
    ctx.font = `900 ${side * 0.12 * u}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = SCENE_COLORS.tileEdge
    ctx.shadowBlur = 1.5 * u
    ctx.fillStyle = SCENE_COLORS.tileEdge
    ctx.fillText('MONOPWNLY', 0, 0)
    ctx.restore()
    const deck = (cx: number, cy: number, label: string, color: string) => {
      ctx.save()
      ctx.translate(cx * u, cy * u)
      ctx.rotate(-Math.PI / 4)
      ctx.strokeStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 0.8 * u
      ctx.lineWidth = 0.3 * u
      ctx.setLineDash([1.2 * u, 0.6 * u])
      ctx.strokeRect(-6 * u, -4 * u, 12 * u, 8 * u)
      ctx.setLineDash([])
      ctx.fillStyle = color
      ctx.font = `800 ${1.8 * u}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, 0, 0)
      ctx.restore()
    }
    deck(side * 0.3, side * 0.3, 'EXPLOIT', SCENE_COLORS.exploit)
    deck(side * 0.7, side * 0.7, 'PATCH', SCENE_COLORS.patch)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** Draws the counter of the DMZ pot: its title and the amount, on a dark rounded plate with a neon edge. */
export function drawPotCounter(canvas: HTMLCanvasElement, amount: number): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width: w, height: h } = canvas
  const edge = h * 0.06
  ctx.clearRect(0, 0, w, h)
  ctx.beginPath()
  ctx.roundRect(edge, edge, w - 2 * edge, h - 2 * edge, h * 0.22)
  ctx.fillStyle = 'rgba(4, 8, 16, 0.88)'
  ctx.fill()
  ctx.lineWidth = edge
  ctx.strokeStyle = SCENE_COLORS.tileEdge
  ctx.shadowColor = SCENE_COLORS.tileEdge
  ctx.shadowBlur = edge * 2
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = SCENE_COLORS.mutedText
  ctx.font = `700 ${h * 0.2}px ${FONT}`
  ctx.fillText('CAGNOTTE', w / 2, h * 0.3)
  ctx.fillStyle = SCENE_COLORS.text
  ctx.font = `900 ${h * 0.36}px ${FONT}`
  ctx.fillText(formatPrice(amount), w / 2, h * 0.64)
}

