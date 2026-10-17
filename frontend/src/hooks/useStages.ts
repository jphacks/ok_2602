import { useEffect, useState } from 'react'
import { fetchStages } from '../api/stages'
import { DUMMY_STAGES } from '../data/dummyStages'
import type { Stage } from '../types/stage'

type StagesState = {
  stages: Stage[]
  loading: boolean
  // バックエンドから取得できずダミーデータを表示しているか
  isDummy: boolean
}

export function useStages(): StagesState {
  const [state, setState] = useState<StagesState>({
    stages: [],
    loading: true,
    isDummy: false,
  })

  useEffect(() => {
    const controller = new AbortController()

    fetchStages(controller.signal)
      .then((stages) => setState({ stages, loading: false, isDummy: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.warn('ステージ一覧の取得に失敗したためダミーデータを使用します', error)
        setState({ stages: DUMMY_STAGES, loading: false, isDummy: true })
      })

    return () => controller.abort()
  }, [])

  return state
}
