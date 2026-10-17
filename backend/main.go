package main

import (
	"time"
	"log"
	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
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

	r.Use(cors.New(cors.Config{
		// 許可するフロントエンドのオリジン（React開発サーバーのURL）
		AllowOrigins: []string{
			"http://localhost:5173", // Viteデフォルト
			"http://127.0.0.1:5173",
			"http://192.168.64.4:5173", // Create React Appデフォルト
		},
		// 許可するHTTPメソッド
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		// 許可するリクエストヘッダー
		AllowHeaders: []string{
			"Access-Control-Allow-Credentials",
			"Access-Control-Allow-Headers",
			"Content-Type",
			"Content-Length",
			"Accept-Encoding",
			"Authorization",
		},
		// Cookieや認証情報を伴うリクエストを許可する場合
		AllowCredentials: true,
		// プリフライトリクエスト（OPTIONS）の結果をキャッシュする時間
		MaxAge: 12 * time.Hour,
	}))

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
