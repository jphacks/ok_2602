import type { Edge, Node, Stage } from '../types/stage'

// バックエンドの /getstages が使えない間の代替データ

const pc = (id: string, ip: string, mac: string): Node => ({
  id,
  type: 'pc',
  ports: [{ id: 'eth0', mac, ip }],
})

const switchNode = (id: string, portCount: number): Node => ({
  id,
  type: 'switch',
  ports: Array.from({ length: portCount }, (_, i) => ({
    id: `port${i + 1}`,
    mac: '',
    ip: '',
  })),
})

const router = (id: string, ips: string[], macPrefix: string): Node => ({
  id,
  type: 'router',
  ports: ips.map((ip, i) => ({
    id: `eth${i}`,
    mac: `${macPrefix}:${String(i).padStart(2, '0')}`,
    ip,
  })),
})

const link = (
  id: string,
  [sourceNode, sourcePort]: [string, string],
  [targetNode, targetPort]: [string, string],
): Edge => ({
  id,
  source: { node_id: sourceNode, port_id: sourcePort },
  target: { node_id: targetNode, port_id: targetPort },
})

export const DUMMY_STAGES: Stage[] = [
  {
    id: 'stage-1',
    title: '基本接続演習',
    description: '2台のPCをケーブルでつないで通信してみよう。',
    topology: {
      nodes: [
        pc('pc1', '192.168.1.1', '00:00:00:00:01:01'),
        pc('pc2', '192.168.1.2', '00:00:00:00:01:02'),
      ],
      edges: [link('e1', ['pc1', 'eth0'], ['pc2', 'eth0'])],
    },
  },
  {
    id: 'stage-2',
    title: 'スイッチで接続',
    description: 'スイッチを使って3台のPCを同じネットワークにつなごう。',
    topology: {
      nodes: [
        pc('pc1', '192.168.1.1', '00:00:00:00:02:01'),
        pc('pc2', '192.168.1.2', '00:00:00:00:02:02'),
        pc('pc3', '192.168.1.3', '00:00:00:00:02:03'),
        switchNode('sw1', 4),
      ],
      edges: [
        link('e1', ['pc1', 'eth0'], ['sw1', 'port1']),
        link('e2', ['pc2', 'eth0'], ['sw1', 'port2']),
        link('e3', ['pc3', 'eth0'], ['sw1', 'port3']),
      ],
    },
  },
  {
    id: 'stage-3',
    title: 'IPアドレスの設定',
    description: '正しいIPアドレスを設定して通信できるようにしよう。',
    topology: {
      nodes: [
        pc('pc1', '192.168.1.1', '00:00:00:00:03:01'),
        pc('pc2', '', '00:00:00:00:03:02'),
        switchNode('sw1', 4),
      ],
      edges: [
        link('e1', ['pc1', 'eth0'], ['sw1', 'port1']),
        link('e2', ['pc2', 'eth0'], ['sw1', 'port2']),
      ],
    },
  },
  {
    id: 'stage-4',
    title: 'サブネットを理解しよう',
    description: '同じネットワークかどうかをサブネットで見分けよう。',
    topology: {
      nodes: [
        pc('pc1', '192.168.1.10', '00:00:00:00:04:01'),
        pc('pc2', '192.168.2.10', '00:00:00:00:04:02'),
        switchNode('sw1', 4),
      ],
      edges: [
        link('e1', ['pc1', 'eth0'], ['sw1', 'port1']),
        link('e2', ['pc2', 'eth0'], ['sw1', 'port2']),
      ],
    },
  },
  {
    id: 'stage-5',
    title: 'MACアドレスとARP',
    description: 'IPアドレスからMACアドレスを調べるしくみを学ぼう。',
    topology: {
      nodes: [
        pc('pc1', '192.168.1.1', '00:00:00:00:05:01'),
        pc('pc2', '192.168.1.2', '00:00:00:00:05:02'),
        switchNode('sw1', 4),
      ],
      edges: [
        link('e1', ['pc1', 'eth0'], ['sw1', 'port1']),
        link('e2', ['pc2', 'eth0'], ['sw1', 'port2']),
      ],
    },
  },
  {
    id: 'stage-6',
    title: 'ルーターで接続',
    description: 'ルーターを使って2つのネットワークをつなごう。',
    topology: {
      nodes: [
        pc('pc1', '192.168.1.10', '00:00:00:00:06:01'),
        pc('pc2', '192.168.2.10', '00:00:00:00:06:02'),
        router('r1', ['192.168.1.1', '192.168.2.1'], '00:00:00:00:06'),
      ],
      edges: [
        link('e1', ['pc1', 'eth0'], ['r1', 'eth0']),
        link('e2', ['pc2', 'eth0'], ['r1', 'eth1']),
      ],
    },
  },
  {
    id: 'stage-7',
    title: 'デフォルトゲートウェイ',
    description: '別のネットワークへの出口を設定しよう。',
    topology: {
      nodes: [
        pc('pc1', '192.168.1.10', '00:00:00:00:07:01'),
        pc('pc2', '192.168.2.10', '00:00:00:00:07:02'),
        switchNode('sw1', 4),
        router('r1', ['192.168.1.1', '192.168.2.1'], '00:00:00:00:07'),
      ],
      edges: [
        link('e1', ['pc1', 'eth0'], ['sw1', 'port1']),
        link('e2', ['sw1', 'port4'], ['r1', 'eth0']),
        link('e3', ['pc2', 'eth0'], ['r1', 'eth1']),
      ],
    },
  },
  {
    id: 'stage-8',
    title: '複数スイッチの構成',
    description: 'スイッチ同士をつないでネットワークを広げよう。',
    topology: {
      nodes: [
        pc('pc1', '192.168.1.1', '00:00:00:00:08:01'),
        pc('pc2', '192.168.1.2', '00:00:00:00:08:02'),
        switchNode('sw1', 4),
        switchNode('sw2', 4),
      ],
      edges: [
        link('e1', ['pc1', 'eth0'], ['sw1', 'port1']),
        link('e2', ['sw1', 'port4'], ['sw2', 'port4']),
        link('e3', ['pc2', 'eth0'], ['sw2', 'port1']),
      ],
    },
  },
  {
    id: 'stage-9',
    title: 'ルーティング',
    description: '2台のルーターを経由してパケットを届けよう。',
    topology: {
      nodes: [
        pc('pc1', '192.168.1.10', '00:00:00:00:09:01'),
        pc('pc2', '192.168.3.10', '00:00:00:00:09:02'),
        router('r1', ['192.168.1.1', '192.168.2.1'], '00:00:00:00:91'),
        router('r2', ['192.168.2.2', '192.168.3.1'], '00:00:00:00:92'),
      ],
      edges: [
        link('e1', ['pc1', 'eth0'], ['r1', 'eth0']),
        link('e2', ['r1', 'eth1'], ['r2', 'eth0']),
        link('e3', ['r2', 'eth1'], ['pc2', 'eth0']),
      ],
    },
  },
  {
    id: 'stage-10',
    title: '総合演習',
    description: 'これまでの知識を使ってネットワーク全体を完成させよう。',
    topology: {
      nodes: [
        pc('pc1', '192.168.1.10', '00:00:00:00:10:01'),
        pc('pc2', '192.168.1.11', '00:00:00:00:10:02'),
        pc('pc3', '192.168.2.10', '00:00:00:00:10:03'),
        switchNode('sw1', 4),
        router('r1', ['192.168.1.1', '192.168.2.1'], '00:00:00:00:a0'),
      ],
      edges: [
        link('e1', ['pc1', 'eth0'], ['sw1', 'port1']),
        link('e2', ['pc2', 'eth0'], ['sw1', 'port2']),
        link('e3', ['sw1', 'port4'], ['r1', 'eth0']),
        link('e4', ['r1', 'eth1'], ['pc3', 'eth0']),
      ],
    },
  },
]
