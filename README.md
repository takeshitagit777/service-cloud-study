# Service Cloud Consultant Cert Lab - 342問 日本語版

Salesforce Service Cloud Consultant の学習用静的Webサイトです。GitHubへpushし、Vercelでそのまま静的デプロイできます。

## 収録問題

| 出典 | 問題数 | ID |
|---|---:|---|
| 2026-01-08版 | 80問 | `JAN80-Q001` ～ `JAN80-Q080` |
| 2026-04-28版 | 116問 | `APR116-Q001` ～ `APR116-Q116` |
| 2024-05-23版 | 117問 | `MAY24-Q001` ～ `MAY24-Q117` |
| 追加問題集 | 29問 | `EXTRA29-Q001` ～ `EXTRA29-Q029` |
| **合計** | **342問** | |

同じ内容の問題が別PDFに含まれる場合も、勝手に削除せず出典別の問題として保持しています。

## 日本語化方針

- 問題文・選択肢・全体解説を日本語化
- 各選択肢に「なぜ正しい / なぜ違う」の解説を収録
- 日本語のSalesforce公式・一般用語があるものは日本語を優先
- Salesforce / Agentforce / Apex / Slack などの製品・技術固有名は必要に応じて原表記を保持
- 古い問題に出る `Live Agent`、`Customer Community`、`Process Builder` などは、出題当時の意味を残しつつ現行名称・旧機能であることを補足
- 元問題の正答と現行仕様の整合性に注意が必要な設問には警告メモを表示

## 主な機能

- 342問の一問一答
- **単一選択 / 複数選択（2つ選択・3つ選択）対応**
- 未回答・間違い・お気に入り・分野別・出典別フィルター
- 10問ミニ模試（18分）
- 60問本番模試（105分）
- 合格ライン78%で自動判定
  - 10問: 8問以上
  - 60問: 47問以上
- 模試中は正解を隠し、採点後に全選択肢の解説を表示
- 間違い復習
- 分野別・出典別の学習分析
- 342問の問題バンク検索
- **Service Cloud単語集 89語**
  - 日本語名 / 英語名
  - 機能の意味
  - 試験での見分け方
  - カテゴリ検索
  - キーワード検索
  - 関連問題件数
  - 単語から関連問題だけを出題
- 学習履歴をブラウザの `localStorage` に保存
- UIはダークモード固定

## ファイル構成

```text
.
├── index.html
├── styles.css
├── app.js
├── data/
│   ├── questions.js   # 342問
│   └── glossary.js    # Service Cloud単語集
├── vercel.json
├── .gitignore
└── README.md
```

ビルドツールやNode.jsランタイムは不要です。通常の静的ファイルとして動作します。

## ローカル確認

```bash
python -m http.server 8000
```

`http://localhost:8000` をブラウザで開きます。

## GitHubへアップロード

```bash
git init
git add .
git commit -m "Add Service Cloud Consultant 342-question study app"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPO.git
git push -u origin main
```

既存リポジトリへ上書きする場合は、このフォルダーの中身で既存ファイルを置き換えてから `git add / commit / push` してください。

## Vercelへデプロイ

1. Vercelで **Add New > Project**
2. GitHubリポジトリをImport
3. Framework Preset: **Other**
4. Build Command: 未設定
5. Output Directory: 未設定
6. Deploy

以後は `main` ブランチへpushするとVercelが自動再デプロイします。

## 学習履歴

保存キーは `serviceCloudConsultant342Ja_v1` です。

旧196問版の `serviceCloudConsultant196Ja_v1` がブラウザに残っている場合、新342問版を初めて開いた際に旧196問分の学習履歴を自動移行します。追加146問は未回答として開始します。

## 問題データの更新

`data/questions.js` の `window.QUESTIONS` が問題データです。

主なフィールド:

```js
{
  id,
  source,
  sourceLabel,
  sourceQuestion,
  category,
  concept,
  question,
  choices,
  answers,          // 正答インデックス配列。複数選択対応
  multiple,
  selectCount,
  explanation,
  choiceExplanations,
  reviewNote        // 必要な問題のみ
}
```

## 単語集の更新

`data/glossary.js` の `window.GLOSSARY` が単語データです。

```js
{
  id,
  jp,
  en,
  category,
  summary,
  examTip,
  aliases
}
```

関連問題は `jp / en / aliases` を使って問題データから自動抽出します。
