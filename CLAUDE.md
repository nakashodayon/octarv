# 開発規約

- パッケージマネージャーは **bun のみ** (npm/yarn/pnpm 禁止、`pnpm-lock.yaml` は無視)
- UI コンポーネントは `components/` に集約する。`app/` 直下に汎用コンポーネントを作らない
- shadcn/ui ベース。新規コンポーネント追加は `shadcn` CLI を優先
- 型チェックは `bun run typecheck` で確認
- フォーマットは `bun run format` (Prettier + tailwind plugin)
- Lint は `bun run lint`
- Web ブラウジングは必ず `/browse` skill (gstack) を使うこと。`mcp__claude-in-chrome__*` ツールは使わない。

# よく使うコマンド

- `bun run dev` — Next.js dev server 起動 (Turbopack)
- `bun run build` — プロダクションビルド
- `bun run start` — ビルド済みアプリ起動
- `bun run typecheck` — TypeScript 型チェック
- `bun run lint` — ESLint 実行
- `bun run format` — Prettier で整形

## 破壊的操作の前に必ず確認
- `git push --force` / ブランチ削除
- `node_modules` / lockfile の削除
