import { Badge, Box, Grid, HStack, Text, VStack, type BoxProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { parseLayer, PROTOCOLS, type ParsedLayer, type ProtocolId } from '../packet/protocols'
import { buildDraft, type ComposeSettings, type IsAutoFilled, type PacketDraft } from '../packet/steps'

// パケットの表示部品（16進ダンプ・層ごとの項目表）と、作成したパケットの一覧

const BYTES_PER_ROW = 16

type LayerRange = { protocol: ProtocolId; start: number; end: number }

// オフセット付きの16進ダンプ。layers の範囲は層ごとに色分けし、それ以外は灰色で表示する
export function HexDump({ bytes, layers, restLabel }: { bytes: number[]; layers: LayerRange[]; restLabel: string }) {
  const getLayer = (index: number) => layers.find((layer) => index >= layer.start && index < layer.end)
  const rows = Array.from({ length: Math.ceil(bytes.length / BYTES_PER_ROW) }, (_, row) =>
    bytes.slice(row * BYTES_PER_ROW, (row + 1) * BYTES_PER_ROW),
  )
  const hasRest = bytes.some((_, index) => !getLayer(index))
  // RIP エントリのように同じ層が続くときは、凡例は1つにまとめる
  const protocols = [...new Set(layers.map((layer) => layer.protocol))]
  const legends = [
    ...protocols.map((protocol) => ({ label: PROTOCOLS[protocol].name, color: `${PROTOCOLS[protocol].colorPalette}.100` })),
    ...(hasRest ? [{ label: restLabel, color: 'gray.100' }] : []),
  ]

  return (
    <VStack align="stretch" gap="2">
      <Box overflowX="auto" bg="white" borderWidth="1px" borderColor="gray.200" rounded="md" p="2" fontFamily="mono" fontSize="xs">
        {rows.map((row, rowIndex) => (
          <HStack key={rowIndex} gap="3" whiteSpace="nowrap">
            <Text as="span" color="gray.400">
              {(rowIndex * BYTES_PER_ROW).toString(16).padStart(4, '0')}
            </Text>
            <HStack as="span" gap="0">
              {row.map((byte, byteIndex) => {
                const layer = getLayer(rowIndex * BYTES_PER_ROW + byteIndex)
                return (
                  <Text
                    as="span"
                    key={byteIndex}
                    px="0.5"
                    bg={layer ? `${PROTOCOLS[layer.protocol].colorPalette}.100` : undefined}
                    color={layer ? 'gray.800' : 'gray.400'}
                  >
                    {byte.toString(16).padStart(2, '0')}
                  </Text>
                )
              })}
            </HStack>
          </HStack>
        ))}
      </Box>
      <HStack gap="3" flexWrap="wrap" fontSize="xs" color="gray.600">
        {legends.map((legend) => (
          <HStack key={legend.label} gap="1">
            <Box w="3" h="3" rounded="sm" bg={legend.color} borderWidth="1px" borderColor="gray.200" />
            <Text as="span">{legend.label}</Text>
          </HStack>
        ))}
      </HStack>
    </VStack>
  )
}

// 1つの層の枠（見出し + 「項目名 | 値」の2列）。children には FieldRow を並べる。action は見出しの右端に出す
export function LayerCard({
  title,
  colorPalette,
  action,
  children,
  ...props
}: BoxProps & { title: string; colorPalette: string; action?: ReactNode }) {
  return (
    <Box borderWidth="1px" borderColor={`${colorPalette}.200`} rounded="lg" overflow="hidden" {...props}>
      <HStack justify="space-between" bg={`${colorPalette}.50`} px="3" py="1">
        <Text fontSize="sm" fontWeight="semibold" color={`${colorPalette}.800`}>
          {title}
        </Text>
        {action}
      </HStack>
      <Grid templateColumns="auto 1fr" columnGap="4" rowGap="1.5" px="3" py="2" alignItems="center">
        {children}
      </Grid>
    </Box>
  )
}

export function FieldRow({ name, children }: { name: string; children: ReactNode }) {
  return (
    <>
      <Text fontSize="sm" color="gray.600" whiteSpace="nowrap">
        {name}
      </Text>
      {children}
    </>
  )
}

// 層の見出し。RIP エントリは何番目かを付ける
function formatLayerTitle(layers: { protocol: ProtocolId; name: string }[], index: number) {
  const layer = layers[index]
  if (layer.protocol !== 'rip_entry') return layer.name
  return `${layer.name}${layers.slice(0, index + 1).filter((candidate) => candidate.protocol === 'rip_entry').length}`
}

// 解析した層の項目を一覧する
export function LayerList({ title, layers }: { title: string; layers: ParsedLayer[] }) {
  return (
    <VStack align="stretch" gap="3">
      <Text fontWeight="bold" color="gray.800">
        {title}
      </Text>
      {layers.map((layer, index) => (
        <LayerCard key={layer.start} title={formatLayerTitle(layers, index)} colorPalette="green">
          {layer.fields.map((field) => (
            <FieldRow key={field.name} name={field.name}>
              <Text fontSize="sm" fontFamily="mono" color="gray.800" wordBreak="break-all">
                {field.value}
              </Text>
            </FieldRow>
          ))}
        </LayerCard>
      ))}
    </VStack>
  )
}

type PacketOverviewProps = {
  drafts: { id: string; label: string; settings: ComposeSettings; draft: PacketDraft; isAutoFilled: IsAutoFilled }[]
}

// 作成中・作成済みのパケットの全体像を並べて見る
export function PacketOverview({ drafts }: PacketOverviewProps) {
  return (
    <VStack align="stretch" gap="4">
      <Text fontWeight="bold" color="gray.800">
        作成したパケットの全体像
      </Text>
      {drafts.length === 0 && (
        <Text fontSize="sm" color="gray.600">
          このステージで作成できるパケットはありません。
        </Text>
      )}
      {drafts.map(({ id, label, settings, draft, isAutoFilled }) => {
        const packet = buildDraft(settings, draft, isAutoFilled)
        const layers = packet.layers.flatMap((layer) => parseLayer(layer.protocol, packet.bytes, layer.start) ?? [])
        const status = packet.isComplete
          ? { label: '完成', color: 'green' }
          : layers.length > 0
            ? { label: '作成中', color: 'orange' }
            : { label: '未着手', color: 'gray' }
        return (
          <Box key={id} borderWidth="1px" borderColor="gray.200" rounded="lg" bg="white" p="3">
            <HStack gap="2" mb="2">
              <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                {label}
              </Text>
              <Badge size="sm" colorPalette={status.color}>
                {status.label}
              </Badge>
            </HStack>
            {layers.length === 0 ? (
              <Text fontSize="sm" color="gray.500">
                まだヘッダを付与していません。
              </Text>
            ) : (
              <VStack align="stretch" gap="2">
                <LayerList title={`${packet.bytes.length} バイト`} layers={layers} />
                <HexDump bytes={packet.bytes} layers={packet.layers} restLabel="データ" />
              </VStack>
            )}
          </Box>
        )
      })}
    </VStack>
  )
}
