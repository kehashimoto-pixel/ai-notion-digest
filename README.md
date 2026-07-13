# ai-notion-digest

Notion・Claude(Anthropic)・生成AI関連のアップデート情報を自動収集し、GitHub Pagesで公開するダイジェストページ。LLMは使わず決定論的なスクリプトで収集・スコアリング・HTML生成を行う。

## 構成

- `config/sources.json` … RSS一覧・HTML差分監視対象
- `config/scoring.json` … スコアリングルール(ソース重み・キーワード加点減点・反響換算・期限検知・掲載期間)
- `src/` … 収集・スコアリング・ページ生成のロジック
- `state/` … 重複排除・掲載アイテム・スナップショットの永続状態(コミット対象)
- `docs/index.html` / `docs/data.json` … GitHub Pagesで公開する出力

## ローカル実行

```
npm install
npm run collect
```

実行後、コンソールに各ソースの取得成否が出力される。失敗したソースがあれば`config/sources.json`のURLを確認・修正する。

## テスト

```
npm run typecheck
npm test
```

## HTML差分監視の調整

Notion Releases / Anthropic Newsはページの`<a>`タグからタイトルとURLを抽出し、前回実行時のスナップショット(`state/snapshots/*.json`)と比較して新着のみ登録する(`src/fetchers/htmlDiff.ts`)。サイトのマークアップが変わり誤検知・取得漏れが増えた場合は、抽出条件(`MIN_TITLE_LENGTH`など)や抽出範囲を見直す。

## GitHub Actions

`.github/workflows/digest.yml`がJST 8:00/18:00に自動実行し、`state/`と`docs/`の変更を自動コミット&プッシュする。`workflow_dispatch`で手動実行も可能。

## GitHub Pages の有効化

1. GitHubリポジトリの Settings → Pages を開く
2. Source を「Deploy from a branch」に設定
3. Branch を `main`、フォルダを `/docs` に設定して Save
4. 数分後、Pages セクションに表示される URL(`https://<ユーザー名>.github.io/ai-notion-digest/`)でダイジェストページを確認できる
