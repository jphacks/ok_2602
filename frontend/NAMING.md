# 命名規則（frontend）

迷ったら「初めて読む人が、名前だけで中身を想像できるか」で決める。

## 1. 名前の品詞
| 対象 | 形 | 例 |
|---|---|---|
| 値・型・コンポーネント | 名詞 | `packet`, `PacketDraft`, `TablePanel` |
| 関数 | 動詞 + 目的語 | `buildWorkspace`, `parseMac` |
| 真偽値・真偽値を返す関数 | `is` / `has` / `can` + 形容詞・名詞 | `isComplete`, `canAutoFill` |
| イベントを受け取る props | `on` + 動詞 | `onChange`, `onSelect` |
| React Hooks | `use` + 名詞 | `useStages` |

## 2. 動詞は意味ごとに1つに固定する
| 動詞 | 意味 |
|---|---|
| `parse` / `format` | 文字列・バイト列 → 値 / 値 → 表示用の文字列 |
| `build` | 部品を組み立てて新しいデータを作る |
| `resolve` | ステージ JSON などの未検証の値を、検証して既定値で補う |
| `fetch` | サーバーから取得する |
| `create` | 初期状態の値を作る |
| `get` / `calculate` | 既存のデータから取り出す / 計算して求める |

## 3. 同じものには同じ単語を使う
| 単語 | 指すもの |
|---|---|
| stage | ステージ情報（バックエンドの JSON） |
| workspace | ステージのプレイ画面（ルータの作業画面）とそのデータ |
| table | ルーティング / ARP / MAC アドレステーブル |
| packet | 受信・作成する Ethernet フレーム全体 |
| layer / field | パケットの層（Ethernet・ARP・IPv4） / 層の中の項目 |
| draft | 作成途中のパケット |
| sample | サーバーにつながらないときの代わりのデータ |

## 4. 書き方
- 型・コンポーネント・画面は `PascalCase`（画面は `〜Page`）、それ以外は `camelCase`、固定の定数は `UPPER_SNAKE_CASE`。
- バックエンドとやり取りする JSON のキーと、ステージ JSON に書く値（options のキーなど）は `snake_case`。
- 略語は使わない。ただし一般的な `id` `ip` `mac` `hex` `api` は使ってよい。`p` `e` `l` のような1文字の名前も使わない。
- ファイル名は、そのファイルの主な export 名にする。ファイルはすべて名前付き export にする。
