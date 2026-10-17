import { formatIpv4, formatMac, buildUintBytes, parseIpv4, parseMac, parseUint } from './bytes'

// プロトコル（層）ごとのヘッダの定義と、その定義を使った解析・組み立て。
// バックエンドの解析・作成機能ができたら差し替える想定のフロント側の簡易版

export type ProtocolId = 'ethernet' | 'arp' | 'ipv4'

export interface FieldDefinition {
  key: string
  name: string
  offset: number
  size: number
  format: 'mac' | 'ipv4' | 'hex' | 'dec'
  // input: 必ずユーザーが入力する（アドレスなど）
  // fixed: 固定値 / auto: 他の値から計算できる。この2つはオプション packet_auto_fields で
  // 自動入力にできる（指定がなければユーザーが入力する）
  mode: 'input' | 'fixed' | 'auto'
  defaultValue?: string
  // 値の意味（0x0800 → IPv4 など）
  labels?: Record<number, string>
}

export interface ProtocolDefinition {
  id: ProtocolId
  name: string
  // ボタンなどで使う名前（「Ethernetヘッダを解析する」など）
  headerName: string
  colorPalette: string
  headerLength: number
  fields: FieldDefinition[]
}

const ETHER_TYPES: Partial<Record<ProtocolId, number>> = { ipv4: 0x0800, arp: 0x0806 }

// 項目の定義を短く書くための関数
const field = (
  key: string,
  name: string,
  offset: number,
  size: number,
  format: FieldDefinition['format'],
  mode: FieldDefinition['mode'],
  extra: Pick<FieldDefinition, 'defaultValue' | 'labels'> = {},
): FieldDefinition => ({ key, name, offset, size, format, mode, ...extra })

export const PROTOCOLS: Record<ProtocolId, ProtocolDefinition> = {
  ethernet: {
    id: 'ethernet',
    name: 'Ethernet II',
    headerName: 'Ethernetヘッダ',
    colorPalette: 'green',
    headerLength: 14,
    fields: [
      field('dst', '宛先MACアドレス', 0, 6, 'mac', 'input'),
      field('src', '送信元MACアドレス', 6, 6, 'mac', 'input'),
      field('type', 'タイプ', 12, 2, 'hex', 'auto', { labels: { 0x0800: 'IPv4', 0x0806: 'ARP' } }),
    ],
  },
  arp: {
    id: 'arp',
    name: 'ARP',
    headerName: 'ARP',
    colorPalette: 'orange',
    headerLength: 28,
    fields: [
      field('htype', 'ハードウェアタイプ', 0, 2, 'dec', 'fixed', { defaultValue: '1', labels: { 1: 'Ethernet' } }),
      field('ptype', 'プロトコルタイプ', 2, 2, 'hex', 'fixed', { defaultValue: '0x0800', labels: { 0x0800: 'IPv4' } }),
      field('hlen', 'ハードウェアアドレス長', 4, 1, 'dec', 'fixed', { defaultValue: '6' }),
      field('plen', 'プロトコルアドレス長', 5, 1, 'dec', 'fixed', { defaultValue: '4' }),
      field('op', 'オペレーション', 6, 2, 'dec', 'input', { labels: { 1: 'Request', 2: 'Reply' } }),
      field('sha', '送信元MACアドレス', 8, 6, 'mac', 'input'),
      field('spa', '送信元IPアドレス', 14, 4, 'ipv4', 'input'),
      field('tha', '宛先MACアドレス', 18, 6, 'mac', 'input'),
      field('tpa', '宛先IPアドレス', 24, 4, 'ipv4', 'input'),
    ],
  },
  ipv4: {
    id: 'ipv4',
    name: 'IPv4',
    headerName: 'IPヘッダ',
    colorPalette: 'blue',
    headerLength: 20,
    fields: [
      field('ver_ihl', 'バージョン / ヘッダ長', 0, 1, 'hex', 'fixed', { defaultValue: '0x45' }),
      field('tos', 'サービスタイプ', 1, 1, 'hex', 'fixed', { defaultValue: '0x00' }),
      field('total_length', '全長', 2, 2, 'dec', 'auto'),
      field('id', '識別子', 4, 2, 'hex', 'fixed', { defaultValue: '0x0000' }),
      field('flags', 'フラグ / フラグメントオフセット', 6, 2, 'hex', 'fixed', { defaultValue: '0x4000' }),
      field('ttl', 'TTL', 8, 1, 'dec', 'input', { defaultValue: '64' }),
      field('protocol', 'プロトコル', 9, 1, 'dec', 'input', { defaultValue: '1', labels: { 1: 'ICMP', 6: 'TCP', 17: 'UDP' } }),
      field('checksum', 'ヘッダチェックサム', 10, 2, 'hex', 'auto'),
      field('src', '送信元IPアドレス', 12, 4, 'ipv4', 'input'),
      field('dst', '宛先IPアドレス', 16, 4, 'ipv4', 'input'),
    ],
  },
}

// 数値を項目の形式で表示する（hex は桁をそろえる）
export const formatNumber = (field: FieldDefinition, value: number) =>
  field.format === 'hex' ? `0x${value.toString(16).padStart(field.size * 2, '0')}` : String(value)

export function formatField(field: FieldDefinition, bytes: number[]): string {
  if (field.format === 'mac') return formatMac(bytes)
  if (field.format === 'ipv4') return formatIpv4(bytes)
  const value = parseUint(bytes, 0, field.size)
  const label = field.labels?.[value]
  return label ? `${formatNumber(field, value)} (${label})` : formatNumber(field, value)
}

// 入力文字列を項目のバイト列にする。形式が正しくなければ null
export function parseField(field: FieldDefinition, text: string): number[] | null {
  if (field.format === 'mac') return parseMac(text)
  if (field.format === 'ipv4') return parseIpv4(text)
  const trimmed = text.trim()
  const isHex = field.format === 'hex'
  if (!(isHex ? /^(0x)?[0-9a-fA-F]+$/i : /^\d+$/).test(trimmed)) return null
  const value = isHex ? parseInt(trimmed.replace(/^0x/i, ''), 16) : Number(trimmed)
  return value < 256 ** field.size ? buildUintBytes(value, field.size) : null
}

export interface ParsedLayer {
  protocol: ProtocolId
  start: number
  end: number
  name: string
  fields: { name: string; value: string }[]
}

// offset から protocol のヘッダとして読む。バイト数が足りなければ null
export function parseLayer(protocol: ProtocolId, bytes: number[], offset: number): ParsedLayer | null {
  const definition = PROTOCOLS[protocol]
  const end = offset + definition.headerLength
  if (end > bytes.length) return null
  const fields = definition.fields.map((field) => {
    const start = offset + field.offset
    return { name: field.name, value: formatField(field, bytes.slice(start, start + field.size)) }
  })
  return { protocol, start: offset, end, name: definition.name, fields }
}

// Ethernet ヘッダのタイプから、その上に載っている層を求める
export function getUpperProtocol(bytes: number[], ethernetStart: number): ProtocolId | null {
  const type = parseUint(bytes, ethernetStart + 12, 2)
  return (Object.keys(ETHER_TYPES) as ProtocolId[]).find((id) => ETHER_TYPES[id] === type) ?? null
}

function calculateIpv4Checksum(header: number[]): number {
  let sum = 0
  for (let index = 0; index < header.length; index += 2) sum += header[index] * 256 + header[index + 1]
  while (sum > 0xffff) sum = (sum & 0xffff) + (sum >>> 16)
  return ~sum & 0xffff
}

// 自動計算の項目の値（Ethernet のタイプは上位層、IPv4 の全長は payload から）
export function calculateAutoValue(
  protocol: ProtocolId,
  key: string,
  payloadLength: number,
  upper?: ProtocolId,
): string | null {
  if (protocol === 'ethernet' && key === 'type' && upper) {
    const type = ETHER_TYPES[upper]
    return type === undefined ? null : `0x${type.toString(16).padStart(4, '0')}`
  }
  if (protocol === 'ipv4' && key === 'total_length') return String(PROTOCOLS.ipv4.headerLength + payloadLength)
  return null
}

// 自動入力にできる項目かどうか（必ず入力する項目以外）
export const canAutoFill = (field: FieldDefinition) => field.mode !== 'input'

// payload の前にヘッダを付ける。入力が足りない・形式が違う場合は null
// isAutoFilled が true の項目は入力値を使わず、固定値・計算値で埋める（省略時はすべて自動）
export function buildLayer(
  protocol: ProtocolId,
  inputs: Record<string, string>,
  payload: number[],
  upper?: ProtocolId,
  isAutoFilled: (field: FieldDefinition) => boolean = () => true,
): number[] | null {
  const definition = PROTOCOLS[protocol]
  const header = new Array<number>(definition.headerLength).fill(0)
  let hasAutoChecksum = false
  for (const field of definition.fields) {
    const isAuto = canAutoFill(field) && isAutoFilled(field)
    if (isAuto && protocol === 'ipv4' && field.key === 'checksum') {
      hasAutoChecksum = true
      continue
    }
    const text = !isAuto
      ? (inputs[field.key] ?? '')
      : field.mode === 'fixed'
        ? (field.defaultValue ?? '')
        : calculateAutoValue(protocol, field.key, payload.length, upper)
    const bytes = text === null ? null : parseField(field, text)
    if (!bytes) return null
    header.splice(field.offset, field.size, ...bytes)
  }
  if (hasAutoChecksum) header.splice(10, 2, ...buildUintBytes(calculateIpv4Checksum(header), 2))
  return [...header, ...payload]
}
