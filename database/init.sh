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

    -- 5. stage-02: RIPv2による動的ルーティング
    INSERT INTO stages (id, title, description, topology, scenario)
    VALUES (
        'stage-02',
        'RIPv2による動的ルーティング演習',
        '起動したばかりのルーター(R1)で、隣接ルーターとRIPv2で経路を交換してルーティングテーブルを作り、PC1からPC2へのpingを最短経路で転送します。',
        '{
          "nodes": [
            {
              "id": "R1",
              "type": "router",
              "ports": [
                { "id": "eth0", "mac": "aa:bb:cc:01:00:00", "ip": "192.168.1.1/24" },
                { "id": "eth1", "mac": "aa:bb:cc:01:01:00", "ip": "10.0.0.1/30" },
                { "id": "eth2", "mac": "aa:bb:cc:01:02:00", "ip": "10.0.0.5/30" }
              ]
            },
            {
              "id": "R2",
              "type": "router",
              "ports": [
                { "id": "eth0", "mac": "aa:bb:cc:02:00:00", "ip": "10.0.0.2/30" },
                { "id": "eth1", "mac": "aa:bb:cc:02:01:00", "ip": "10.0.0.9/30" }
              ]
            },
            {
              "id": "R3",
              "type": "router",
              "ports": [
                { "id": "eth0", "mac": "aa:bb:cc:03:00:00", "ip": "10.0.0.6/30" },
                { "id": "eth1", "mac": "aa:bb:cc:03:01:00", "ip": "10.0.0.10/30" },
                { "id": "eth2", "mac": "aa:bb:cc:03:02:00", "ip": "192.168.2.1/24" }
              ]
            },
            {
              "id": "PC1",
              "type": "pc",
              "ports": [{ "id": "eth0", "mac": "aa:bb:cc:10:00:01", "ip": "192.168.1.10/24" }]
            },
            {
              "id": "PC2",
              "type": "pc",
              "ports": [{ "id": "eth0", "mac": "aa:bb:cc:20:00:01", "ip": "192.168.2.10/24" }]
            }
          ],
          "edges": [
            { "id": "edge-1", "source": { "node_id": "R1", "port_id": "eth0" }, "target": { "node_id": "PC1", "port_id": "eth0" } },
            { "id": "edge-2", "source": { "node_id": "R1", "port_id": "eth1" }, "target": { "node_id": "R2", "port_id": "eth0" } },
            { "id": "edge-3", "source": { "node_id": "R1", "port_id": "eth2" }, "target": { "node_id": "R3", "port_id": "eth0" } },
            { "id": "edge-4", "source": { "node_id": "R2", "port_id": "eth1" }, "target": { "node_id": "R3", "port_id": "eth1" } },
            { "id": "edge-5", "source": { "node_id": "R3", "port_id": "eth2" }, "target": { "node_id": "PC2", "port_id": "eth0" } }
          ],
          "options": {
            "routing_table_edit": true,
            "arp_table_edit": true,
            "visible_tables": ["routing", "arp"],
            "packet_editable_fields": {
              "rip request": ["ethernet.src", "ethernet.dst", "ipv4.src", "ipv4.dst", "rip.command", "rip.version"],
              "rip response": ["ethernet.src", "ethernet.dst", "ipv4.src", "ipv4.dst", "rip.command", "rip.version", "rip_entry.address", "rip_entry.mask", "rip_entry.metric"],
              "arp request": ["ethernet.src", "ethernet.dst", "arp.sha", "arp.spa", "arp.tha", "arp.tpa"],
              "packet forward": ["ethernet.src", "ethernet.dst", "ipv4.src", "ipv4.dst", "ipv4.ttl"]
            }
          },
          "action_buttons": ["rip request", "rip response", "arp request", "packet forward", "packet all view", "todo list"],
          "todo_list": {
            "1": "「ルータの情報」で、自分（R1）のeth0〜eth2のIPアドレス・MACアドレスと、隣につながっているルータ（R2・R3）を確認する。ルータ同士のリンクは /30（使えるアドレスは2つだけ）で、アドレスを節約している",
            "2": "ルーティングテーブルを見て、直接つながっているネットワーク（C、AD 0）しか知らず、PC2のいる 192.168.2.0/24 への経路がないことを確認する",
            "3": "「RIPリクエスト」で、eth1からR2へRIPv2リクエストを送る。宛先はRIPv2のマルチキャスト（IP 224.0.0.9 / MAC 01:00:5e:00:00:09）、送信元はeth1のIP・MAC、commandは1（Request）、versionは2",
            "4": "R2から届いたRIPレスポンスを、Ethernet → IP → UDP → RIP の順に解析し、各エントリのネットワーク・サブネットマスク・メトリックと、送信元IPアドレス（ネクストホップ）を確認する",
            "5": "同じように、eth2からR3へRIPv2リクエストを送り、届いたRIPレスポンスを解析する",
            "6": "受け取った経路のメトリックに1を足す。同じネットワークへの経路が複数あればメトリックが小さい方を採用し、同じメトリックなら両方採用する。ただし、すでに直接つながっている（C）ネットワークは、AD 0 が RIP の AD 120 より優先されるので採用しない",
            "7": "採用した経路を、ルーティングテーブルに R / ネットワーク / [120/メトリック] / ネクストホップ（レスポンスの送信元IP）/ 受け取ったインターフェース の形で追加する",
            "8": "「RIPレスポンス」で、自分の経路をeth1からR2へ通知する（宛先は 224.0.0.9、commandは2）。エントリには、R2から学習した経路以外（直接つながっているネットワークはメトリック1、R3から学習した経路は自分のメトリック）を入れる",
            "9": "同じように、eth2からR3へ自分の経路を通知する。R3から学習した経路はR3に送り返さない（スプリットホライズン）",
            "10": "PC1から届いたpingパケットを解析し、宛先IPアドレスに当てはまる経路（ネクストホップと出ていくインターフェース）をルーティングテーブルから探す",
            "11": "ARPテーブルにネクストホップのMACアドレスがないので、「ARPリクエスト」で出ていくインターフェースからネクストホップのMACアドレスを問い合わせる（宛先MACは ff:ff:ff:ff:ff:ff、問い合わせるIPはネクストホップ）",
            "12": "届いたARPリプライを解析し、ネクストホップのMACアドレスをARPテーブルに追加する",
            "13": "「パケット転送」で、送信元MACを出ていくインターフェースのMAC、宛先MACをネクストホップのMACにし、TTLを1減らしてpingパケットを転送する"
          }
        }'::jsonb,
        '{
        "scenario_id": "scenario-rip-basic",
        "title": "RIPv2による動的ルーティング演習",
        "description": "隣接ルータとRIPv2で経路を交換してルーティングテーブルを作り、PC1からPC2へのpingを最短経路で転送する。",
        "steps": [
          { "step": 1, "type": "receive", "description": "eth1からのRIPv2リクエスト受信待ち" },
          {
            "step": 2,
            "type": "evaluate",
            "description": "eth1からのRIPv2リクエストのチェック",
            "expected": {
              "ethernet": { "src": "aa:bb:cc:01:01:00", "dst": "01:00:5e:00:00:09" },
              "ipv4": { "src": "10.0.0.1", "dst": "224.0.0.9", "protocol": 17 },
              "udp": { "dst_port": 520 },
              "rip": { "command": 1, "version": 2 }
            },
            "check_fields": ["ethernet.src", "ethernet.dst", "ipv4.src", "ipv4.dst", "ipv4.protocol", "udp.dst_port", "rip.command", "rip.version"],
            "on_failure_message": "RIPリクエストが違います。eth1のMAC・IPアドレス、RIPv2のマルチキャストアドレス(224.0.0.9 / 01:00:5e:00:00:09)、commandとversionを確認してください。"
          },
          {
            "step": 3,
            "type": "send",
            "description": "R2からのRIPv2レスポンスを送信",
            "packet": {
              "hex": "aa bb cc 01 01 00 aa bb cc 02 00 00 08 00 45 00 00 5c 02 01 40 00 40 11 24 8e 0a 00 00 02 0a 00 00 01 02 08 02 08 00 48 00 00 02 02 00 00 00 02 00 00 0a 00 00 08 ff ff ff fc 00 00 00 00 00 00 00 01 00 02 00 00 0a 00 00 04 ff ff ff fc 00 00 00 00 00 00 00 02 00 02 00 00 c0 a8 02 00 ff ff ff 00 00 00 00 00 00 00 00 02",
              "ethernet": {"dst": "aa:bb:cc:01:01:00", "src": "aa:bb:cc:02:00:00", "type": 2048},
              "ipv4": {"ver_ihl": 69, "tos": 0, "total_length": 92, "id": 513, "flags": 16384, "ttl": 64, "protocol": 17, "checksum": 9358, "src": "10.0.0.2", "dst": "10.0.0.1"},
              "udp": {"src_port": 520, "dst_port": 520, "length": 72, "checksum": 0},
              "rip": {"command": 2, "version": 2, "entries": [{"afi": 2, "route_tag": 0, "address": "10.0.0.8", "mask": "255.255.255.252", "next_hop": "0.0.0.0", "metric": 1}, {"afi": 2, "route_tag": 0, "address": "10.0.0.4", "mask": "255.255.255.252", "next_hop": "0.0.0.0", "metric": 2}, {"afi": 2, "route_tag": 0, "address": "192.168.2.0", "mask": "255.255.255.0", "next_hop": "0.0.0.0", "metric": 2}]},
              "payload": ""
            }
          },
          { "step": 4, "type": "receive", "description": "eth2からのRIPv2リクエスト受信待ち" },
          {
            "step": 5,
            "type": "evaluate",
            "description": "eth2からのRIPv2リクエストのチェック",
            "expected": {
              "ethernet": { "src": "aa:bb:cc:01:02:00", "dst": "01:00:5e:00:00:09" },
              "ipv4": { "src": "10.0.0.5", "dst": "224.0.0.9", "protocol": 17 },
              "udp": { "dst_port": 520 },
              "rip": { "command": 1, "version": 2 }
            },
            "check_fields": ["ethernet.src", "ethernet.dst", "ipv4.src", "ipv4.dst", "ipv4.protocol", "udp.dst_port", "rip.command", "rip.version"],
            "on_failure_message": "RIPリクエストが違います。eth2のMAC・IPアドレス、RIPv2のマルチキャストアドレス(224.0.0.9 / 01:00:5e:00:00:09)、commandとversionを確認してください。"
          },
          {
            "step": 6,
            "type": "send",
            "description": "R3からのRIPv2レスポンスを送信",
            "packet": {
              "hex": "aa bb cc 01 02 00 aa bb cc 03 00 00 08 00 45 00 00 5c 03 01 40 00 40 11 23 86 0a 00 00 06 0a 00 00 05 02 08 02 08 00 48 00 00 02 02 00 00 00 02 00 00 0a 00 00 08 ff ff ff fc 00 00 00 00 00 00 00 01 00 02 00 00 0a 00 00 00 ff ff ff fc 00 00 00 00 00 00 00 02 00 02 00 00 c0 a8 02 00 ff ff ff 00 00 00 00 00 00 00 00 01",
              "ethernet": {"dst": "aa:bb:cc:01:02:00", "src": "aa:bb:cc:03:00:00", "type": 2048},
              "ipv4": {"ver_ihl": 69, "tos": 0, "total_length": 92, "id": 769, "flags": 16384, "ttl": 64, "protocol": 17, "checksum": 9094, "src": "10.0.0.6", "dst": "10.0.0.5"},
              "udp": {"src_port": 520, "dst_port": 520, "length": 72, "checksum": 0},
              "rip": {"command": 2, "version": 2, "entries": [{"afi": 2, "route_tag": 0, "address": "10.0.0.8", "mask": "255.255.255.252", "next_hop": "0.0.0.0", "metric": 1}, {"afi": 2, "route_tag": 0, "address": "10.0.0.0", "mask": "255.255.255.252", "next_hop": "0.0.0.0", "metric": 2}, {"afi": 2, "route_tag": 0, "address": "192.168.2.0", "mask": "255.255.255.0", "next_hop": "0.0.0.0", "metric": 1}]},
              "payload": ""
            }
          },
          { "step": 7, "type": "receive", "description": "eth1からR2へのRIPv2レスポンス受信待ち" },
          {
            "step": 8,
            "type": "evaluate",
            "description": "eth1から通知する経路のチェック",
            "expected": {
              "ethernet": { "src": "aa:bb:cc:01:01:00", "dst": "01:00:5e:00:00:09" },
              "ipv4": { "src": "10.0.0.1", "dst": "224.0.0.9", "protocol": 17 },
              "udp": { "dst_port": 520 },
              "rip": {
                "command": 2,
                "version": 2,
                "entries": [
                  { "address": "192.168.1.0", "mask": "255.255.255.0", "metric": 1 },
                  { "address": "10.0.0.4", "mask": "255.255.255.252", "metric": 1 },
                  { "address": "192.168.2.0", "mask": "255.255.255.0", "metric": 2 }
                ]
              }
            },
            "check_fields": ["ethernet.src", "ethernet.dst", "ipv4.src", "ipv4.dst", "ipv4.protocol", "udp.dst_port", "rip.command", "rip.version", "rip.entries"],
            "on_failure_message": "R2へのRIPレスポンスが違います。eth1のアドレス・commandと、R2に通知すべき経路(ネットワーク・サブネットマスク・メトリック)を確認してください。"
          },
          { "step": 9, "type": "receive", "description": "eth2からR3へのRIPv2レスポンス受信待ち" },
          {
            "step": 10,
            "type": "evaluate",
            "description": "eth2から通知する経路のチェック(スプリットホライズン)",
            "expected": {
              "ethernet": { "src": "aa:bb:cc:01:02:00", "dst": "01:00:5e:00:00:09" },
              "ipv4": { "src": "10.0.0.5", "dst": "224.0.0.9", "protocol": 17 },
              "udp": { "dst_port": 520 },
              "rip": {
                "command": 2,
                "version": 2,
                "entries": [
                  { "address": "192.168.1.0", "mask": "255.255.255.0", "metric": 1 },
                  { "address": "10.0.0.0", "mask": "255.255.255.252", "metric": 1 }
                ]
              }
            },
            "unexpected": { "rip": { "entries": [{ "address": "192.168.2.0", "mask": "255.255.255.0", "metric": 2 }] } },
            "check_fields": ["ethernet.src", "ethernet.dst", "ipv4.src", "ipv4.dst", "ipv4.protocol", "udp.dst_port", "rip.command", "rip.version", "rip.entries"],
            "on_failure_message": "R3へのRIPレスポンスが違います。eth2のアドレス・commandと、R3に通知すべき経路を確認してください。R3から学習した経路をR3に送り返していませんか？(スプリットホライズン)"
          },
          {
            "step": 11,
            "type": "send",
            "description": "PC1からPC2宛てのpingリクエストを送信",
            "packet": {
              "hex": "aa bb cc 01 00 00 aa bb cc 10 00 01 08 00 45 00 00 3c 2a 01 40 00 40 01 8c 5b c0 a8 01 0a c0 a8 02 0a 08 00 4d 5a 00 01 00 01 61 62 63 64 65 66 67 68 69 6a 6b 6c 6d 6e 6f 70 71 72 73 74 75 76 77 61 62 63 64 65 66 67 68 69",
              "ethernet": {"dst": "aa:bb:cc:01:00:00", "src": "aa:bb:cc:10:00:01", "type": 2048},
              "ipv4": {"ver_ihl": 69, "tos": 0, "total_length": 60, "id": 10753, "flags": 16384, "ttl": 64, "protocol": 1, "checksum": 35931, "src": "192.168.1.10", "dst": "192.168.2.10"},
              "icmp": {"type": 8, "code": 0, "checksum": 19802, "id": 1, "seq": 1},
              "payload": "61 62 63 64 65 66 67 68 69 6a 6b 6c 6d 6e 6f 70 71 72 73 74 75 76 77 61 62 63 64 65 66 67 68 69"
            }
          },
          { "step": 12, "type": "receive", "description": "ネクストホップのARPリクエスト受信待ち" },
          {
            "step": 13,
            "type": "evaluate",
            "description": "ネクストホップ(10.0.0.6)へのARPリクエストのチェック",
            "expected": {
              "ethernet": { "src": "aa:bb:cc:01:02:00", "dst": "ff:ff:ff:ff:ff:ff" },
              "arp": { "op": 1, "sha": "aa:bb:cc:01:02:00", "spa": "10.0.0.5", "tpa": "10.0.0.6" }
            },
            "check_fields": ["ethernet.src", "ethernet.dst", "arp.op", "arp.sha", "arp.spa", "arp.tpa"],
            "on_failure_message": "ARPリクエストが違います。ネクストホップのIPアドレス、出ていくインターフェースのアドレス、ブロードキャストの宛先MACアドレスを確認してください。"
          },
          {
            "step": 14,
            "type": "send",
            "description": "R3からのARPリプライを送信",
            "packet": {
              "hex": "aa bb cc 01 02 00 aa bb cc 03 00 00 08 06 00 01 08 00 06 04 00 02 aa bb cc 03 00 00 0a 00 00 06 aa bb cc 01 02 00 0a 00 00 05",
              "ethernet": {"dst": "aa:bb:cc:01:02:00", "src": "aa:bb:cc:03:00:00", "type": 2054},
              "arp": {"htype": 1, "ptype": 2048, "hlen": 6, "plen": 4, "op": 2, "sha": "aa:bb:cc:03:00:00", "spa": "10.0.0.6", "tha": "aa:bb:cc:01:02:00", "tpa": "10.0.0.5"},
              "payload": ""
            }
          },
          { "step": 15, "type": "receive", "description": "転送されたpingリクエスト受信待ち" },
          {
            "step": 16,
            "type": "evaluate",
            "description": "pingリクエストの転送先チェック",
            "expected": {
              "ethernet": { "src": "aa:bb:cc:01:02:00", "dst": "aa:bb:cc:03:00:00" },
              "ipv4": { "src": "192.168.1.10", "dst": "192.168.2.10", "ttl": 63 }
            },
            "check_fields": ["ethernet.src", "ethernet.dst", "ipv4.src", "ipv4.dst", "ipv4.ttl"],
            "on_failure_message": "pingの転送が違います。メトリックが最小の経路のネクストホップへ、正しいMACアドレスで転送しているか、TTLを1減らしているかを確認してください。"
          }
        ]
      }'::jsonb
    );
EOSQL
