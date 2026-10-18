import type { PacketJson } from '../stage/types'
import { formatHex, formatIpv4, formatMac, buildUintBytes, parseIpv4, parseMac, parseUint } from './bytes'

// プロトコル（層）ごとのヘッダの定義と、その定義を使った解析・組み立て。
// バックエンドの解析・作成機能ができたら差し替える想定のフロント側の簡易版

export type ProtocolId = 'ethernet' | 'arp' | 'ipv4' | 'udp' | 'rip' | 'rip_entry'

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
  // true のとき、入力欄の代わりに labels の値から選ぶ（決まった値しか取らない項目）
  isChoice?: boolean
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

// 項目の定義を短く書くための関数
const field = (
  key: string,
  name: string,
  offset: number,
  size: number,
  format: FieldDefinition['format'],
  mode: FieldDefinition['mode'],
  extra: Pick<FieldDefinition, 'defaultValue' | 'labels' | 'isChoice'> = {},
): FieldDefinition => ({ key, name, offset, size, format, mode, ...extra })

export const PROTOCOLS: Record<ProtocolId, ProtocolDefinition> = {
  ethernet: {
    id: 'ethernet',
    name: 'Ethernet II',
    headerName: 'Ethernetヘッダ',
    colorPalette: 'green',
    headerLength: 14,
    // 表示は IPv4 と同じ「送信元 → 宛先」の順（フレーム上の位置は offset で決まる）
    fields: [
      field('src', '送信元MACアドレス', 6, 6, 'mac', 'input'),
      field('dst', '宛先MACアドレス', 0, 6, 'mac', 'input'),
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
      field('op', 'オペレーション', 6, 2, 'dec', 'input', { labels: { 1: 'Request', 2: 'Reply' }, isChoice: true }),
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
  udp: {
    id: 'udp',
    name: 'UDP',
    headerName: 'UDPヘッダ',
    colorPalette: 'purple',
    headerLength: 8,
    fields: [
      field('src_port', '送信元ポート番号', 0, 2, 'dec', 'input', { labels: { 520: 'RIP' } }),
      field('dst_port', '宛先ポート番号', 2, 2, 'dec', 'input', { labels: { 520: 'RIP' } }),
      field('length', '長さ', 4, 2, 'dec', 'auto'),
      // IPv4 では 0（チェックサムなし）が許される
      field('checksum', 'チェックサム', 6, 2, 'hex', 'fixed', { defaultValue: '0x0000' }),
    ],
  },
  rip: {
    id: 'rip',
    name: 'RIPv2',
    headerName: 'RIPヘッダ',
    colorPalette: 'teal',
    headerLength: 4,
    fields: [
      field('command', 'コマンド', 0, 1, 'dec', 'input', { labels: { 1: 'Request', 2: 'Response' }, isChoice: true }),
      field('version', 'バージョン', 1, 1, 'dec', 'input', { labels: { 1: 'RIPv1', 2: 'RIPv2' }, isChoice: true }),
      field('zero', '未使用', 2, 2, 'hex', 'fixed', { defaultValue: '0x0000' }),
    ],
  },
  // RIP ヘッダの後ろに 0〜25 個並ぶ経路の情報
  rip_entry: {
    id: 'rip_entry',
    name: 'RIPエントリ',
    headerName: 'RIPエントリ',
    colorPalette: 'cyan',
    headerLength: 20,
    fields: [
      field('afi', 'アドレスファミリ', 0, 2, 'dec', 'input', { defaultValue: '2', labels: { 0: '全経路の要求', 2: 'IPv4' } }),
      field('route_tag', 'ルートタグ', 2, 2, 'dec', 'fixed', { defaultValue: '0' }),
      field('address', 'ネットワークアドレス', 4, 4, 'ipv4', 'input'),
      field('mask', 'サブネットマスク', 8, 4, 'ipv4', 'input'),
      // 0.0.0.0 は「このパケットの送信元をネクストホップにする」
      field('next_hop', 'ネクストホップ', 12, 4, 'ipv4', 'input', { defaultValue: '0.0.0.0' }),
      field('metric', 'メトリック', 16, 4, 'dec', 'input', { labels: { 16: '到達不能' } }),
    ],
  },
}

// 下の層のどの項目の値で、上に載っている層が決まるか（Ethernet のタイプ / IPv4 のプロトコル番号 / UDP の宛先ポート番号）
export const UPPER_PROTOCOL_FIELDS: Partial<Record<ProtocolId, { key: string; values: Partial<Record<number, ProtocolId>> }>> = {
  ethernet: { key: 'type', values: { 0x0800: 'ipv4', 0x0806: 'arp' } },
  ipv4: { key: 'protocol', values: { 17: 'udp' } },
  udp: { key: 'dst_port', values: { 520: 'rip' } },
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

// start から始まる protocol の層の上に載っている層を求める。この画面で解析できない種類なら null。
// RIP ヘッダ・RIP エントリの後ろは、20 バイトずつ RIP エントリが続く
export function getUpperProtocol(protocol: ProtocolId, bytes: number[], start: number): ProtocolId | null {
  const end = start + PROTOCOLS[protocol].headerLength
  if (protocol === 'rip' || protocol === 'rip_entry') return end + PROTOCOLS.rip_entry.headerLength <= bytes.length ? 'rip_entry' : null
  const upper = UPPER_PROTOCOL_FIELDS[protocol]
  const field = PROTOCOLS[protocol].fields.find((candidate) => candidate.key === upper?.key)
  return (field && upper?.values[parseUint(bytes, start + field.offset, field.size)]) ?? null
}

// lower の上に upper を載せるときの、lower の項目の値（Ethernet のタイプなど）
const getUpperProtocolValue = (lower: ProtocolId, upper: ProtocolId) =>
  Object.entries(UPPER_PROTOCOL_FIELDS[lower]?.values ?? {}).find(([, protocol]) => protocol === upper)?.[0]

function calculateIpv4Checksum(header: number[]): number {
  let sum = 0
  for (let index = 0; index < header.length; index += 2) sum += header[index] * 256 + header[index + 1]
  while (sum > 0xffff) sum = (sum & 0xffff) + (sum >>> 16)
  return ~sum & 0xffff
}

// 自動計算の項目の値（Ethernet のタイプは上位層、IPv4 の全長・UDP の長さは payload から）
export function calculateAutoValue(
  protocol: ProtocolId,
  key: string,
  payloadLength: number,
  upper?: ProtocolId,
): string | null {
  if (protocol === 'ethernet' && key === 'type' && upper) {
    const type = getUpperProtocolValue('ethernet', upper)
    return type === undefined ? null : `0x${Number(type).toString(16).padStart(4, '0')}`
  }
  if ((protocol === 'ipv4' && key === 'total_length') || (protocol === 'udp' && key === 'length')) {
    return String(PROTOCOLS[protocol].headerLength + payloadLength)
  }
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

// 層の項目を、バックエンドとやり取りする JSON の形で読む（キーは項目の key。アドレスは文字列、それ以外は数値）
function parseLayerJson(protocol: ProtocolId, bytes: number[], offset: number) {
  return Object.fromEntries(
    PROTOCOLS[protocol].fields.map((field) => {
      const value = bytes.slice(offset + field.offset, offset + field.offset + field.size)
      return [field.key, field.format === 'mac' || field.format === 'ipv4' ? formatField(field, value) : parseUint(value, 0, field.size)]
    }),
  )
}

// ICMP ヘッダの項目（key とバイト数）。この画面では ICMP は入力しないので、送信する JSON を作るときだけ読む
const ICMP_FIELDS = [['type', 1], ['code', 1], ['checksum', 2], ['id', 2], ['seq', 2]] as const

// 完成したフレームから、WebSocket で送る JSON を作る。Ethernet から上の層へ順にたどる（RIP エントリは rip.entries にまとめる）
export function buildPacketJson(bytes: number[]): PacketJson {
  const json: Record<string, Record<string, unknown>> & { hex?: string; payload?: string } = {}
  let protocol: ProtocolId | null = 'ethernet'
  let offset = 0
  while (protocol && offset + PROTOCOLS[protocol].headerLength <= bytes.length) {
    const values = parseLayerJson(protocol, bytes, offset)
    if (protocol === 'rip_entry') (json.rip.entries as unknown[]).push(values)
    else json[protocol] = protocol === 'rip' ? { ...values, entries: [] } : values
    const upper = getUpperProtocol(protocol, bytes, offset)
    offset += PROTOCOLS[protocol].headerLength
    protocol = upper
  }
  if (json.ipv4?.protocol === 1 && bytes.length >= offset + 8) {
    json.icmp = Object.fromEntries(
      ICMP_FIELDS.map(([key, size]) => {
        offset += size
        return [key, parseUint(bytes, offset - size, size)]
      }),
    )
  }
  return { ...json, hex: formatHex(bytes), payload: formatHex(bytes.slice(offset)) } as unknown as PacketJson
}
