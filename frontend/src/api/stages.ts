import type { Stage } from '../types/stage'

const GET_STAGES_URL = 'http://localhost:8080/getstages'

export async function fetchStages(signal?: AbortSignal): Promise<Stage[]> {
  const res = await fetch(GET_STAGES_URL, { method: 'GET', signal })
  if (!res.ok) {
    throw new Error(`ステージ一覧の取得に失敗しました (${res.status})`)
  }
  return (await res.json()) as Stage[]
}
