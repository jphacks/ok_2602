import { Button, Separator, Text, VStack } from '@chakra-ui/react'
import { useNavigate } from 'react-router'
import type { Stage } from '../types/stage'

type Props = {
  stage: Stage
  stageNumber: number
}

function StageButton({ stage, stageNumber }: Props) {
  const navigate = useNavigate()

  return (
    <Button
      w="full"
      h="full"
      minH="40"
      py="5"
      px="4"
      variant="outline"
      colorPalette="green"
      bg="white"
      shadow="sm"
      whiteSpace="normal"
      _hover={{ bg: 'green.50', shadow: 'md' }}
      onClick={() => navigate(`/stages/${stage.id}`)}
    >
      <VStack gap="2" w="full" h="full" justify="flex-start">
        <Text fontSize="xs" fontWeight="semibold" color="green.600">
          ステージ {stageNumber}
        </Text>
        <Text fontSize="lg" fontWeight="bold" color="gray.800">
          {stage.title}
        </Text>
        <Separator w="full" borderColor="green.100" />
        <Text fontSize="xs" fontWeight="normal" color="gray.600">
          {stage.description}
        </Text>
      </VStack>
    </Button>
  )
}

export default StageButton
