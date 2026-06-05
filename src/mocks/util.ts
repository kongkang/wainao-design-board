import type { Paginated } from '@/api/http'

let counter = 1000
export function genId(prefix: string): string {
  counter += 1
  return `${prefix}_${counter.toString(36)}`
}

export const nowISO = () => new Date().toISOString()
export const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString()
export const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString()
export const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

export function paginate<T>(items: T[], page = 1, pageSize = 20): Paginated<T> {
  const total = items.length
  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), total, page, pageSize }
}

/** 生成渐变占位图 data URI —— 避免依赖外网图片，明暗主题下都可读 */
export function gradient(c1: string, c2: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='480' height='360'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/>` +
    `</linearGradient></defs><rect width='480' height='360' fill='url(%23g)'/>` +
    `<circle cx='150' cy='150' r='70' fill='rgba(255,255,255,0.18)'/>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const GRADIENTS: [string, string][] = [
  ['#DDE4FF', '#F4ECFF'],
  ['#E7F6EE', '#FFF6E6'],
  ['#FCEBE2', '#FFF1DA'],
  ['#E9ECFF', '#EAF7F0'],
  ['#FFE9E9', '#FFF3E0'],
  ['#E3F2FF', '#EAFBF5'],
  ['#F1E9FF', '#FFEAF2'],
  ['#E8F0E2', '#FBF6E4'],
]
export function pickGradient(i: number): string {
  const [a, b] = GRADIENTS[i % GRADIENTS.length]
  return gradient(a, b)
}
