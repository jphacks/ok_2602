-- 1. テスト用ユーザーの作成
CREATE USER test_user WITH PASSWORD 'test_password';

-- 2. テスト用データベースの作成（所有者を test_user に設定）
CREATE DATABASE test_db OWNER test_user;

-- テスト用データベースに対する全権限を付与
GRANT ALL PRIVILEGES ON DATABASE test_db TO test_user;

-- 3. 作成したテスト用データベースに接続を切り替え
\c test_db

-- PostgreSQL 15以降の仕様に対応（publicスキーマのアクセス権限設定）
GRANT ALL ON SCHEMA public TO test_user;

-- 4. テスト用テーブルの作成
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- テーブルの所有者を test_user に変更
ALTER TABLE users OWNER TO test_user;

-- 5. テスト用データのインサート
INSERT INTO users (name, email) VALUES
    ('Alice', 'alice@example.com'),
    ('Bob', 'bob@example.com'),
    ('Charlie', 'charlie@example.com');
