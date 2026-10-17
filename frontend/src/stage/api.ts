import { useEffect, useState } from 'react'
import { SAMPLE_STAGES } from '../data/sampleStages'
import testStage01 from '../test-data/stage-01.json'
import type { Stage } from './types'

// ステージ情報の取得（GET /getstages と GET /getstages/:stageID）

const STAGES_URL = 'http://localhost:8080/getstages'

// 【テスト用・後で削除】一覧の末尾に足す、options / action_buttons の動作確認用ステージ。
// 削除するときは src/test-data フォルダとこの行・import を消す
const TEST_STAGES = [testStage01] as Stage[]

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`ステージ情報の取得に失敗しました (${response.status}): ${url}`)
  return (await response.json()) as T
}

export const fetchStages = (signal: AbortSignal) => fetchJson<Stage[]>(STAGES_URL, signal)

export async function fetchStage(stageId: string, signal: AbortSignal): Promise<Stage> {
  const stage = await fetchJson<Stage & { topology?: unknown }>(`${STAGES_URL}/${encodeURIComponent(stageId)}`, signal)
  // JSONB の列が文字列のまま届く場合に備えてパースする
  if (typeof stage.topology === 'string') stage.topology = JSON.parse(stage.topology)
  return stage as Stage
}

// ステージ一覧。取得できなければサンプルデータを使う
export function useStages() {
  const [state, setState] = useState({ stages: [] as Stage[], isLoading: true, isSample: false })

  useEffect(() => {
    const controller = new AbortController()
    fetchStages(controller.signal)
      .then((stages) => setState({ stages: [...stages, ...TEST_STAGES], isLoading: false, isSample: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.warn('ステージ一覧の取得に失敗したためサンプルデータを使用します', error)
        setState({ stages: [...SAMPLE_STAGES, ...TEST_STAGES], isLoading: false, isSample: true })
      })
    return () => controller.abort()
  }, [])

  return state
}

// 一覧のステージに topology がなければ、詳細を取得する
// （サンプルデータ・テスト用データははじめから詳細を持っているので取得しない）
export function useStageDetail(summary: Stage | undefined) {
  const needsFetch = !!summary && !summary.topology
  const [fetched, setFetched] = useState<{ id: string; stage: Stage | null } | null>(null)

  useEffect(() => {
    if (!summary || !needsFetch) return
    const controller = new AbortController()
    fetchStage(summary.id, controller.signal)
      .then((stage) => setFetched({ id: summary.id, stage }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.warn('ステージ情報の取得に失敗しました', error)
        setFetched({ id: summary.id, stage: null })
      })
    return () => controller.abort()
  }, [summary, needsFetch])

  if (!summary || !needsFetch) return { stage: summary ?? null, isLoading: false, hasError: false }
  if (fetched?.id !== summary.id) return { stage: null, isLoading: true, hasError: false }
  return { stage: fetched.stage, isLoading: false, hasError: !fetched.stage }
}
