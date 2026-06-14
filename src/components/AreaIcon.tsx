import { createElement } from 'react'
import { getAreaIcon } from '../lib/areaIcons'

export function AreaIcon({
  name,
  size = 18,
  color,
}: {
  name: string
  size?: number
  color?: string
}) {
  return createElement(getAreaIcon(name), { size, color, 'aria-hidden': true })
}
