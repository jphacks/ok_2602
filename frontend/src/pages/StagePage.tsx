import { Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router'
import { PageLayout } from '../components/PageLayout'
import { SampleDataBadge } from '../components/ui'
import { useStageDetail, useStages } from '../stage/api'
import { buildWorkspace } from '../stage/buildWorkspace'
import { StageWorkspace } from '../workspace/StageWorkspace'

const BACK_TO_STAGES = { to: '/stages', label: 'ステージ選択に戻る' }

// ステージのプレイ画面（/stages/:stageId）。知らない id はステージ選択に戻す
export function StagePage() {
  const { stageId } = useParams()
  const { stages, isLoading, isSample } = useStages()
  const index = stages.findIndex((stage) => stage.id === stageId)
  const detail = useStageDetail(stages[index])
  // 作業画面はトポロジーにルータがあるステージで、ステージ情報から作る
  const workspace = useMemo(() => detail.stage && buildWorkspace(detail.stage), [detail.stage])

  if (isLoading || detail.isLoading) {
    return (
      <PageLayout back={BACK_TO_STAGES}>
        <Spinner size="lg" color="green.500" />
      </PageLayout>
    )
  }
  if (index === -1) return <Navigate to="/stages" replace />
  const stage = stages[index]

  return (
    <PageLayout
      back={BACK_TO_STAGES}
      fitViewport={!!workspace}
      topRight={
        // 画面右上に表示するステージ名と説明
        <VStack align="flex-end" gap="0.5" textAlign="right">
          <HStack gap="2" wrap="wrap" justify="flex-end">
            {isSample && <SampleDataBadge />}
            <Text fontSize="xs" fontWeight="semibold" color="green.600">
              ステージ{index + 1}
            </Text>
            <Heading as="h1" size="sm" color="gray.800">
              {stage.title}
            </Heading>
          </HStack>
          <Text fontSize="xs" color="gray.600">
            {stage.description}
          </Text>
        </VStack>
      }
    >
      {workspace && detail.stage ? (
        <StageWorkspace
          key={detail.stage.id}
          workspace={workspace}
          rawOptions={detail.stage.options}
          rawActionButtons={detail.stage.action_buttons}
        />
      ) : (
        <Text color="gray.500">{detail.hasError ? 'ステージ情報を取得できませんでした' : 'このステージは準備中です'}</Text>
      )}
    </PageLayout>
  )
}
