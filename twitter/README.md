# onaka — シンプルつぶやきアプリ

X風のとてもシンプルなつぶやきアプリです。
- メール + パスワードでログイン / 新規登録（2段階認証なし）
- ログイン後、最大280文字でつぶやきを投稿
- フィードに新しい順で表示（リアルタイム更新）

技術: Vanilla HTML/CSS/JS + [Supabase](https://supabase.com)（Auth + Postgres）

---

## セットアップ

### 1. Supabase プロジェクトを用意

1. https://supabase.com でプロジェクトを作成
2. 左メニュー **SQL Editor** で `supabase/schema.sql` の内容を貼り付けて実行
   - `tweets` テーブルと RLS ポリシー、Realtime 設定が作成されます
3. 左メニュー **Authentication → Providers → Email** で「Email」を有効化
   - 動作確認を簡単にしたい場合は「Confirm email」をオフにしてもOK
4. **Project Settings → API** から以下をコピー
   - `Project URL` （= SUPABASE_URL）
   - `anon` `public` の API key （= SUPABASE_ANON_KEY）

### 2. ローカルで動かす場合

```bash
cp twitter/config.example.js twitter/config.js
# twitter/config.js を開いて URL と anon key を貼り付け
```

任意の静的サーバで `twitter/index.html` を開けばOK。例:
```bash
python3 -m http.server 8000
# → http://localhost:8000/twitter/
```

> `twitter/config.js` は `.gitignore` で除外されているので、誤ってコミットされません。

### 3. GitHub Pages にデプロイ

1. GitHub リポジトリの **Settings → Secrets and variables → Actions → New repository secret** で以下を追加
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
2. **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に変更
3. `main` ブランチに push（または Actions タブから `Deploy to GitHub Pages` を手動実行）
4. デプロイ完了後、`https://<ユーザー名>.github.io/<リポジトリ名>/twitter/` でアクセスできます

ワークフローはビルド時に Secrets から `twitter/config.js` を生成するため、リポジトリにキーは保存されません。

---

## ファイル構成

```
twitter/
├── index.html         # 画面
├── style.css          # スタイル
├── app.js             # ロジック（認証 / 投稿 / フィード）
├── config.example.js  # config.js の雛形
└── config.js          # ★Supabase URL / anon key（gitignore 済み）

supabase/
└── schema.sql         # tweets テーブル + RLS ポリシー

.github/workflows/
└── deploy.yml         # Pages デプロイ用 GitHub Actions
```

## セキュリティメモ

- Supabase の `anon` key は元々クライアントに配る想定の公開鍵です。実データを守るのは **RLS ポリシー** であり、`schema.sql` で「自分の投稿しか書き込めない / 更新削除できない」ように制限しています。
- それでも今回は念のため `anon` key も Git にコミットせず、GitHub Actions の Secrets から注入する構成にしています。
- Supabase の **service_role** key は絶対にクライアントや GitHub に置かないでください。
