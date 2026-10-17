import { parseHex } from './bytes'
import { buildLayer, canAutoFill, getUpperProtocol, PROTOCOLS, type FieldDefinition, type ProtocolId } from './protocols'

// パケットの作成（高レイヤ→低レイヤ）と解析（低レイヤ→高レイヤ）の手順の進み具合

// パケット作成の設定（どの層から作るか・入力欄の初期値）。作業ボタンの定義で使う
export interface ComposeSettings {
  upper: 'arp' | 'ipv4'
  // 入力欄の初期値（層ごとの項目 key → 値）と、IPv4 のデータ部の初期値（16進数）
  defaults?: Partial<Record<ProtocolId, Record<string, string>>>
  payload?: string
}

// 作成途中のパケット。作業ボタンごとに持ち、画面を切り替えても残す
export interface PacketDraft {
  payloadText: string
  inputs: Record<ProtocolId, Record<string, string>>
  // 付与した層（付与した順＝高レイヤから）
  attached: ProtocolId[]
}

// オプション packet_auto_fields で自動入力になっている項目か
export type IsAutoFilled = (protocol: ProtocolId, field: FieldDefinition) => boolean

export function createIsAutoFilled(autoFields: string[]): IsAutoFilled {
  const names = new Set(autoFields)
  return (protocol, field) =>
    canAutoFill(field) && (names.has(protocol) || names.has(`${protocol}.${field.key}`))
}

export function createDraft(settings: ComposeSettings): PacketDraft {
  const inputs = { ethernet: {}, arp: {}, ipv4: {} } as PacketDraft['inputs']
  for (const protocol of Object.values(PROTOCOLS)) {
    for (const field of protocol.fields) {
      inputs[protocol.id][field.key] = field.mode === 'input' ? (field.defaultValue ?? '') : ''
    }
    Object.assign(inputs[protocol.id], settings.defaults?.[protocol.id])
  }
  return { payloadText: settings.payload ?? '', inputs, attached: [] }
}

export interface BuiltPacket {
  // データ部の16進入力が正しくなければ null
  payload: number[] | null
  // 入力が正しい層まで組み立てたバイト列
  bytes: number[]
  // 組み立てられた層（フレーム上の並び＝ Ethernet が先頭）
  layers: { protocol: ProtocolId; start: number; end: number }[]
  isComplete: boolean
}

export function buildDraft(settings: ComposeSettings, draft: PacketDraft, isAutoFilled: IsAutoFilled): BuiltPacket {
  const payload = settings.upper === 'ipv4' ? parseHex(draft.payloadText) : []
  let bytes = payload ?? []
  const built: ProtocolId[] = []
  for (const protocol of payload ? draft.attached : []) {
    const upper = protocol === 'ethernet' ? settings.upper : undefined
    const next = buildLayer(protocol, draft.inputs[protocol], bytes, upper, (field) => isAutoFilled(protocol, field))
    if (!next) break
    bytes = next
    built.push(protocol)
  }
  let offset = 0
  const layers = built.reverse().map((protocol) => {
    const start = offset
    offset += PROTOCOLS[protocol].headerLength
    return { protocol, start, end: offset }
  })
  return { payload, bytes, layers, isComplete: layers.length === 2 }
}

// オプション analysis_auto_layers から、はじめから解析済みにしておく層を求める。
// 低レイヤから順につながっている分だけ（Ethernet を飛ばして IP だけ解析済みにはしない）
export function getInitialAnalyzedLayers(hex: string, autoLayers: ProtocolId[]): ProtocolId[] {
  const bytes = parseHex(hex) ?? []
  if (!autoLayers.includes('ethernet') || bytes.length < PROTOCOLS.ethernet.headerLength) return []
  const upper = getUpperProtocol(bytes, 0)
  return upper && autoLayers.includes(upper) ? ['ethernet', upper] : ['ethernet']
}
