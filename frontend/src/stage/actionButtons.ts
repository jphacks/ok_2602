import type { ComposeSettings } from '../packet/steps'

// ステージ JSON の "action_buttons" で指定できる、「作業」に並ぶボタン。
// JSON では配列の順に表示され、"arp request" のような空白・ハイフン区切りも受け付ける。
// ボタンを増やすときは ACTION_BUTTON_LABELS に追加し、パケット作成のボタンなら COMPOSE_SETTINGS にも追加する
// （それ以外のボタンは WorkPanel / StageWorkspace に押したときの表示を書く）。

export const ACTION_BUTTON_LABELS = {
  arp_request: 'ARPリクエスト',
  arp_response: 'ARPレスポンス',
  packet_forward: 'パケット転送',
  // 作成中・作成済みのパケットの全体像を見る
  packet_all_view: 'パケットの全体像',
  todo_list: 'やることリスト',
}

export type ActionButtonId = keyof typeof ACTION_BUTTON_LABELS

// ICMP エコー要求（type 8, id 1, seq 1）
export const ICMP_ECHO = '08 00 f7 fd 00 01 00 01'

// パケット作成のボタン（高レイヤから順にヘッダを付与する）の設定
export const COMPOSE_SETTINGS: Partial<Record<ActionButtonId, ComposeSettings>> = {
  arp_request: { upper: 'arp', defaults: { arp: { op: '1' } } },
  arp_response: { upper: 'arp', defaults: { arp: { op: '2' } } },
  packet_forward: { upper: 'ipv4', payload: ICMP_ECHO },
}

const isActionButtonId = (name: string): name is ActionButtonId => name in ACTION_BUTTON_LABELS

// JSON の action_buttons をボタン id の配列にする。未知の値は警告して無視し、重複は1つにまとめる
export function resolveActionButtons(raw: unknown): ActionButtonId[] {
  if (!Array.isArray(raw)) return []
  const ids: ActionButtonId[] = []
  for (const value of raw) {
    const name = typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s-]+/g, '_') : ''
    if (!isActionButtonId(name)) console.warn('action_buttons: 未定義のボタンを無視しました', value)
    else if (!ids.includes(name)) ids.push(name)
  }
  return ids
}
