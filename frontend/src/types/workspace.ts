// ステージ画面（ルータの作業画面）で表示するデータの型定義

// ルーティングテーブル・ARPテーブル・MACアドレステーブルの表示用データ
export interface NetworkTableData {
  title: string
  columns: string[]
  rows: string[][]
  help: TableHelp
}

// ？ボタンで表示する詳細情報（Cisco の show コマンドの Codes 欄のようなもの）
export interface TableHelp {
  summary: string
  items: { term: string; description: string }[]
}

export interface FrameField {
  name: string
  value: string
}

// フレームを構成する層（Ethernet / ARP / IPv4 など）
export interface FrameLayer {
  name: string
  fields: FrameField[]
}

export interface ReceivedPacket {
  id: string
  label: string
  layers: FrameLayer[]
}

// 作業枠の左側に並ぶ作業ボタン
export interface WorkAction {
  id: string
  label: string
  layers: FrameLayer[]
}

export interface StageWorkspaceData {
  routingTable: NetworkTableData
  arpTable: NetworkTableData
  macAddressTable: NetworkTableData
  packets: ReceivedPacket[]
  actions: WorkAction[]
  todos: string[]
}
