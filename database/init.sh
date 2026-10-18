#!/bin/bash
set -e

# 環境変数 BACKUSER_PASSWORD を埋め込んで SQL を実行
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- 1. テスト用ユーザーの作成（環境変数からパスワードを設定）
    CREATE USER backuser WITH PASSWORD '$BACKUSER_PASSWORD';

    -- 2. テスト用データベースの作成（所有者を backuser に設定）
    CREATE DATABASE app_db OWNER backuser;

    -- テスト用データベースに対する全権限を付与
    GRANT ALL PRIVILEGES ON DATABASE app_db TO backuser;
EOSQL

# 作成した app_db に接続を切り替えてテーブル構築を実行
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "app_db" <<-EOSQL
    -- PostgreSQL 15以降の仕様に対応（publicスキーマのアクセス権限設定）
    GRANT ALL ON SCHEMA public TO backuser;

    -- 3. テスト用テーブルの作成
    CREATE TABLE stages (
        id VARCHAR(50) PRIMARY KEY, -- 例: 'stage-01'
        title VARCHAR(255) NOT NULL,
        description TEXT,
        topology JSONB NOT NULL,    -- トポロジー構造・画面オプションを保存
        scenario JSONB,             -- シナリオ情報（NULL許可）
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- テーブルの所有者を backuser に変更
    ALTER TABLE stages OWNER TO backuser;

    -- 4. テスト用データのインサート
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
              "ports": [{ "id": "eth0", "mac": "aa:bb:cc:ab:cd:ef", "ip": "192.168.1.2/24" }]
            },
            {
              "id": "PC2",
              "type": "pc",
              "ports": [{ "id": "eth0", "mac": "aa:bb:cc:bb:cd:ef", "ip": "192.168.2.2/24" }]
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
          ],
          "options": {
            "routing_table_edit": false,
            "packet_editable_fields": {
              "ping request": ["ethernet.src", "ethernet.dst", "ipv4.src", "ipv4.dst"],
              "ping response": ["ethernet.src", "ethernet.dst", "ipv4.src", "ipv4.dst"]
            }
          },
          "action_buttons": ["ping request", "ping response", "packet all view", "todo list"],
          "mac_table": ["PC1", "PC2"],
          "todo_list": {
            "1": "届いたパケットを解析する",
            "2": "適切なアドレスに転送するようにパケットを作成する",
            "3": "作成したパケットを送信する",
            "4": "新たに届いたパケットを解析する",
            "5": "同様に適切なアドレスに転送するようにパケットを作成する",
            "6": "作成したパケットを送信する"
          }
        }'::jsonb
    );

    UPDATE stages
    SET scenario = '{
      "scenario_id": "scenario-ping-basic",
      "title": "Pingパケットの転送演習",
      "description": "PC1からPC2へのPingリクエストと、PC2からPC1へのPingレスポンスを、送信元/宛先のMACアドレス・IPアドレスを正しく設定して転送してください。",
      "steps": [
        {
          "step": 1,
          "type": "send",
          "description": "初期Pingリクエストパケットを送信",
          "packet": {
            "hex": "aa bb cc dd ee ff aa bb cc ab cd ef 08 00 45 00 00 3c 1c 46 40 00 40 01 9a 26 c0 a8 01 02 c0 a8 02 02 08 00 4d 5a 00 01 00 01 61 62 63 64 65 66 67 68 69 6a 6b 6c 6d 6e 6f 70 71 72 73 74 75 76 77 61 62 63 64 65 66 67 68 69",
            "ethernet": { "dst": "aa:bb:cc:dd:ee:ff", "src": "aa:bb:cc:ab:cd:ef", "type": 2048 },
            "ipv4": { "ver_ihl": 69, "tos": 0, "total_length": 60, "id": 7238, "flags": 16384, "ttl": 64, "protocol": 1, "checksum": 39462, "src": "192.168.1.2", "dst": "192.168.2.2" },
            "icmp": { "type": 8, "code": 0, "checksum": 19802, "id": 1, "seq": 1 },
            "payload": "61 62 63 64 65 66 67 68 69 6a 6b 6c 6d 6e 6f 70 71 72 73 74 75 76 77 61 62 63 64 65 66 67 68 69"
          }
        },
        {
          "step": 2,
          "type": "receive",
          "description": "クライアントからの処理済みPingリクエスト受信待ち"
        },
        {
          "step": 3,
          "type": "evaluate",
          "description": "PingリクエストのMAC・IPアドレスチェック",
          "expected": {
            "ethernet": { "dst": "aa:bb:cc:bb:cd:ef", "src": "aa:bb:cc:aa:ee:ff" },
            "ipv4": { "src": "192.168.1.2", "dst": "192.168.2.2" }
          },
          "check_fields": ["ethernet.src", "ethernet.dst", "ipv4.src", "ipv4.dst"],
          "on_failure_message": "Pingリクエストの送信元または宛先のMACアドレス・IPアドレスが違います。"
        },
        {
          "step": 4,
          "type": "send",
          "description": "正解のため、ターゲット機器からのPing応答パケットを送信",
          "packet": {
            "hex": "aa bb cc aa ee ff aa bb cc bb cd ef 08 00 45 00 00 3c 1c 47 40 00 40 01 9a 25 c0 a8 02 02 c0 a8 01 02 00 00 55 5a 00 01 00 01 61 62 63 64 65 66 67 68 69 6a 6b 6c 6d 6e 6f 70 71 72 73 74 75 76 77 61 62 63 64 65 66 67 68 69",
            "ethernet": { "dst": "aa:bb:cc:aa:ee:ff", "src": "aa:bb:cc:bb:cd:ef", "type": 2048 },
            "ipv4": { "ver_ihl": 69, "tos": 0, "total_length": 60, "id": 7239, "flags": 16384, "ttl": 64, "protocol": 1, "checksum": 39461, "src": "192.168.2.2", "dst": "192.168.1.2" },
            "icmp": { "type": 0, "code": 0, "checksum": 21850, "id": 1, "seq": 1 },
            "payload": "61 62 63 64 65 66 67 68 69 6a 6b 6c 6d 6e 6f 70 71 72 73 74 75 76 77 61 62 63 64 65 66 67 68 69"
          }
        },
        {
          "step": 5,
          "type": "receive",
          "description": "クライアントからの処理済みPing応答受信待ち"
        },
        {
          "step": 6,
          "type": "evaluate",
          "description": "Ping応答のMAC・IPアドレスチェック",
          "expected": {
            "ethernet": { "dst": "aa:bb:cc:ab:cd:ef", "src": "aa:bb:cc:dd:ee:ff" },
            "ipv4": { "src": "192.168.2.2", "dst": "192.168.1.2" }
          },
          "check_fields": ["ethernet.src", "ethernet.dst", "ipv4.src", "ipv4.dst"],
          "on_failure_message": "Ping応答の送信元または宛先のMACアドレス・IPアドレスが違います。"
        }
      ]
    }'::jsonb,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = 'stage-01';
EOSQL
