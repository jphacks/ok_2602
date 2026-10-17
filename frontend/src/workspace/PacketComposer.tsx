import { Box, Button, Field, HStack, Input, Text, Textarea, VStack } from '@chakra-ui/react'
import { SecondaryButton } from '../components/ui'
import {
  calculateAutoValue,
  formatField,
  formatNumber,
  parseField,
  PROTOCOLS,
  type FieldDefinition,
  type ProtocolId,
} from '../packet/protocols'
import { buildDraft, type ComposeSettings, type IsAutoFilled, type IsEditable, type PacketDraft } from '../packet/steps'
import { FieldRow, HexDump, LayerCard } from './PacketViews'

type Props = {
  label: string
  settings: ComposeSettings
  draft: PacketDraft
  onChange: (draft: PacketDraft) => void
  isAutoFilled: IsAutoFilled
  isEditable: IsEditable
}

// 入力欄の例（具体的なアドレスではなく形式だけ示す）
function getPlaceholder(field: FieldDefinition) {
  if (field.format === 'mac') return 'xx:xx:xx:xx:xx:xx'
  if (field.format === 'ipv4') return 'x.x.x.x'
  const labels = Object.entries(field.labels ?? {}).map(([value, label]) => `${formatNumber(field, Number(value))}: ${label}`)
  if (labels.length > 0) return labels.join(' / ')
  return field.format === 'hex' ? `16進数（例: ${formatNumber(field, 0)}）` : '10進数'
}

// 送信するパケットを高レイヤ→低レイヤの順にヘッダを付与して組み立てる
export function PacketComposer({ label, settings, draft, onChange, isAutoFilled, isEditable }: Props) {
  const { upper } = settings
  const { attached } = draft
  const packet = buildDraft(settings, draft, isAutoFilled)
  const isBuilt = (protocol: ProtocolId) => packet.layers.some((layer) => layer.protocol === protocol)

  const setAttached = (next: ProtocolId[]) => onChange({ ...draft, attached: next })
  const setInput = (protocol: ProtocolId, key: string, value: string) =>
    onChange({ ...draft, inputs: { ...draft.inputs, [protocol]: { ...draft.inputs[protocol], [key]: value } } })

  // 自動入力の項目に表示する値
  const getAutoValue = (protocol: ProtocolId, field: FieldDefinition) => {
    const text =
      field.mode === 'fixed'
        ? field.defaultValue
        : calculateAutoValue(
            protocol,
            field.key,
            protocol === 'ipv4' ? (packet.payload ?? []).length : 0,
            protocol === 'ethernet' ? upper : undefined,
          )
    const bytes = text ? parseField(field, text) : null
    return bytes ? formatField(field, bytes) : '自動計算'
  }

  return (
    <VStack align="stretch" gap="3">
      <Text fontWeight="bold" color="gray.800">
        {label}のパケットを作る
      </Text>
      <HStack gap="2" flexWrap="wrap">
        <SecondaryButton size="sm" disabled={attached.includes(upper) || !packet.payload} onClick={() => setAttached([upper])}>
          {PROTOCOLS[upper].headerName}を付与する
        </SecondaryButton>
        {/* Ethernet ヘッダは上位の層を付与し、入力を終えた後でないと付与できない */}
        <SecondaryButton
          size="sm"
          disabled={!isBuilt(upper) || attached.includes('ethernet')}
          onClick={() => setAttached([upper, 'ethernet'])}
        >
          {PROTOCOLS.ethernet.headerName}を付与する
        </SecondaryButton>
        <Button
          size="sm"
          variant="ghost"
          colorPalette="gray"
          disabled={attached.length === 0}
          onClick={() => setAttached(attached.slice(0, -1))}
        >
          取り消す
        </Button>
      </HStack>

      {/* フレーム上の並び（Ethernet が先頭）で入力欄を出す。自動入力・編集できない項目は値だけ表示する */}
      {[...attached].reverse().map((protocol) => (
        <LayerCard key={protocol} title={PROTOCOLS[protocol].name} colorPalette={PROTOCOLS[protocol].colorPalette} bg="white">
          {PROTOCOLS[protocol].fields.map((field) => {
            const value = draft.inputs[protocol][field.key] ?? ''
            return (
              <FieldRow key={field.key} name={field.name}>
                {isAutoFilled(protocol, field) ? (
                  <Text fontSize="sm" fontFamily="mono" color="gray.500">
                    {getAutoValue(protocol, field)}（自動）
                  </Text>
                ) : !isEditable(`${protocol}.${field.key}`) ? (
                  <Text fontSize="sm" fontFamily="mono" color="gray.500">
                    {value}（固定）
                  </Text>
                ) : (
                  <Input
                    size="xs"
                    fontFamily="mono"
                    value={value}
                    placeholder={getPlaceholder(field)}
                    aria-invalid={value !== '' && !parseField(field, value)}
                    onChange={(event) => setInput(protocol, field.key, event.target.value)}
                  />
                )}
              </FieldRow>
            )
          })}
        </LayerCard>
      ))}

      {upper === 'ipv4' && (
        <Field.Root invalid={!packet.payload}>
          <Field.Label fontSize="sm" color="gray.700">
            データ（16進数）{!isEditable('payload') && '（固定）'}
          </Field.Label>
          <Textarea
            size="sm"
            bg="white"
            fontFamily="mono"
            rows={2}
            readOnly={!isEditable('payload')}
            color={isEditable('payload') ? undefined : 'gray.500'}
            value={draft.payloadText}
            onChange={(event) => onChange({ ...draft, payloadText: event.target.value })}
          />
          <Field.ErrorText>2桁ずつの16進数で入力してください（例: 08 00 f7 fd）</Field.ErrorText>
        </Field.Root>
      )}

      <Text fontSize="sm" fontWeight="semibold" color="gray.700">
        組み立て中のパケット（{packet.bytes.length} バイト）
      </Text>
      {packet.bytes.length > 0 ? (
        <HexDump bytes={packet.bytes} layers={packet.layers} restLabel="データ" />
      ) : (
        <Text fontSize="sm" color="gray.600">
          {PROTOCOLS[upper].headerName}を付与して、項目を入力しましょう。
        </Text>
      )}

      <Box>
        <Button size="sm" bg="green.500" color="white" _hover={{ bg: 'green.600' }} disabled>
          送信する
        </Button>
        <Text fontSize="xs" color="gray.500" mt="1">
          {packet.isComplete
            ? 'パケットは完成しています。送信はサーバーとの接続後に使えるようになります。'
            : `${PROTOCOLS[upper].headerName} → ${PROTOCOLS.ethernet.headerName}の順に付与するとパケットが完成します。`}
        </Text>
      </Box>
    </VStack>
  )
}
