package main

import (
	"log"

	"github.com/gin-gonic/gin"

	// モジュール名に合わせてパスを指定
	"backend/api"
	"backend/db"
)

func main() {
	// DB初期化
	dsn := "host=localhost user=backuser password=backpass dbname=app_db port=5432 sslmode=disable"
	if err := db.InitDB(dsn); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Ginルーターの設定
	r := gin.Default()

	// APIルーティング
	// apiパッケージのエクスポートされた関数をハンドラーとして登録
	r.GET("/getstages", api.GetStages)
	r.GET("/getstages/:stageID", api.GetStageByID)

	// サーバー起動
	log.Println("Server is running on http://localhost:8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
