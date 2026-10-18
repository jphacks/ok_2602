import type { ComposeSettings } from '../packet/steps'

// ステージ JSON の "action_buttons" で指定できる、「作業」に並ぶボタン。
// JSON では配列の順に表示され、"arp request" のような空白・ハイフン区切りも受け付ける。
// ボタンを増やすときは ACTION_BUTTON_LABELS に追加し、パケット作成のボタンなら COMPOSE_SETTINGS にも追加する
// （それ以外のボタンは WorkPanel / StageWorkspace に押したときの表示を書く）。

export const ACTION_BUTTON_LABELS = {
  arp_request: 'ARPリクエスト',
  arp_response: 'ARPレスポンス',
  ping_request: 'pingリクエスト',
  ping_response: 'pingレスポンス',
  packet_forward: 'パケット転送',
  rip_request: 'RIPリクエスト',
  rip_response: 'RIPレスポンス',
  // 作成中・作成済みのパケットの全体像を見る
  packet_all_view: 'パケットの全体像',
  todo_list: 'やることリスト',
}

export type ActionButtonId = keyof typeof ACTION_BUTTON_LABELS

// ICMP エコー要求（type 8, id 1, seq 1）
export const ICMP_ECHO = '08 00 f7 fd 00 01 00 01'
// ICMP エコー応答（type 0, id 1, seq 1）
export const ICMP_ECHO_REPLY = '00 00 ff fd 00 01 00 01'

// RIP は UDP（ポート 520）の上で動く。IPv4 のプロトコル番号 17 が UDP
const RIP_DEFAULTS = { ipv4: { protocol: '17' }, udp: { src_port: '520', dst_port: '520' } }

// パケット作成のボタン（データ部から高レイヤ順にヘッダを付与する）の設定
export const COMPOSE_SETTINGS: Partial<Record<ActionButtonId, ComposeSettings>> = {
  arp_request: { layers: ['arp'], defaults: { arp: { op: '1' } } },
  arp_response: { layers: ['arp'], defaults: { arp: { op: '2' } } },
  ping_request: { layers: ['ipv4'], payload: ICMP_ECHO },
  ping_response: { layers: ['ipv4'], payload: ICMP_ECHO_REPLY },
  packet_forward: { layers: ['ipv4'], payload: ICMP_ECHO },
  // 経路表全体の要求は、アドレスファミリ 0・メトリック 16 のエントリを1つだけ入れる
  rip_request: {
    layers: ['rip', 'udp', 'ipv4'],
    defaults: RIP_DEFAULTS,
    entries: [{ afi: '0', address: '0.0.0.0', mask: '0.0.0.0', metric: '16' }],
  },
  rip_response: { layers: ['rip', 'udp', 'ipv4'], defaults: RIP_DEFAULTS, entries: [{}] },
}

const isActionButtonId = (name: string): name is ActionButtonId => name in ACTION_BUTTON_LABELS

// "arp request" のような書き方も受け付けてボタン id にする。未知の値なら null
export function parseActionButtonId(value: unknown): ActionButtonId | null {
  const name = typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s-]+/g, '_') : ''
  return isActionButtonId(name) ? name : null
}

// JSON の action_buttons をボタン id の配列にする。未知の値は警告して無視し、重複は1つにまとめる
export function resolveActionButtons(raw: unknown): ActionButtonId[] {
  if (!Array.isArray(raw)) return []
  const ids: ActionButtonId[] = []
  for (const value of raw) {
    const id = parseActionButtonId(value)
    if (!id) console.warn('action_buttons: 未定義のボタンを無視しました', value)
    else if (!ids.includes(id)) ids.push(id)
  }
  return ids
}
