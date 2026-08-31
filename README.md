# Service Cloud Consultant Study Lab

Salesforce Service Cloud Consultant の添付問題集（2026-04-28 / 116問、2026-01-08 / 80問）を使った個人学習用の静的 Web アプリです。

## この版で直したこと

- 日本語訳を全196問分、サイトデータに事前収録
- Google 翻訳などの外部翻訳 API 呼び出しを完全に削除
- `Trailhead`、`Einstein Next Best Action`、`Omni-Channel`、`Agentforce Service Agent` など Salesforce の製品名・機能名は原則として原文維持
- 日本語の文章部分だけ自然な資格学習向け表現に整理
- 問題の学習分類を見直し（現行試験ドメインを参考にした学習用分類）
- PDF 原文に問いかけ文が欠けている問題は、画面上で「原文注意」と明示
- 「EN 原文」で問題文・選択肢・解説を PDF 原文表示へ切替可能
- 正解・解説は添付問題集の記載を基準とし、現行 Salesforce 仕様と異なる可能性がある旨を表示
- 学習履歴は従来と同じ `localStorage` キーを維持するため、同じドメインで上書きデプロイすれば進捗を引き継げます

## Vercel

ビルド不要です。ファイル一式を GitHub リポジトリ直下へ置き、Vercel から Import → Deploy するだけです。

必要なファイル:

- `index.html`
- `app.js`
- `styles.css`
- `questions.json`
- `vercel.json`

環境変数、API キー、データベースは不要です。

## 注意

このアプリは添付された問題集を学習素材として表示します。問題集自体に誤植・欠落・古い仕様が含まれる可能性があります。PDF 原文の欠落が確認できた問題については、その旨を画面上に表示しています。
