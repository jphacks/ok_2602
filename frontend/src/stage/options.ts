import { canAutoFill, PROTOCOLS, type ProtocolId } from '../packet/protocols'
import { COMPOSE_SETTINGS, parseActionButtonId, type ActionButtonId } from './actionButtons'

// ステージ JSON の "options"。指定されなかった項目は DEFAULT_OPTIONS（できるだけ詳細に操作できる状態）になる。
// オプションを増やすときは StageOptions・DEFAULT_OPTIONS・resolveOptions の3か所に1行ずつ足す

export const TABLE_IDS = ['routing', 'arp', 'mac'] as const
export type TableId = (typeof TABLE_IDS)[number]

export interface StageOptions {
  // テーブルの編集（追加・変更・削除）を許可する
  routing_table_edit: boolean
  arp_table_edit: boolean
  mac_table_edit: boolean
  // 表示するテーブルのタブ（ステージに関係ない表を隠す）
  visible_tables: TableId[]
  // パケット作成時に自動で埋める項目（ユーザーが書かない項目）。"ipv4"（その層すべて）か "ipv4.checksum"（1項目）。
  // 固定値や計算で求まる項目だけ指定できる
  packet_auto_fields: string[]
  // パケット作成のボタンごとに、ユーザーが編集できる項目。"ipv4.src"（1項目）か "ipv4"（その層すべて）、データ部は "payload"。
  // 指定したボタンでは、それ以外の項目は初期値・自動計算の値で固定になる。指定しないボタンはすべて編集できる
  packet_editable_fields: Partial<Record<ActionButtonId, string[]>>
  // 受信パケットをはじめから解析済みにしておく層（低レイヤから順につながる分だけ有効）
  analysis_auto_layers: ProtocolId[]
}

export const DEFAULT_OPTIONS: StageOptions = {
  routing_table_edit: true,
  arp_table_edit: true,
  mac_table_edit: true,
  visible_tables: [...TABLE_IDS],
  packet_auto_fields: [],
  packet_editable_fields: {},
  analysis_auto_layers: [],
}

// テーブルごとの編集オプション
export const TABLE_EDIT_OPTIONS = {
  routing: 'routing_table_edit',
  arp: 'arp_table_edit',
  mac: 'mac_table_edit',
} as const satisfies Record<TableId, keyof StageOptions>

const AUTO_FIELD_NAMES = Object.values(PROTOCOLS).flatMap((protocol) => [
  protocol.id,
  ...protocol.fields.filter(canAutoFill).map((field) => `${protocol.id}.${field.key}`),
])
const EDITABLE_FIELD_NAMES = [
  ...Object.values(PROTOCOLS).flatMap((protocol) => [protocol.id, ...protocol.fields.map((field) => `${protocol.id}.${field.key}`)]),
  'payload',
]
const PROTOCOL_IDS = Object.keys(PROTOCOLS) as ProtocolId[]

// JSON の options を DEFAULT_OPTIONS にマージする。未知のキー・形式違いの値は警告して無視する
export function resolveOptions(raw: unknown): StageOptions {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const unknownKeys = Object.keys(source).filter((key) => !(key in DEFAULT_OPTIONS))
  if (unknownKeys.length > 0) console.warn('options: 未定義のオプションを無視しました', unknownKeys)

  const readBoolean = (key: keyof StageOptions) => {
    const value = source[key]
    if (value === undefined || typeof value === 'boolean') return (value ?? DEFAULT_OPTIONS[key]) as boolean
    console.warn(`options.${key} の形式が正しくありません`, value)
    return DEFAULT_OPTIONS[key] as boolean
  }
  // allowed に含まれる文字列の配列。含まれない要素は警告して無視する
  const readList = <T extends string>(key: keyof StageOptions, allowed: readonly T[]): T[] => {
    const value = source[key]
    if (value === undefined) return DEFAULT_OPTIONS[key] as T[]
    if (!Array.isArray(value)) {
      console.warn(`options.${key} の形式が正しくありません`, value)
      return DEFAULT_OPTIONS[key] as T[]
    }
    const isAllowed = (item: unknown): item is T => allowed.includes(item as T)
    const ignored = value.filter((item) => !isAllowed(item))
    if (ignored.length > 0) console.warn(`options.${key}: 使えない値を無視しました`, ignored)
    return value.filter(isAllowed)
  }
  // パケット作成のボタン id → allowed に含まれる文字列の配列。ボタン id は "ping request" のような書き方も受け付ける
  const readButtonLists = (key: keyof StageOptions, allowed: readonly string[]) => {
    const value = source[key]
    if (value === undefined) return DEFAULT_OPTIONS[key] as Partial<Record<ActionButtonId, string[]>>
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      console.warn(`options.${key} の形式が正しくありません`, value)
      return DEFAULT_OPTIONS[key] as Partial<Record<ActionButtonId, string[]>>
    }
    const lists: Partial<Record<ActionButtonId, string[]>> = {}
    for (const [name, items] of Object.entries(value)) {
      const id = parseActionButtonId(name)
      if (!id || !COMPOSE_SETTINGS[id] || !Array.isArray(items)) {
        console.warn(`options.${key}: パケット作成のボタンではないか、形式が正しくないため無視しました`, name)
        continue
      }
      const ignored = items.filter((item) => !allowed.includes(item))
      if (ignored.length > 0) console.warn(`options.${key}.${id}: 使えない値を無視しました`, ignored)
      lists[id] = items.filter((item) => allowed.includes(item))
    }
    return lists
  }

  return {
    routing_table_edit: readBoolean('routing_table_edit'),
    arp_table_edit: readBoolean('arp_table_edit'),
    mac_table_edit: readBoolean('mac_table_edit'),
    visible_tables: readList('visible_tables', TABLE_IDS),
    packet_auto_fields: readList('packet_auto_fields', AUTO_FIELD_NAMES),
    packet_editable_fields: readButtonLists('packet_editable_fields', EDITABLE_FIELD_NAMES),
    analysis_auto_layers: readList('analysis_auto_layers', PROTOCOL_IDS),
  }
}
