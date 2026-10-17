package db

import (
	"database/sql"
	"time"

	_ "github.com/lib/pq"
)

var DB *sql.DB

// InitDB はデータベース接続とコネクションプールの設定を行います
func InitDB(dsn string) error {
	var err error
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		return err
	}

	// コネクションプールのチューニング設定
	DB.SetMaxOpenConns(25)                 // データベースへの最大同時接続数
	DB.SetMaxIdleConns(25)                 // 保持する最大アイドル接続数
	DB.SetConnMaxLifetime(5 * time.Minute) // 接続を再利用する最大期間（これを超えると破棄して再接続）
	DB.SetConnMaxIdleTime(5 * time.Minute) // アイドル状態の接続を保持する最大期間

	return DB.Ping()
}

// ExecuteQuery は任意のSQLクエリと引数を受け取り、結果をJSON用マップスライスとして返します
func ExecuteQuery(query string, args ...interface{}) ([]map[string]interface{}, error) {
	rows, err := DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	var result []map[string]interface{}

	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, err
		}

		rowMap := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				rowMap[col] = string(b)
			} else {
				rowMap[col] = val
			}
		}
		result = append(result, rowMap)
	}

	if result == nil {
		result = []map[string]interface{}{}
	}

	return result, nil
}
