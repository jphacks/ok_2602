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
import {
  buildDraft,
  createEntry,
  getComposeLayers,
  type ComposeSettings,
  type IsAutoFilled,
  type IsEditable,
  type PacketDraft,
} from '../packet/steps'
import { FieldRow, HexDump, LayerCard } from './PacketViews'

type Props = {
  label: string
  settings: ComposeSettings
  draft: PacketDraft
  onChange: (draft: PacketDraft) => void
  isAutoFilled: IsAutoFilled
  isEditable: IsEditable
  // 完成したパケットを送る。サーバーにつながっていないときは undefined（送信ボタンを押せない）
  onSend?: (bytes: number[]) => void
  // 送ったパケットの判定待ち
  isSending?: boolean
}

// 入力欄の例（具体的なアドレスではなく形式だけ示す）
function getPlaceholder(field: FieldDefinition) {
  if (field.format === 'mac') return 'xx:xx:xx:xx:xx:xx'
  if (field.format === 'ipv4') return 'x.x.x.x'
  const labels = Object.entries(field.labels ?? {}).map(([value, label]) => `${formatNumber(field, Number(value))}: ${label}`)
  if (labels.length > 0) return labels.join(' / ')
  return field.format === 'hex' ? `16進数（例: ${formatNumber(field, 0)}）` : '10進数'
}

// 送信するパケットを、データ部から高レイヤ→低レイヤの順にヘッダを付与して組み立てる
export function PacketComposer({ label, settings, draft, onChange, isAutoFilled, isEditable, onSend, isSending }: Props) {
  const { attached } = draft
  const composeLayers = getComposeLayers(settings)
  const packet = buildDraft(settings, draft, isAutoFilled)
  const isBuilt = (protocol: ProtocolId) => packet.layers.some((layer) => layer.protocol === protocol)

  const setAttached = (next: ProtocolId[]) => onChange({ ...draft, attached: next })
  const setInput = (protocol: ProtocolId, key: string, value: string) =>
    onChange({ ...draft, inputs: { ...draft.inputs, [protocol]: { ...draft.inputs[protocol], [key]: value } } })
  const setEntries = (entries: Record<string, string>[]) => onChange({ ...draft, entries })
  // 追加・削除できるのは、RIP エントリの項目を1つでも編集できるとき
  const canEditEntries = PROTOCOLS.rip_entry.fields.some(
    (field) => isEditable(`rip_entry.${field.key}`) && !isAutoFilled('rip_entry', field),
  )

  // 自動入力の項目に表示する値。長さの計算には、その層より上（データ部と上位のヘッダ）のバイト数を使う
  const getAutoValue = (protocol: ProtocolId, field: FieldDefinition) => {
    const index = composeLayers.indexOf(protocol)
    const upperLength = composeLayers.slice(0, index).reduce((sum, upper) => sum + PROTOCOLS[upper].headerLength, 0)
    const text =
      field.mode === 'fixed'
        ? field.defaultValue
        : calculateAutoValue(protocol, field.key, (packet.payload ?? []).length + upperLength, composeLayers[index - 1])
    const bytes = text ? parseField(field, text) : null
    return bytes ? formatField(field, bytes) : '自動計算'
  }

  // 1項目の表示。自動入力・編集できない項目は値だけ、それ以外は入力欄
  const renderField = (protocol: ProtocolId, field: FieldDefinition, value: string, onInput: (value: string) => void) => (
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
          onChange={(event) => onInput(event.target.value)}
        />
      )}
    </FieldRow>
  )

  return (
    <VStack align="stretch" gap="3">
      <Text fontWeight="bold" color="gray.800">
        {label}のパケットを作る
      </Text>
      {/* ヘッダは高レイヤから順に、1つ上の層の入力を終えた後でないと付与できない */}
      <HStack gap="2" flexWrap="wrap">
        {composeLayers.map((protocol, index) => (
          <SecondaryButton
            key={protocol}
            size="sm"
            disabled={attached.length !== index || !(index === 0 ? packet.payload : isBuilt(composeLayers[index - 1]))}
            onClick={() => setAttached([...attached, protocol])}
          >
            {PROTOCOLS[protocol].headerName}を付与する
          </SecondaryButton>
        ))}
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

      {/* フレーム上の並び（Ethernet が先頭）で入力欄を出す */}
      {[...attached].reverse().map((protocol) => (
        <LayerCard key={protocol} title={PROTOCOLS[protocol].name} colorPalette={PROTOCOLS[protocol].colorPalette} bg="white">
          {PROTOCOLS[protocol].fields.map((field) =>
            renderField(protocol, field, draft.inputs[protocol][field.key] ?? '', (value) => setInput(protocol, field.key, value)),
          )}
        </LayerCard>
      ))}

      {settings.payload !== undefined && (
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

      {settings.entries && (
        <VStack align="stretch" gap="2">
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.700">
              データ（RIPエントリ {draft.entries.length} 件）
            </Text>
            {canEditEntries && (
              <Button size="2xs" variant="outline" colorPalette="green" bg="white" onClick={() => setEntries([...draft.entries, createEntry()])}>
                ＋ エントリを追加
              </Button>
            )}
          </HStack>
          {draft.entries.map((entry, index) => (
            <LayerCard
              key={index}
              title={`${PROTOCOLS.rip_entry.name}${index + 1}`}
              colorPalette={PROTOCOLS.rip_entry.colorPalette}
              bg="white"
              action={
                canEditEntries && (
                  <Button
                    size="2xs"
                    variant="ghost"
                    colorPalette="red"
                    onClick={() => setEntries(draft.entries.filter((_, entryIndex) => entryIndex !== index))}
                  >
                    削除
                  </Button>
                )
              }
            >
              {PROTOCOLS.rip_entry.fields.map((field) =>
                renderField('rip_entry', field, entry[field.key] ?? '', (value) =>
                  setEntries(draft.entries.map((current, entryIndex) => (entryIndex === index ? { ...current, [field.key]: value } : current))),
                ),
              )}
            </LayerCard>
          ))}
        </VStack>
      )}

      <Text fontSize="sm" fontWeight="semibold" color="gray.700">
        組み立て中のパケット（{packet.bytes.length} バイト）
      </Text>
      {packet.bytes.length > 0 ? (
        <HexDump bytes={packet.bytes} layers={packet.layers} restLabel="データ" />
      ) : (
        <Text fontSize="sm" color="gray.600">
          {PROTOCOLS[composeLayers[0]].headerName}を付与して、項目を入力しましょう。
        </Text>
      )}

      <Box>
        <Button
          size="sm"
          bg="green.500"
          color="white"
          _hover={{ bg: 'green.600' }}
          disabled={!packet.isComplete || !onSend}
          loading={isSending}
          loadingText="判定中"
          onClick={() => onSend?.(packet.bytes)}
        >
          送信する
        </Button>
        <Text fontSize="xs" color="gray.500" mt="1">
          {!packet.isComplete
            ? `${composeLayers.map((protocol) => PROTOCOLS[protocol].headerName).join(' → ')}の順に付与するとパケットが完成します。`
            : onSend
              ? 'パケットは完成しています。送信すると、サーバーが正しいかを判定します。'
              : 'サーバーにつながっていないため、送信できません。'}
        </Text>
      </Box>
    </VStack>
  )
}
