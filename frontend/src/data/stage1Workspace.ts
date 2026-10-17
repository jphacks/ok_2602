import type { FrameLayer, StageWorkspaceData } from '../types/workspace'

// ステージ1の作業画面用データ（バックエンド実装までの仮データ）

const EMPTY = '—'

const ethernetLayer = (dst: string, src: string, type: string): FrameLayer => ({
  name: 'Ethernet II',
  fields: [
    { name: '宛先MACアドレス', value: dst },
    { name: '送信元MACアドレス', value: src },
    { name: 'タイプ', value: type },
  ],
})

const arpLayer = (
  operation: string,
  senderMac: string,
  senderIp: string,
  targetMac: string,
  targetIp: string,
): FrameLayer => ({
  name: 'ARP',
  fields: [
    { name: 'オペレーション', value: operation },
    { name: '送信元MACアドレス', value: senderMac },
    { name: '送信元IPアドレス', value: senderIp },
    { name: '宛先MACアドレス', value: targetMac },
    { name: '宛先IPアドレス', value: targetIp },
  ],
})

const ipv4Layer = (src: string, dst: string, ttl: string, protocol: string): FrameLayer => ({
  name: 'IPv4',
  fields: [
    { name: '送信元IPアドレス', value: src },
    { name: '宛先IPアドレス', value: dst },
    { name: 'TTL', value: ttl },
    { name: 'プロトコル', value: protocol },
  ],
})

export const STAGE1_WORKSPACE: StageWorkspaceData = {
  routingTable: {
    title: 'ルーティングテーブル',
    columns: ['Code', 'Network', '[AD/Metric]', 'Next Hop', 'Interface'],
    rows: [
      ['C', '192.168.1.0/24', '', 'directly connected', 'Gi0/0'],
      ['L', '192.168.1.1/32', '', 'directly connected', 'Gi0/0'],
      ['C', '192.168.2.0/24', '', 'directly connected', 'Gi0/1'],
      ['L', '192.168.2.1/32', '', 'directly connected', 'Gi0/1'],
      ['S', '10.0.0.0/8', '[1/0]', '192.168.2.254', 'Gi0/1'],
      ['S*', '0.0.0.0/0', '[1/0]', '192.168.2.254', 'Gi0/1'],
    ],
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
  arpTable: {
    title: 'ARPテーブル',
    columns: ['Protocol', 'Address', 'Age (min)', 'Hardware Addr', 'Type', 'Interface'],
    rows: [
      ['Internet', '192.168.1.1', '-', '0000.0c01.0001', 'ARPA', 'Gi0/0'],
      ['Internet', '192.168.1.10', '3', '0000.0000.0101', 'ARPA', 'Gi0/0'],
      ['Internet', '192.168.2.1', '-', '0000.0c01.0002', 'ARPA', 'Gi0/1'],
    ],
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
  macAddressTable: {
    title: 'MACアドレステーブル',
    columns: ['Vlan', 'Mac Address', 'Type', 'Ports'],
    rows: [
      ['1', '0000.0000.0101', 'DYNAMIC', 'Gi0/0'],
      ['1', '0000.0000.0201', 'DYNAMIC', 'Gi0/1'],
    ],
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
  packets: [
    {
      id: 'packet-1',
      label: '一つ目のパケット',
      layers: [
        ethernetLayer('ffff.ffff.ffff', '0000.0000.0101', '0x0806 (ARP)'),
        arpLayer('1 (Request)', '0000.0000.0101', '192.168.1.10', '0000.0000.0000', '192.168.1.1'),
      ],
    },
    {
      id: 'packet-2',
      label: '二つ目のパケット',
      layers: [
        ethernetLayer('0000.0c01.0001', '0000.0000.0101', '0x0800 (IPv4)'),
        ipv4Layer('192.168.1.10', '192.168.2.20', '64', '1 (ICMP)'),
      ],
    },
    {
      id: 'packet-3',
      label: '三つ目のパケット',
      layers: [
        ethernetLayer('0000.0c01.0001', '0000.0000.0101', '0x0800 (IPv4)'),
        ipv4Layer('192.168.1.10', '10.1.1.1', '64', '6 (TCP)'),
      ],
    },
  ],
  actions: [
    {
      id: 'arp-request',
      label: 'ARPリクエスト',
      layers: [
        ethernetLayer(EMPTY, EMPTY, '0x0806 (ARP)'),
        arpLayer('1 (Request)', EMPTY, EMPTY, EMPTY, EMPTY),
      ],
    },
    {
      id: 'arp-reply',
      label: 'ARPレスポンス',
      layers: [
        ethernetLayer(EMPTY, EMPTY, '0x0806 (ARP)'),
        arpLayer('2 (Reply)', EMPTY, EMPTY, EMPTY, EMPTY),
      ],
    },
    {
      id: 'forward',
      label: 'パケット転送',
      layers: [
        ethernetLayer(EMPTY, EMPTY, '0x0800 (IPv4)'),
        ipv4Layer(EMPTY, EMPTY, EMPTY, EMPTY),
      ],
    },
  ],
  todos: [
    '受信パケットを開いて、宛先IPアドレスを確認する',
    'ルーティングテーブルから、転送先のインターフェースとネクストホップを決める',
    'ARPテーブルにネクストホップのMACアドレスがなければ、ARPリクエストを送る',
    'ARPリクエストを受け取ったら、ARPレスポンスを返す',
    '宛先MACアドレスを書き換えて、パケットを転送する',
  ],
}
