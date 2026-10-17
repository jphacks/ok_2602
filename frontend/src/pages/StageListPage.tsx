import { Heading, SimpleGrid, Spinner } from '@chakra-ui/react'
import { PageLayout } from '../components/PageLayout'
import { SampleDataBadge, StageButton } from '../components/ui'
import { useStages } from '../stage/api'

// ステージ選択画面（/stages）。ステージ番号は一覧の順番（index + 1）
export function StageListPage() {
  const { stages, isLoading, isSample } = useStages()

  return (
    <PageLayout back={{ to: '/', label: 'ホームに戻る' }}>
      <Heading as="h1" size={{ base: '2xl', md: '4xl' }} color="gray.800" mb="2">
        ステージ選択
      </Heading>
      {isSample && <SampleDataBadge />}
      {isLoading ? (
        <Spinner size="lg" color="green.500" />
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap="4" w="full" maxW="5xl">
          {stages.map((stage, index) => (
            <StageButton key={stage.id} stage={stage} stageNumber={index + 1} />
          ))}
        </SimpleGrid>
      )}
    </PageLayout>
  )
}
