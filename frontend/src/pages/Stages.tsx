import { Heading, SimpleGrid, Spinner } from '@chakra-ui/react'
import DummyDataNotice from '../components/DummyDataNotice'
import PageLayout from '../components/PageLayout'
import StageButton from '../components/StageButton'
import { useStages } from '../hooks/useStages'

function Stages() {
  const { stages, loading, isDummy } = useStages()

  return (
    <PageLayout back={{ to: '/', label: 'ホームに戻る' }}>
      <Heading as="h1" size={{ base: '2xl', md: '4xl' }} color="gray.800" mb="2">
        ステージ選択
      </Heading>
      {isDummy && <DummyDataNotice />}
      {loading ? (
        <Spinner size="lg" color="green.500" />
      ) : (
        <SimpleGrid
          columns={{ base: 1, sm: 2, md: 3, lg: 4 }}
          gap="4"
          w="full"
          maxW="5xl"
        >
          {stages.map((stage, index) => (
            <StageButton key={stage.id} stage={stage} stageNumber={index + 1} />
          ))}
        </SimpleGrid>
      )}
    </PageLayout>
  )
}

export default Stages
