import { Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { Navigate, useParams } from 'react-router'
import DummyDataNotice from '../components/DummyDataNotice'
import PageLayout from '../components/PageLayout'
import StageWorkspace from '../components/workspace/StageWorkspace'
import { STAGE1_WORKSPACE } from '../data/stage1Workspace'
import { useStages } from '../hooks/useStages'
import type { Stage as StageData } from '../types/stage'

const BACK_TO_STAGES = { to: '/stages', label: 'ステージ選択に戻る' }

function Stage() {
  const { stageId } = useParams()
  const { stages, loading, isDummy } = useStages()

  if (loading) {
    return (
      <PageLayout back={BACK_TO_STAGES}>
        <Spinner size="lg" color="green.500" />
      </PageLayout>
    )
  }

  const index = stages.findIndex((stage) => stage.id === stageId)
  if (index === -1) {
    return <Navigate to="/stages" replace />
  }
  const stage = stages[index]

  // 作業画面は現在ステージ1のみ
  const hasWorkspace = index === 0

  return (
    <PageLayout
      back={BACK_TO_STAGES}
      topRight={<StageInfo stage={stage} stageNumber={index + 1} isDummy={isDummy} />}
      fitViewport={hasWorkspace}
    >
      {hasWorkspace ? (
        <StageWorkspace data={STAGE1_WORKSPACE} />
      ) : (
        <Text color="gray.500">このステージは準備中です</Text>
      )}
    </PageLayout>
  )
}

type StageInfoProps = {
  stage: StageData
  stageNumber: number
  isDummy: boolean
}

// 画面右上に表示するステージ名と説明
function StageInfo({ stage, stageNumber, isDummy }: StageInfoProps) {
  return (
    <VStack align="flex-end" gap="0.5" textAlign="right">
      <HStack gap="2" wrap="wrap" justify="flex-end">
        {isDummy && <DummyDataNotice />}
        <Text fontSize="xs" fontWeight="semibold" color="green.600">
          ステージ{stageNumber}
        </Text>
        <Heading as="h1" size="sm" color="gray.800">
          {stage.title}
        </Heading>
      </HStack>
      <Text fontSize="xs" color="gray.600">
        {stage.description}
      </Text>
    </VStack>
  )
}

export default Stage
