import { Button, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { SecondaryButton } from '../components/ui'
import { PROTOCOLS, UPPER_PROTOCOL_FIELDS, type ProtocolId } from '../packet/protocols'
import { analyzePacket } from '../packet/steps'
import type { ReceivedPacket } from '../stage/types'
import { HexDump, LayerList } from './PacketViews'

// 解析ボタンを出す層（RIP エントリは RIP ヘッダと一緒に解析する）
const ANALYZABLE_PROTOCOLS: ProtocolId[] = ['ethernet', 'arp', 'ipv4', 'udp', 'rip']

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
  const { bytes, layers, next } = analyzePacket(packet.hex, analyzedLayers)
  const last = layers.at(-1)
  const restLength = bytes.length - (last?.end ?? 0)

  // 次の層は、1つ下の層の項目（Ethernet のタイプ・IP のプロトコル番号・UDP のポート番号）で決まる
  const analyze = (protocol: ProtocolId) => {
    if (last && protocol !== next) {
      const lower = PROTOCOLS[last.protocol]
      const fieldName = lower.fields.find((field) => field.key === UPPER_PROTOCOL_FIELDS[last.protocol]?.key)?.name
      const value = last.fields.find((field) => field.name === fieldName)?.value
      setNotice(`${lower.headerName}の${fieldName}が ${value} なので、次は${next ? PROTOCOLS[next].headerName : ''}として解析します`)
      return
    }
    setNotice(null)
    onAnalyze([...analyzedLayers, protocol])
  }

  // Ethernet ヘッダから順に解析する。最後まで解析したら（またはこの画面で解析できない種類なら）押せない
  const buttons = ANALYZABLE_PROTOCOLS.map((protocol) => ({
    protocol,
    isDone: analyzedLayers.includes(protocol),
    isDisabled: analyzedLayers.includes(protocol) || next === null || (!last && protocol !== 'ethernet'),
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
      <HexDump bytes={bytes} layers={layers} restLabel={next === null ? 'データ' : '未解析'} />
      {layers.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          受信したままの生データです。まずは{PROTOCOLS.ethernet.headerName}を解析しましょう。
        </Text>
      ) : (
        <LayerList title="解析結果" layers={layers} />
      )}
      {next === null && restLength > 0 && (
        <Text fontSize="sm" color="gray.600">
          残りの {restLength} バイトは上位プロトコルのデータです。
        </Text>
      )}
    </VStack>
  )
}
