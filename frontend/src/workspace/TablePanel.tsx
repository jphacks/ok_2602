import { Box, Button, HStack, IconButton, Input, Popover, Portal, Table, Tabs, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import type { TableId } from '../stage/options'
import type { NetworkTable } from '../stage/types'

type Props = {
  tables: { id: TableId; table: NetworkTable; isEditable: boolean }[]
  onChangeRows: (id: TableId, rows: string[][]) => void
}

// テーブルをタブで切り替えて表示する枠。各タブの右下に？ボタンを置く
export function TablePanel({ tables, onChangeRows }: Props) {
  return (
    <Tabs.Root
      defaultValue={tables[0]?.id}
      variant="line"
      colorPalette="green"
      size="sm"
      display="flex"
      flexDirection="column"
      flex={{ lg: '1' }}
      minH="0"
      minW="0"
      bg="white"
      borderWidth="1px"
      borderColor="green.200"
      rounded="2xl"
      shadow="sm"
      p="4"
      textAlign="left"
    >
      <Tabs.List>
        {tables.map(({ id, table }) => (
          // ？ボタンをタブボタンの中に入れるとボタンの入れ子になるため、外側で重ねて配置する
          <Box key={id} position="relative" flex="auto" minW="0">
            <Tabs.Trigger
              value={id}
              w="full"
              h="full"
              minH="10"
              py="2"
              pl="2"
              pr="5"
              justifyContent="center"
              // タブ名は1行に収める。カラムが狭くなる lg 幅では文字を一段小さくする
              whiteSpace="nowrap"
              fontSize={{ base: 'xs', lg: '2xs', xl: 'xs' }}
            >
              <Text as="span" truncate>
                {table.title}
              </Text>
            </Tabs.Trigger>
            <Box position="absolute" right="0.5" bottom="1">
              <HelpButton table={table} />
            </Box>
          </Box>
        ))}
      </Tabs.List>
      {tables.map(({ id, table, isEditable }) => (
        <Tabs.Content key={id} value={id} flex={{ lg: '1' }} minH="0" pt="3" pb="0">
          {/* 枠に収まらない場合は表の中だけスクロールする */}
          <Box h={{ base: '64', lg: 'full' }} overflow="auto" borderWidth="1px" borderColor="gray.100" rounded="md">
            <TableView table={table} onChangeRows={isEditable ? (rows) => onChangeRows(id, rows) : undefined} />
          </Box>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  )
}

type TableViewProps = {
  table: NetworkTable
  // 指定されたとき、行の追加・変更・削除ができる（オプション *_table_edit）
  onChangeRows?: (rows: string[][]) => void
}

// Cisco の show コマンド風の表。編集できるときは右端に操作ボタンの列を足す
function TableView({ table, onChangeRows }: TableViewProps) {
  // 編集中の行番号と入力中の値（isNew: 追加したばかりで一度も保存していない行）
  const [editing, setEditing] = useState<{ index: number; cells: string[]; isNew?: boolean } | null>(null)
  const isEditable = !!onChangeRows
  const cellStyle = { whiteSpace: 'nowrap', fontFamily: 'mono', fontSize: 'xs', color: 'gray.700' } as const

  const save = () => {
    if (!editing || !onChangeRows) return
    onChangeRows(table.rows.map((row, index) => (index === editing.index ? editing.cells : row)))
    setEditing(null)
  }
  const cancel = () => {
    if (editing?.isNew && onChangeRows) onChangeRows(table.rows.filter((_, index) => index !== editing.index))
    setEditing(null)
  }
  const add = () => {
    if (!onChangeRows) return
    const cells = table.columns.map(() => '')
    onChangeRows([...table.rows, cells])
    setEditing({ index: table.rows.length, cells, isNew: true })
  }

  return (
    <Table.Root size="sm" stickyHeader>
      <Table.Header>
        <Table.Row bg="green.50">
          {table.columns.map((column) => (
            <Table.ColumnHeader key={column} whiteSpace="nowrap" color="gray.700" fontSize="xs">
              {column}
            </Table.ColumnHeader>
          ))}
          {isEditable && (
            <Table.ColumnHeader textAlign="end">
              <Button size="2xs" variant="outline" colorPalette="green" bg="white" onClick={add} disabled={!!editing}>
                ＋ 追加
              </Button>
            </Table.ColumnHeader>
          )}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {table.rows.length === 0 && (
          <Table.Row>
            <Table.Cell colSpan={table.columns.length + (isEditable ? 1 : 0)} fontSize="xs" color="gray.500">
              エントリはありません
            </Table.Cell>
          </Table.Row>
        )}
        {table.rows.map((row, rowIndex) => {
          const isEditing = editing?.index === rowIndex
          return (
            <Table.Row key={rowIndex} bg={isEditing ? 'green.50' : undefined}>
              {row.map((cell, cellIndex) => (
                <Table.Cell key={cellIndex} {...cellStyle}>
                  {isEditing ? (
                    <Input
                      size="2xs"
                      minW="20"
                      bg="white"
                      fontFamily="mono"
                      aria-label={table.columns[cellIndex]}
                      value={editing.cells[cellIndex]}
                      onChange={(event) =>
                        setEditing({ ...editing, cells: editing.cells.map((value, index) => (index === cellIndex ? event.target.value : value)) })
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') save()
                        if (event.key === 'Escape') cancel()
                      }}
                    />
                  ) : (
                    cell
                  )}
                </Table.Cell>
              ))}
              {onChangeRows && (
                <Table.Cell textAlign="end">
                  <HStack gap="1" justify="flex-end">
                    {isEditing ? (
                      <>
                        <Button size="2xs" colorPalette="green" onClick={save}>
                          保存
                        </Button>
                        <Button size="2xs" variant="ghost" onClick={cancel}>
                          取消
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="2xs"
                          variant="ghost"
                          colorPalette="green"
                          disabled={!!editing}
                          onClick={() => setEditing({ index: rowIndex, cells: [...row] })}
                        >
                          編集
                        </Button>
                        <Button
                          size="2xs"
                          variant="ghost"
                          colorPalette="red"
                          disabled={!!editing}
                          onClick={() => onChangeRows(table.rows.filter((_, index) => index !== rowIndex))}
                        >
                          削除
                        </Button>
                      </>
                    )}
                  </HStack>
                </Table.Cell>
              )}
            </Table.Row>
          )
        })}
      </Table.Body>
    </Table.Root>
  )
}

// テーブルの説明（show ip route の Codes 欄のようなもの）を出す小さな？ボタン
function HelpButton({ table }: { table: NetworkTable }) {
  return (
    <Popover.Root positioning={{ placement: 'right-start' }}>
      <Popover.Trigger asChild>
        <IconButton
          aria-label={`${table.title}の説明`}
          size="2xs"
          minW="4"
          h="4"
          fontSize="2xs"
          variant="outline"
          colorPalette="green"
          rounded="full"
          fontWeight="bold"
          bg="white"
        >
          ?
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content maxW="sm">
            <Popover.Arrow />
            <Popover.Body>
              <Popover.Title fontWeight="bold" mb="2">
                {table.title}
              </Popover.Title>
              <Text fontSize="sm" color="gray.600" mb="3">
                {table.help.summary}
              </Text>
              <VStack align="stretch" gap="1.5">
                {table.help.items.map((item) => (
                  <Box key={item.term} fontSize="sm">
                    <Text as="span" fontFamily="mono" fontWeight="bold" color="green.700" mr="2">
                      {item.term}
                    </Text>
                    <Text as="span" color="gray.700">
                      {item.description}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
