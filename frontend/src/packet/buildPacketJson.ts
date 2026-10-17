import { formatHex, formatIpv4, formatMac, parseUint } from './bytes'
import { getUpperProtocol, PROTOCOLS, type ProtocolId } from './protocols'

// WebSocket でバックエンドと送受信するパケットの JSON。バックエンド (Go) にも同じ構造体を作る（キーは snake_case）。
// 各層のキーは packet/protocols.ts の FieldDefinition.key と同じ。MAC・IPv4 アドレスは文字列、それ以外の項目は数値

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

// ICMP ヘッダ（8バイト）。id / seq はエコー要求・応答（ping）のときの意味
export interface IcmpJson {
  type: number
  code: number
  checksum: number
  id: number
  seq: number
}

export interface PacketJson {
  // Ethernet フレーム全体の16進数（空白区切り）。各層の値はここから読み取ったもの
  hex: string
  ethernet: EthernetJson
  // Ethernet のタイプに応じて、どちらか一方が入る
  arp?: ArpJson
  ipv4?: Ipv4Json
  // IPv4 のプロトコルが ICMP のとき
  icmp?: IcmpJson
  // 読み取った層より後ろのデータ（16進数・空白区切り）
  payload: string
}

const ICMP_PROTOCOL = 1
const ICMP_HEADER_LENGTH = 8

// offset から protocol のヘッダとして、項目 key → 値 のオブジェクトを作る
function buildLayerJson(protocol: ProtocolId, bytes: number[], offset: number): Record<string, string | number> {
  const json: Record<string, string | number> = {}
  for (const field of PROTOCOLS[protocol].fields) {
    const fieldBytes = bytes.slice(offset + field.offset, offset + field.offset + field.size)
    json[field.key] =
      field.format === 'mac'
        ? formatMac(fieldBytes)
        : field.format === 'ipv4'
          ? formatIpv4(fieldBytes)
          : parseUint(fieldBytes, 0, field.size)
  }
  return json
}

// Ethernet フレームのバイト列を JSON にする。Ethernet ヘッダに足りなければ null。
// 上の層はバイト数が足りる分だけ読み、残りは payload に入れる
export function buildPacketJson(bytes: number[]): PacketJson | null {
  let offset = PROTOCOLS.ethernet.headerLength
  if (bytes.length < offset) return null
  const json: Omit<PacketJson, 'payload'> = {
    hex: formatHex(bytes),
    ethernet: buildLayerJson('ethernet', bytes, 0) as unknown as EthernetJson,
  }

  const upper = getUpperProtocol(bytes, 0)
  if (upper && bytes.length >= offset + PROTOCOLS[upper].headerLength) {
    const layer = buildLayerJson(upper, bytes, offset)
    if (upper === 'arp') json.arp = layer as unknown as ArpJson
    else json.ipv4 = layer as unknown as Ipv4Json
    offset += PROTOCOLS[upper].headerLength
  }

  if (json.ipv4?.protocol === ICMP_PROTOCOL && bytes.length >= offset + ICMP_HEADER_LENGTH) {
    json.icmp = {
      type: bytes[offset],
      code: bytes[offset + 1],
      checksum: parseUint(bytes, offset + 2, 2),
      id: parseUint(bytes, offset + 4, 2),
      seq: parseUint(bytes, offset + 6, 2),
    }
    offset += ICMP_HEADER_LENGTH
  }

  return { ...json, payload: formatHex(bytes.slice(offset)) }
}
