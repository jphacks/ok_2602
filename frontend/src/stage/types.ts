import type { TableId } from './options'

// ステージ情報の型。バックエンド (Go) の model パッケージの構造体と対応させる（JSON のキーは snake_case）

export interface Port {
  id: string
  mac: string
  ip: string
}

export interface Node {
  id: string
  type: 'router' | 'pc' | 'switch'
  ports: Port[]
}

export interface PortEndpoint {
  node_id: string
  port_id: string
}

export interface Edge {
  id: string
  source: PortEndpoint
  target: PortEndpoint
}

export interface Topology {
  nodes: Node[]
  edges: Edge[]
}

export interface Stage {
  id: string
  title: string
  description: string
  // 一覧（GET /getstages）には含まれず、詳細（GET /getstages/:stageID）で届く
  topology?: Topology
  // UI の設定（キーと値は stage/options.ts）。空なら全機能を使える状態
  options?: Record<string, unknown>
  // 「作業」に並べるボタン（値は stage/actionButtons.ts）。空ならボタンなし
  action_buttons?: string[]
  // やることリスト。{ "項番": "やること" } の形（並べ方は stage/todoList.ts）。空なら共通のやることリスト
  todo_list?: Record<string, string>
  // はじめから MAC アドレステーブルに載せるノードの id（MAC とポートは topology から求める）
  mac_table?: string[]
}

// WebSocket（/ws/:stageID）でやり取りするデータ。バックエンドの model パッケージ（pingpacket.go / scenario.go）と対応させる。
// サーバーからは WSMessage が届き、こちらからは PacketJson をそのまま送る

export interface EthernetJson {
  dst: string
  src: string
  type: number
}

export interface ArpJson {
  htype: number
  ptype: number
  hlen: number
  plen: number
  op: number
  sha: string
  spa: string
  tha: string
  tpa: string
}

export interface Ipv4Json {
  ver_ihl: number
  tos: number
  total_length: number
  id: number
  flags: number
  ttl: number
  protocol: number
  checksum: number
  src: string
  dst: string
}

export interface IcmpJson {
  type: number
  code: number
  checksum: number
  id: number
  seq: number
}

export interface UdpJson {
  src_port: number
  dst_port: number
  length: number
  checksum: number
}

export interface RipEntryJson {
  afi: number
  route_tag: number
  address: string
  mask: string
  next_hop: string
  metric: number
}

export interface RipJson {
  command: number
  version: number
  entries: RipEntryJson[]
}

// パケット全体。hex はフレーム全体、payload は最後のヘッダより後ろ（どちらも空白区切りの16進数）
export interface PacketJson {
  hex: string
  ethernet: EthernetJson
  arp?: ArpJson
  ipv4?: Ipv4Json
  icmp?: IcmpJson
  udp?: UdpJson
  rip?: RipJson
  payload: string
}

export interface WSMessage {
  // packet: パケットが届いた / eval_result: 送ったパケットの判定結果 / info: ステージクリア / error: サーバー側のエラー
  event: 'packet' | 'eval_result' | 'info' | 'error'
  // 以下は値がないとき（false・0 も）省略される
  step?: number
  packet?: PacketJson
  message?: string
  success?: boolean
}

// ここから下はフロントだけで使う、作業画面の表示用データ

// ルーティング / ARP / MACアドレステーブル（Cisco の show コマンド風の列）
export interface NetworkTable {
  title: string
  columns: string[]
  rows: string[][]
  // ？ボタンで表示する説明（show ip route の Codes 欄のようなもの）
  help: {
    summary: string
    items: { term: string; description: string }[]
  }
}

// 受信したパケット。hex は Ethernet フレーム全体の16進数（空白区切り）
export interface ReceivedPacket {
  id: string
  label: string
  hex: string
}

// プレイヤーが操作するルータ自身の情報（ルータ情報のボタンで表示する）
export interface RouterInfo {
  name: string
  interfaces: {
    name: string
    // "192.168.1.1/24" の形
    address: string
    subnetMask: string
    network: string
    mac: string
    // つながっている相手（"PC1 の eth0" など）。つながっていなければ空文字
    neighbor: string
  }[]
}

// やることリストの1項目。number は項番（ステージ JSON のキー）
export interface TodoItem {
  number: string
  text: string
}

export interface WorkspaceData {
  router: RouterInfo
  tables: Record<TableId, NetworkTable>
  todos: TodoItem[]
}
