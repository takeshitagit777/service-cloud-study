# Service Cloud Consultant Cert Lab - 196問 日本語版

Salesforce Service Cloud Consultant の学習用静的Webサイトです。

## 収録内容

- `2026-01-08版`: 80問
- `2026-04-28版`: 116問
- 合計: **196問**
- 2つの版で重複する問題も削除せず、出典ごとに別問題として収録
- 問題文・選択肢・解説は日本語化
- Salesforce / Agentforce / Apex / REST API / Slack など、固有の製品名・技術名は必要に応じて原表記を保持

## 主な機能

- 一問一答
- 2026-01-08版 / 2026-04-28版で絞り込み
- 未回答・間違い・お気に入り・分野別フィルター
- 60問ランダム模擬試験（105分）
- 間違い復習
- 分野別・出典別の学習分析
- 196問の問題バンク検索
- 学習履歴をブラウザの `localStorage` に保存
- UIはダークモード固定

## ファイル構成

```text
.
├── index.html
├── styles.css
├── app.js
├── data/
│   └── questions.js
├── vercel.json
├── .gitignore
└── README.md
```

ビルドツールやNode.js依存はありません。静的ファイルだけで動作します。

## ローカルで確認

Pythonがある場合:

```bash
python -m http.server 8000
```

ブラウザで `http://localhost:8000` を開きます。

## GitHubへアップロード

新しいGitHubリポジトリを作成後、このフォルダー内で実行します。

```bash
git init
git add .
git commit -m "Initial Service Cloud Consultant study site"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPO.git
git push -u origin main
```

## Vercelへデプロイ

1. Vercelで **Add New > Project** を選択
2. 上記GitHubリポジトリをImport
3. Framework Presetは **Other** のままでOK
4. Build Command / Output Directory は未設定でOK
5. **Deploy**

以後は `main` ブランチへpushするとVercelが自動再デプロイします。

## 問題データを更新する場所

`data/questions.js` の `window.QUESTIONS` 配列が問題データです。

各問題は出典ごとに一意のIDを持っています。

- 80問版: `JAN80-Q001` ～ `JAN80-Q080`
- 116問版: `APR116-Q001` ～ `APR116-Q116`

このため、同一内容の問題が両方のPDFに存在しても学習履歴が混ざりません。


## テーマ
UIはダークモード固定です。ライトモード切り替えはありません。
