import { Box, IconButton, Popover, Portal, Table, Text, VStack } from '@chakra-ui/react'
import type { NetworkTableData } from '../../types/workspace'
import Panel from './Panel'

type Props = {
  table: NetworkTableData
}

// ルーティングテーブル・ARPテーブル・MACアドレステーブルの共通コンポーネント
function NetworkTable({ table }: Props) {
  return (
    <Panel
      title={table.title}
      titlePlacement="border"
      action={<HelpButton table={table} />}
      flex={{ lg: '1' }}
      minH="0"
    >
      {/* 枠に収まらない場合は表の中だけスクロールする */}
      <Box
        h={{ base: '44', lg: 'auto' }}
        flex={{ lg: '1' }}
        minH="0"
        overflow="auto"
        borderWidth="1px"
        borderColor="gray.100"
        rounded="md"
      >
        <Table.Root size="sm" stickyHeader>
          <Table.Header>
            <Table.Row bg="green.50">
              {table.columns.map((column) => (
                <Table.ColumnHeader key={column} whiteSpace="nowrap" color="gray.700" fontSize="xs">
                  {column}
                </Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {table.rows.map((row, rowIndex) => (
              <Table.Row key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <Table.Cell
                    key={cellIndex}
                    whiteSpace="nowrap"
                    fontFamily="mono"
                    fontSize="xs"
                    color="gray.700"
                  >
                    {cell}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </Panel>
  )
}

function HelpButton({ table }: Props) {
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

export default NetworkTable
