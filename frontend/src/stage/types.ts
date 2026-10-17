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

export interface WorkspaceData {
  router: RouterInfo
  tables: Record<TableId, NetworkTable>
  packets: ReceivedPacket[]
  todos: string[]
}
