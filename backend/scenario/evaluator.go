package scenario

import (
	"encoding/json"
	"fmt"

	"backend/model"
)

// ComparePacket は指定されたフィールドのみ比較・検証する
func EvaluatePacket(actual *model.PacketJson, step model.Step) (bool, string) {
	// actual (PacketJson) を map[string]interface{} に変換して柔軟にアクセス可能にする
	actualBytes, err := json.Marshal(actual)
	if err != nil {
		return false, "受信パケットの解析に失敗しました"
	}

	var actualMap map[string]interface{}
	if err := json.Unmarshal(actualBytes, &actualMap); err != nil {
		return false, "受信パケットのデータ変換に失敗しました"
	}

	// 指定された各フィールドをチェック
	for _, fieldPath := range step.CheckFields {
		actVal, actOk := getNestedValue(actualMap, fieldPath)
		expVal, expOk := getNestedValue(step.Expected, fieldPath)

		if !expOk {
			continue // 期待値に設定がない場合はスキップ
		}
		// 配列 (rip.entries など) は、期待する要素がすべて含まれ、unexpected の要素が1つも含まれていなければ一致とする
		if expList, isList := expVal.([]interface{}); isList {
			actList, _ := actVal.([]interface{})
			unexpList, _ := getNestedList(step.Unexpected, fieldPath)
			if containsAll(actList, expList) && !containsAny(actList, unexpList) {
				continue
			}
			actOk = false
		}
		if !actOk || actVal != expVal {
			msg := step.OnFailureMessage
			if msg == "" {
				msg = fmt.Sprintf("フィールド %s の値が不一致です。(期待値: %v, 実際: %v)", fieldPath, expVal, actVal)
			}
			return false, msg
		}
	}

	return true, "正解です！"
}

func getNestedList(m map[string]interface{}, path string) ([]interface{}, bool) {
	value, ok := getNestedValue(m, path)
	list, isList := value.([]interface{})
	return list, ok && isList
}

// item (map) に書かれたキーの値がすべて一致する要素が list にあるか
func containsItem(list []interface{}, item interface{}) bool {
	want, ok := item.(map[string]interface{})
	if !ok {
		return false
	}
	for _, element := range list {
		got, ok := element.(map[string]interface{})
		matched := ok
		for key, value := range want {
			matched = matched && got[key] == value
		}
		if matched {
			return true
		}
	}
	return false
}

func containsAll(list, items []interface{}) bool {
	for _, item := range items {
		if !containsItem(list, item) {
			return false
		}
	}
	return true
}

func containsAny(list, items []interface{}) bool {
	for _, item := range items {
		if containsItem(list, item) {
			return true
		}
	}
	return false
}

// ドット区切り文字列 ("ethernet.src" など) でネストしたMapの値を掘り下げるヘルパー関数
func getNestedValue(m map[string]interface{}, path string) (interface{}, bool) {
	var current interface{} = m
	parts := splitPath(path)

	for _, part := range parts {
		currMap, ok := current.(map[string]interface{})
		if !ok {
			return nil, false
		}
		val, exists := currMap[part]
		if !exists {
			return nil, false
		}
		current = val
	}
	return current, true
}

func splitPath(path string) []string {
	var result []string
	var current string
	for i := 0; i < len(path); i++ {
		if path[i] == '.' {
			result = append(result, current)
			current = ""
		} else {
			current += string(path[i])
		}
	}
	if current != "" {
		result = append(result, current)
	}
	return result
}
