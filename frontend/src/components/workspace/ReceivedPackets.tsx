import { Button, Text, VStack } from '@chakra-ui/react'
import type { ReceivedPacket } from '../../types/workspace'
import Panel from './Panel'

type Props = {
  packets: ReceivedPacket[]
  selectedId: string | null
  onSelect: (packet: ReceivedPacket) => void
}

function ReceivedPackets({ packets, selectedId, onSelect }: Props) {
  return (
    <Panel title="受信パケット" flexShrink="0">
      {packets.length === 0 ? (
        <Text fontSize="sm" color="gray.500">
          まだパケットは届いていません
        </Text>
      ) : (
        <VStack align="stretch" gap="2" maxH="44" overflow="auto" px={{ base: '0', md: '6' }}>
          {packets.map((packet) => {
            const selected = packet.id === selectedId
            return (
              <Button
                key={packet.id}
                variant="outline"
                colorPalette="green"
                bg={selected ? 'green.50' : 'white'}
                borderColor={selected ? 'green.500' : 'gray.300'}
                color="gray.800"
                fontWeight="normal"
                aria-pressed={selected}
                onClick={() => onSelect(packet)}
              >
                {packet.label}
              </Button>
            )
          })}
        </VStack>
      )}
    </Panel>
  )
}

export default ReceivedPackets
