import { WORKSPACE_TODOS } from '../data/workspaceText'
import type { TodoItem } from './types'

// ステージ JSON の "todo_list"（{ "項番": "やること" }）を、項番の順に並べたやることリストにする。
// 項番は "2" < "10" のように数として比べる（"2-1" のような書き方も可）。
// 値が文字列でない項目は警告して無視し、1つも残らなければ共通のやることリスト（WORKSPACE_TODOS）を使う
export function resolveTodoList(raw: unknown): TodoItem[] {
  const items: TodoItem[] = []
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [number, text] of Object.entries(raw)) {
      if (typeof text === 'string' && text.trim()) items.push({ number, text: text.trim() })
      else console.warn('todo_list: 文字列でない項目を無視しました', number, text)
    }
  } else if (raw !== undefined && raw !== null) {
    console.warn('todo_list: { "項番": "やること" } の形ではないため無視しました', raw)
  }
  if (items.length === 0) return WORKSPACE_TODOS.map((text, index) => ({ number: String(index + 1), text }))
  return items.sort((first, second) => first.number.localeCompare(second.number, undefined, { numeric: true }))
}
