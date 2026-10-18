import { TABLE_TEMPLATES } from '../data/workspaceText'
import { formatIpv4, formatMac, parseIpv4, parseMac } from '../packet/bytes'
import { resolveTodoList } from './todoList'
import type { Edge, Node, PortEndpoint, RouterInfo, Stage, WorkspaceData } from './types'

// ステージ情報（topology）から作業画面のデータを作る。
// プレイヤーが操作するのは topology の最初のルータ。ルータがなければ null

interface Interface {
  name: string
  mac: string
  ip: number[]
  prefix: number
}

// "192.168.1.1/24" を読む。プレフィックス長がなければ /24 とみなす
function parseCidr(text: string): { ip: number[]; prefix: number } | null {
  const [address, prefixText] = text.split('/')
  const ip = parseIpv4(address ?? '')
  const prefix = prefixText === undefined ? 24 : Number(prefixText)
  return ip && Number.isInteger(prefix) && prefix >= 0 && prefix <= 32 ? { ip, prefix } : null
}

const getNetworkAddress = (ip: number[], prefix: number) =>
  ip.map((byte, index) => byte & (0xff << (8 - Math.min(Math.max(prefix - index * 8, 0), 8))) & 0xff)

// ノードのポートのうち、IP と MAC が正しく書かれているもの
const getInterfaces = (node: Node): Interface[] =>
  node.ports.flatMap((port) => {
    const cidr = parseCidr(port.ip)
    const mac = parseMac(port.mac)
    return cidr && mac ? [{ name: port.id, mac: formatMac(mac), ...cidr }] : []
  })

// ルータの各インターフェースのアドレスと、edges からわかる接続先
function buildRouterInfo(node: Node, router: Interface[], edges: Edge[]): RouterInfo {
  const getNeighbor = (portId: string) => {
    const isSelf = (end: PortEndpoint) => end.node_id === node.id && end.port_id === portId
    const edge = edges.find((candidate) => isSelf(candidate.source) || isSelf(candidate.target))
    if (!edge) return ''
    const other = isSelf(edge.source) ? edge.target : edge.source
    return `${other.node_id} の ${other.port_id}`
  }
  return {
    name: node.id,
    interfaces: router.map((iface) => ({
      name: iface.name,
      address: `${formatIpv4(iface.ip)}/${iface.prefix}`,
      subnetMask: formatIpv4(getNetworkAddress([255, 255, 255, 255], iface.prefix)),
      network: `${formatIpv4(getNetworkAddress(iface.ip, iface.prefix))}/${iface.prefix}`,
      mac: iface.mac,
      neighbor: getNeighbor(iface.name),
    })),
  }
}

// ステージの mac_table に書かれたノードの MAC アドレスを、つながっているルータのポートとともに載せる
function buildMacRows(routerNode: Node, nodes: Node[], edges: Edge[], nodeIds: string[]): string[][] {
  return edges.flatMap((edge) => {
    const [self, other] = edge.source.node_id === routerNode.id ? [edge.source, edge.target] : [edge.target, edge.source]
    if (self.node_id !== routerNode.id || !nodeIds.includes(other.node_id)) return []
    const port = nodes.find((node) => node.id === other.node_id)?.ports.find((candidate) => candidate.id === other.port_id)
    const mac = port && parseMac(port.mac)
    return mac ? [['1', formatMac(mac), 'STATIC', self.port_id]] : []
  })
}

export function buildWorkspace(stage: Stage): WorkspaceData | null {
  const nodes = stage.topology?.nodes ?? []
  const routerNode = nodes.find((node) => node.type === 'router')
  if (!routerNode) return null
  const router = getInterfaces(routerNode)

  return {
    router: buildRouterInfo(routerNode, router, stage.topology?.edges ?? []),
    tables: {
      // はじめは直接つながっているネットワーク（C）と自分のアドレス（L）だけ
      routing: {
        ...TABLE_TEMPLATES.routing,
        rows: router.flatMap((iface) => [
          ['C', `${formatIpv4(getNetworkAddress(iface.ip, iface.prefix))}/${iface.prefix}`, '', 'directly connected', iface.name],
          ['L', `${formatIpv4(iface.ip)}/32`, '', 'directly connected', iface.name],
        ]),
      },
      // はじめはルータ自身のインターフェースだけ。相手の分は ARP で覚える
      arp: {
        ...TABLE_TEMPLATES.arp,
        rows: router.map((iface) => ['Internet', formatIpv4(iface.ip), '-', iface.mac, 'ARPA', iface.name]),
      },
      // はじめはステージの mac_table に書かれたノードだけ
      mac: { ...TABLE_TEMPLATES.mac, rows: buildMacRows(routerNode, nodes, stage.topology?.edges ?? [], stage.mac_table ?? []) },
    },
    todos: resolveTodoList(stage.todo_list),
  }
}
