import type { TableId } from '../stage/options'
import type { NetworkTable } from '../stage/types'

// 作業画面の表の見出し・列・説明と、やることリスト（どのステージでも共通の文言）。
// 表の中身（行）はステージ情報から作る（stage/buildWorkspace.ts）

export const TABLE_TEMPLATES: Record<TableId, Omit<NetworkTable, 'rows'>> = {
  routing: {
    title: 'ルーティングテーブル',
    columns: ['Code', 'Network', '[AD/Metric]', 'Next Hop', 'Interface'],
    help: {
      summary:
        'ルータが「宛先ネットワークへどのインターフェースから送るか」を決めるための表です。Code は経路をどうやって知ったかを表します。',
      items: [
        { term: 'C', description: 'connected：ルータに直接つながっているネットワーク' },
        { term: 'L', description: 'local：ルータ自身のインターフェースのIPアドレス' },
        { term: 'S', description: 'static：管理者が手動で設定した経路' },
        { term: 'R / O', description: 'RIP / OSPF：ルーティングプロトコルで学習した経路' },
        { term: '*', description: 'candidate default：どの経路にも当てはまらないときに使うデフォルトルート' },
        { term: '[AD/Metric]', description: '経路の信頼度（管理距離）と、宛先までの距離（メトリック）' },
      ],
    },
  },
  arp: {
    title: 'ARPテーブル',
    columns: ['Protocol', 'Address', 'Age (min)', 'Hardware Addr', 'Type', 'Interface'],
    help: {
      summary: 'IPアドレスと MACアドレスの対応表です。同じネットワーク内の相手にフレームを送るときに使います。',
      items: [
        { term: 'Address', description: '相手のIPアドレス' },
        { term: 'Age (min)', description: '登録されてからの経過時間（分）。「-」はルータ自身のアドレス' },
        { term: 'Hardware Addr', description: '相手のMACアドレス' },
        { term: 'Type', description: 'カプセル化の種類。Ethernet では ARPA' },
        { term: 'Interface', description: 'その相手がつながっているインターフェース' },
      ],
    },
  },
  mac: {
    title: 'MACアドレステーブル',
    columns: ['Vlan', 'Mac Address', 'Type', 'Ports'],
    help: {
      summary: 'どの MACアドレスの機器がどのポートの先にいるかを覚えておく表です。',
      items: [
        { term: 'Vlan', description: 'そのMACアドレスが所属する VLAN の番号' },
        { term: 'Mac Address', description: '学習した機器のMACアドレス' },
        { term: 'Type', description: 'DYNAMIC は受信したフレームから自動で学習、STATIC は手動で設定したもの' },
        { term: 'Ports', description: 'そのMACアドレスの機器がつながっているポート' },
      ],
    },
  },
}

export const WORKSPACE_TODOS = [
  '受信パケットを開いて、宛先IPアドレスを確認する',
  'ルーティングテーブルから、転送先のインターフェースとネクストホップを決める',
  'ARPテーブルにネクストホップのMACアドレスがなければ、ARPリクエストを送る',
  'ARPリクエストを受け取ったら、ARPレスポンスを返す',
  '宛先MACアドレスを書き換えて、パケットを転送する',
]
