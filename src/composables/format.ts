export function relativeTime(iso: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `今天 ${new Date(iso).toTimeString().slice(0, 5)}`
  const d = Math.floor(h / 24)
  if (d === 1) return '昨天'
  if (d < 30) return `${d} 天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}

export const fmtNum = (n: number) => n.toLocaleString('zh-CN')

export const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString('zh-CN') : '—')
