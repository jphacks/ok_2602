-- 1. テスト用ユーザーの作成
CREATE USER backuser WITH PASSWORD 'backpass';

-- 2. テスト用データベースの作成（所有者を test_user に設定）
CREATE DATABASE app_db OWNER backuser;

-- テスト用データベースに対する全権限を付与
GRANT ALL PRIVILEGES ON DATABASE app_db TO backuser;

-- 3. 作成したテスト用データベースに接続を切り替え
\c app_db

-- PostgreSQL 15以降の仕様に対応（publicスキーマのアクセス権限設定）
GRANT ALL ON SCHEMA public TO backuser;

-- 4. テスト用テーブルの作成
CREATE TABLE stages (
    id VARCHAR(50) PRIMARY KEY, -- 例: 'stage-01'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    topology JSONB NOT NULL,    -- 上記のJSON構造をそのまま保存
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- テーブルの所有者を test_user に変更
ALTER TABLE stages OWNER TO backuser;

-- 5. テスト用データのインサート
INSERT INTO stages (id, title, description, topology)
VALUES (
    'stage-01',
    '基本ルーター接続演習',
    'ルーター1台と2台のPCが異なるサブネットで接続された基本的なネットワーク構成です。',
    '{
      "nodes": [
        {
          "id": "router1",
          "type": "router",
          "ports": [
            { "id": "eth0", "mac": "aa:bb:cc:dd:ee:ff", "ip": "192.168.1.1/24" },
            { "id": "eth1", "mac": "aa:bb:cc:aa:ee:ff", "ip": "192.168.2.1/24" }
          ]
        },
        {
          "id": "PC1",
          "type": "pc",
          "ports": [
            { "id": "eth0", "mac": "aa:bb:cc:ab:cd:ef", "ip": "192.168.1.2/24" }
          ]
        },
        {
          "id": "PC2",
          "type": "pc",
          "ports": [
            { "id": "eth0", "mac": "aa:bb:cc:bb:cd:ef", "ip": "192.168.2.2/24" }
          ]
        }
      ],
      "edges": [
        {
          "id": "edge-1",
          "source": { "node_id": "router1", "port_id": "eth0" },
          "target": { "node_id": "PC1", "port_id": "eth0" }
        },
        {
          "id": "edge-2",
          "source": { "node_id": "router1", "port_id": "eth1" },
          "target": { "node_id": "PC2", "port_id": "eth0" }
        }
      ]
    }'::jsonb
);
