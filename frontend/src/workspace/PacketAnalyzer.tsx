import { Button, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { SecondaryButton } from '../components/ui'
import { parseHex } from '../packet/bytes'
import { getUpperProtocol, parseLayer, PROTOCOLS, type ParsedLayer, type ProtocolId } from '../packet/protocols'
import type { ReceivedPacket } from '../stage/types'
import { HexDump, LayerList } from './PacketViews'

type Props = {
  packet: ReceivedPacket
  // 解析済みの層（低レイヤから順）
  analyzedLayers: ProtocolId[]
  onAnalyze: (analyzedLayers: ProtocolId[]) => void
  // 指定すると見出しの右に「戻る」ボタンを出す
  onBack?: () => void
}

// 受信パケットを16進数の生データから低レイヤ→高レイヤの順に解析する
export function PacketAnalyzer({ packet, analyzedLayers, onAnalyze, onBack }: Props) {
  const [notice, setNotice] = useState<string | null>(null)
  const bytes = parseHex(packet.hex) ?? []

  const layers: ParsedLayer[] = []
  for (const protocol of analyzedLayers) {
    const layer = parseLayer(protocol, bytes, layers.at(-1)?.end ?? 0)
    if (!layer) break
    layers.push(layer)
  }
  const ethernet = layers.find((layer) => layer.protocol === 'ethernet')
  const expectedUpper = ethernet ? getUpperProtocol(bytes, ethernet.start) : null
  const isUpperAnalyzed = layers.some((layer) => layer.protocol !== 'ethernet')
  const restLength = bytes.length - (layers.at(-1)?.end ?? 0)

  const analyze = (protocol: ProtocolId) => {
    if (protocol !== 'ethernet' && protocol !== expectedUpper) {
      const type = ethernet?.fields.find((field) => field.name === 'タイプ')?.value
      setNotice(
        expectedUpper
          ? `Ethernetヘッダのタイプが ${type} なので、次は${PROTOCOLS[expectedUpper].headerName}として解析します`
          : `Ethernetヘッダのタイプ ${type} はこの画面では解析できません`,
      )
      return
    }
    setNotice(null)
    onAnalyze([...analyzedLayers, protocol])
  }

  // 上位の層（IPv4 / ARP）は Ethernet ヘッダを解析した後でないと解析できない
  const buttons = (['ethernet', 'ipv4', 'arp'] as const).map((protocol) => ({
    protocol,
    isDone: analyzedLayers.includes(protocol),
    isDisabled: protocol === 'ethernet' ? !!ethernet : !ethernet || isUpperAnalyzed,
  }))

  return (
    <VStack align="stretch" gap="3">
      <Flex justify="space-between" align="center" gap="2">
        <Text fontWeight="bold" color="gray.800">
          {packet.label}の解析
        </Text>
        {onBack && (
          <SecondaryButton size="sm" flexShrink="0" onClick={onBack}>
            戻る
          </SecondaryButton>
        )}
      </Flex>
      <HStack gap="2" flexWrap="wrap">
        {buttons.map(({ protocol, isDone, isDisabled }) => (
          <Button
            key={protocol}
            size="sm"
            variant={isDone ? 'subtle' : 'outline'}
            colorPalette="green"
            bg={isDone ? undefined : 'white'}
            disabled={isDisabled}
            onClick={() => analyze(protocol)}
          >
            {PROTOCOLS[protocol].headerName}
            {isDone ? '（解析済み）' : 'を解析する'}
          </Button>
        ))}
      </HStack>
      {notice && (
        <Text fontSize="sm" color="orange.700" bg="orange.50" rounded="md" px="3" py="2">
          {notice}
        </Text>
      )}
      <HexDump bytes={bytes} layers={layers} restLabel={isUpperAnalyzed ? 'データ' : '未解析'} />
      {layers.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          受信したままの生データです。まずは{PROTOCOLS.ethernet.headerName}を解析しましょう。
        </Text>
      ) : (
        <LayerList title="解析結果" layers={layers} />
      )}
      {isUpperAnalyzed && restLength > 0 && (
        <Text fontSize="sm" color="gray.600">
          残りの {restLength} バイトは上位プロトコルのデータです。
        </Text>
      )}
    </VStack>
  )
}
