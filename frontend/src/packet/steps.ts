import { parseHex } from './bytes'
import {
  buildLayer,
  canAutoFill,
  getUpperProtocol,
  parseLayer,
  PROTOCOLS,
  type FieldDefinition,
  type ParsedLayer,
  type ProtocolId,
} from './protocols'

// パケットの作成（高レイヤ→低レイヤ）と解析（低レイヤ→高レイヤ）の手順の進み具合

// パケット作成の設定（付与するヘッダ・入力欄の初期値・データ部）。作業ボタンの定義で使う
export interface ComposeSettings {
  // データ部の上に付与するヘッダ（高レイヤから順。Ethernet ヘッダはこの後に必ず付与する）
  layers: ('arp' | 'ipv4' | 'udp' | 'rip')[]
  // 入力欄の初期値（層ごとの項目 key → 値）
  defaults?: Partial<Record<ProtocolId, Record<string, string>>>
  // データ部。payload は16進数、entries は RIP エントリの一覧（指定するとデータ部が RIP エントリの入力欄になる）。
  // どちらもなければデータ部なし（ARP）
  payload?: string
  entries?: Record<string, string>[]
}

// 作成途中のパケット。作業ボタンごとに持ち、画面を切り替えても残す
export interface PacketDraft {
  payloadText: string
  // RIP エントリごとの入力値（項目 key → 値）
  entries: Record<string, string>[]
  inputs: Record<ProtocolId, Record<string, string>>
  // 付与した層（付与した順＝高レイヤから）
  attached: ProtocolId[]
}

// オプション packet_auto_fields で自動入力になっている項目か
export type IsAutoFilled = (protocol: ProtocolId, field: FieldDefinition) => boolean

// 編集できない項目（オプション packet_editable_fields）のうち、固定値・計算値で埋められるものも自動入力にする
export function createIsAutoFilled(autoFields: string[], isEditable: IsEditable = () => true): IsAutoFilled {
  const names = new Set(autoFields)
  return (protocol, field) =>
    canAutoFill(field) &&
    (names.has(protocol) || names.has(`${protocol}.${field.key}`) || !isEditable(`${protocol}.${field.key}`))
}

// オプション packet_editable_fields（ボタンごと）でユーザーが編集できる項目か。
// name は "ipv4.src" のような「層.項目」か、データ部の "payload"。指定がないボタンはすべて編集できる
export type IsEditable = (name: string) => boolean

export function createIsEditable(editableFields?: string[]): IsEditable {
  if (!editableFields) return () => true
  const names = new Set(editableFields)
  return (name) => names.has(name) || names.has(name.split('.')[0])
}

// 層の入力欄の初期値（入力する項目は定義の初期値、それ以外は空）
const createInputs = (protocol: ProtocolId) =>
  Object.fromEntries(PROTOCOLS[protocol].fields.map((field) => [field.key, field.mode === 'input' ? (field.defaultValue ?? '') : '']))

// RIP エントリを1つ追加するときの入力値
export const createEntry = (values: Record<string, string> = {}) => ({ ...createInputs('rip_entry'), ...values })

export function createDraft(settings: ComposeSettings): PacketDraft {
  const inputs = Object.fromEntries(
    Object.values(PROTOCOLS).map((protocol) => [protocol.id, { ...createInputs(protocol.id), ...settings.defaults?.[protocol.id] }]),
  ) as PacketDraft['inputs']
  return { payloadText: settings.payload ?? '', entries: (settings.entries ?? []).map(createEntry), inputs, attached: [] }
}

// 付与するヘッダの順番（高レイヤから、最後は Ethernet）
export const getComposeLayers = (settings: ComposeSettings): ProtocolId[] => [...settings.layers, 'ethernet']

export interface BuiltPacket {
  // データ部の16進入力が正しくなければ null
  payload: number[] | null
  // 入力が正しい層まで組み立てたバイト列
  bytes: number[]
  // 組み立てられた層（フレーム上の並び＝ Ethernet が先頭）
  layers: { protocol: ProtocolId; start: number; end: number }[]
  isComplete: boolean
}

// データ部のバイト列。RIP エントリは1つずつ組み立てて並べる
function buildPayload(settings: ComposeSettings, draft: PacketDraft, isAutoFilled: IsAutoFilled): number[] | null {
  if (settings.entries) {
    const entries = draft.entries.map((entry) => buildLayer('rip_entry', entry, [], undefined, (field) => isAutoFilled('rip_entry', field)))
    return entries.every((entry) => entry !== null) ? entries.flat() : null
  }
  return settings.payload === undefined ? [] : parseHex(draft.payloadText)
}

export function buildDraft(settings: ComposeSettings, draft: PacketDraft, isAutoFilled: IsAutoFilled): BuiltPacket {
  const payload = buildPayload(settings, draft, isAutoFilled)
  let bytes = payload ?? []
  const built: ProtocolId[] = []
  for (const protocol of payload ? draft.attached : []) {
    const next = buildLayer(protocol, draft.inputs[protocol], bytes, built.at(-1), (field) => isAutoFilled(protocol, field))
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
  // RIP エントリも色分けして表示する
  if (settings.entries && payload) {
    for (let start = offset; start < offset + payload.length; start += PROTOCOLS.rip_entry.headerLength) {
      layers.push({ protocol: 'rip_entry', start, end: start + PROTOCOLS.rip_entry.headerLength })
    }
  }
  return { payload, bytes, layers, isComplete: built.length === getComposeLayers(settings).length }
}

export interface AnalyzedPacket {
  bytes: number[]
  // 解析した層（RIP ヘッダを解析すると、後ろの RIP エントリもすべて含める）
  layers: ParsedLayer[]
  // 次に解析する層。最後まで解析した（またはこの画面で解析できない種類）なら null
  next: ProtocolId | null
}

// 受信パケットを、解析済みの層（低レイヤから順）まで解析する
export function analyzePacket(hex: string, analyzedLayers: ProtocolId[]): AnalyzedPacket {
  const bytes = parseHex(hex) ?? []
  const layers: ParsedLayer[] = []
  let next: ProtocolId | null = 'ethernet'
  while (next && (analyzedLayers.includes(next) || (next === 'rip_entry' && analyzedLayers.includes('rip')))) {
    const layer = parseLayer(next, bytes, layers.at(-1)?.end ?? 0)
    if (!layer) break
    layers.push(layer)
    next = getUpperProtocol(next, bytes, layer.start)
  }
  return { bytes, layers, next: next === 'rip_entry' ? null : next }
}

// オプション analysis_auto_layers から、はじめから解析済みにしておく層を求める。
// 低レイヤから順につながっている分だけ（Ethernet を飛ばして IP だけ解析済みにはしない）
export function getInitialAnalyzedLayers(hex: string, autoLayers: ProtocolId[]): ProtocolId[] {
  const layers: ProtocolId[] = []
  for (let next = analyzePacket(hex, layers).next; next && autoLayers.includes(next); next = analyzePacket(hex, layers).next) {
    layers.push(next)
  }
  return layers
}

// 受信パケットの解析が最後まで（この画面で解析できる層まで）終わったか
export const isAnalysisComplete = (hex: string, analyzedLayers: ProtocolId[]) =>
  analyzedLayers.length > 0 && analyzePacket(hex, analyzedLayers).next === null
