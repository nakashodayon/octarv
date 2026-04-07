# Design Standards

## Async Action Status Indicator

非同期アクション（送信、認証、保存など）の状態は **FamilyButton** (`components/ui/family-button`) を用いて、ボタン自身に inline で表示する。Toast は補助的な通知のみに使い、進行状態の主表示には使わない。

### 状態遷移

```
default → loading → success → (画面遷移 / 完了)
                 ↘ error   → default (自動復帰)
```

| variant     | 用途                              | 表示時間の目安           |
| ----------- | --------------------------------- | ------------------------ |
| `undefined` | 待機 (default)                    | -                        |
| `loading`   | 非同期処理中                      | 処理完了まで             |
| `success`   | 成功確定〜次画面への遷移直前まで  | **1000〜1500ms** 維持    |
| `error`     | 失敗                              | **2000ms** 維持後 default |

### 実装ルール

1. **`<form action={fn}>` ではなく `onSubmit` を使う**
   React 19 の form action は state 更新を transition 内に閉じ込めてアニメーションが乱れるため。

2. **success → 画面遷移は必ず遅延させる**
   `router.push` を即座に呼ぶと login ページが unmount され success 表示が見えない。`setTimeout(() => router.push(...), 1200)` を最低ラインとする。

3. **error は自動で default に戻す**
   `setTimeout(() => setVariant(undefined), 2000)` でユーザーが再試行できる状態に戻す。

4. **`text` prop で各状態の文言を必ず指定する**
   FamilyButton のデフォルト文言 (`Transaction Safe` 等) は汎用なので、機能ごとに上書きする。

5. **Toast は補助通知に限定**
   ボタン自身がステータスを示しているため、ボタン直近のフィードバックでは toast を併用しない。バックグラウンド処理や画面外の通知のみ toast を使う。

### 標準テンプレート

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import FamilyButton from "@/components/ui/family-button"

type ButtonVariant = "loading" | "error" | "success" | undefined

export function ExampleForm() {
  const router = useRouter()
  const [variant, setVariant] = useState<ButtonVariant>(undefined)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    setVariant("loading")
    const result = await someAction(formData)

    if (result?.error) {
      setVariant("error")
      setTimeout(() => setVariant(undefined), 2000)
      return
    }

    setVariant("success")
    setTimeout(() => router.push("/next"), 1200)
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* fields */}
      <FamilyButton
        type="submit"
        variant={variant}
        text={{
          loading: "Submitting...",
          success: "Done!",
          error: "Failed",
        }}
      >
        Submit
      </FamilyButton>
    </form>
  )
}
```

### Server Action 側のルール

Server Action 内で `redirect()` を呼ばない。クライアントで success 状態を見せてから `router.push` するため、Action は `{ success: true }` か `{ error: string }` を返すだけにする。

参考実装: `app/login/page.tsx`, `app/login/actions.ts`
