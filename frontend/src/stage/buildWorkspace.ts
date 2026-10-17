import { TABLE_TEMPLATES, WORKSPACE_TODOS } from '../data/workspaceText'
import { formatHex, formatIpv4, formatMac, parseHex, parseIpv4, parseMac } from '../packet/bytes'
import { buildLayer } from '../packet/protocols'
import { ICMP_ECHO } from './actionButtons'
import type { Node, ReceivedPacket, Stage, WorkspaceData } from './types'

// ステージ情報（topology）から作業画面のデータを作る。
// プレイヤーが操作するのは topology の最初のルータ。ルータがなければ null

interface Interface {
  name: string
  mac: string
  ip: number[]
  prefix: number
}

const BROADCAST_MAC = 'ff:ff:ff:ff:ff:ff'
const UNKNOWN_MAC = '00:00:00:00:00:00'
const ORDINALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

// "192.168.1.1/24" を読む。プレフィックス長がなければ /24 とみなす
function parseCidr(text: string): { ip: number[]; prefix: number } | null {
  const [address, prefixText] = text.split('/')
  const ip = parseIpv4(address ?? '')
  const prefix = prefixText === undefined ? 24 : Number(prefixText)
  return ip && Number.isInteger(prefix) && prefix >= 0 && prefix <= 32 ? { ip, prefix } : null
}

const getNetworkAddress = (ip: number[], prefix: number) =>
  ip.map((byte, index) => byte & (0xff << (8 - Math.min(Math.max(prefix - index * 8, 0), 8))) & 0xff)

const isSameNetwork = (iface: Interface, ip: number[]) =>
  formatIpv4(getNetworkAddress(iface.ip, iface.prefix)) === formatIpv4(getNetworkAddress(ip, iface.prefix))

// ノードのポートのうち、IP と MAC が正しく書かれているもの
const getInterfaces = (node: Node): Interface[] =>
  node.ports.flatMap((port) => {
    const cidr = parseCidr(port.ip)
    const mac = parseMac(port.mac)
    return cidr && mac ? [{ name: port.id, mac: formatMac(mac), ...cidr }] : []
  })

// 受信パケットの仮データ（WebSocket でサーバーから届くようになるまでの代わり）。
// ルータにつながる各PCからゲートウェイへの ARP リクエストと、別のネットワークの PC 宛ての ICMP を作る
function buildSamplePackets(router: Interface[], hosts: Interface[]): ReceivedPacket[] {
  const attachedHosts = hosts.flatMap((host) => {
    const gateway = router.find((iface) => isSameNetwork(iface, host.ip))
    return gateway ? [{ host, gateway }] : []
  })
  const frames: (number[] | null)[] = attachedHosts.map(({ host, gateway }) => {
    const arp = buildLayer('arp', {
      op: '1',
      sha: host.mac,
      spa: formatIpv4(host.ip),
      tha: UNKNOWN_MAC,
      tpa: formatIpv4(gateway.ip),
    }, [])
    return arp && buildLayer('ethernet', { dst: BROADCAST_MAC, src: host.mac }, arp, 'arp')
  })

  const [from] = attachedHosts
  const to = attachedHosts.find(({ gateway }) => from && gateway.name !== from.gateway.name)
  if (from && to) {
    const ip = buildLayer('ipv4', {
      ttl: '64',
      protocol: '1',
      src: formatIpv4(from.host.ip),
      dst: formatIpv4(to.host.ip),
    }, parseHex(ICMP_ECHO) ?? [])
    frames.push(ip && buildLayer('ethernet', { dst: from.gateway.mac, src: from.host.mac }, ip, 'ipv4'))
  }

  return frames
    .filter((frame) => frame !== null)
    .map((frame, index) => ({
      id: `packet-${index + 1}`,
      label: `${ORDINALS[index] ?? index + 1}つ目のパケット`,
      hex: formatHex(frame),
    }))
}

export function buildWorkspace(stage: Stage): WorkspaceData | null {
  const nodes = stage.topology?.nodes ?? []
  const routerNode = nodes.find((node) => node.type === 'router')
  if (!routerNode) return null
  const router = getInterfaces(routerNode)
  const hosts = nodes.filter((node) => node.type === 'pc').flatMap(getInterfaces)

  return {
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
      // はじめは何も学習していない
      mac: { ...TABLE_TEMPLATES.mac, rows: [] },
    },
    packets: buildSamplePackets(router, hosts),
    todos: WORKSPACE_TODOS,
  }
}
