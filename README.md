# Service Cloud Study Lab

Salesforce Certified Service Cloud Consultant の個人学習用Webアプリです。

## 収録
- v2026-04-28: 116問
- v2026-01-08: 80問
- 合計196問（版ごとの重複問題はそのまま保持）

## 主な機能
- 一問一答
- 日本語訳（オンデマンド翻訳 + ブラウザ保存）
- 解説表示
- 10 / 30 / 60問の模擬試験
- 正答率、回答数、連続正解、分野別成績
- 間違えた問題だけ復習
- お気に入り
- 学習データのJSON書き出し / 読み込み
- ダーク / ライトテーマ

## Vercelへ公開
このフォルダをGitHubリポジトリに入れてVercelでImportするだけです。
フレームワーク設定は `Other` のままで動作します。Build Command / Output Directory の指定は不要です。

Vercel CLIを使う場合は、このフォルダで `vercel` を実行してください。

## データ保存
学習履歴はブラウザの `localStorage` に保存されます。端末を変える場合はアプリ内の「学習データを書き出す」でバックアップしてください。

## 翻訳
`/api/translate` のVercel Functionから日本語訳を取得し、結果をブラウザ側にキャッシュします。翻訳サービス側が利用できない場合は英語原文を表示します。
