# Pluma 作業ログ

## 2026-03-08 セッション

### 実施内容

#### 1. ルーラー表示の修正
- **問題**: ルーラーがエディタの行番号ガター部分と重なって表示されていた
- **対処**: ガター幅とコンテンツパディングを計算し、ルーラーの `left` オフセットを調整
- **問題**: ルーラーの目盛り幅が実際の文字幅と一致しない（「10」の目盛りが半角18文字分の位置に表示される）
- **原因**: `ch` CSS単位やCodeMirrorの `defaultCharacterWidth` ではCJKフォントの実際の描画幅と異なる
- **対処**: `.cm-content` に非表示の `<span>` を挿入し、実際のフォントスタイルを継承した状態で文字幅を測定する方式に変更（`ruler.ts`）
- ルーラーをウィンドウ幅全体に拡張（`window.innerWidth / charW` で最大列数を計算）

#### 2. 最近開いたファイル機能
- **対処**: `useFileIO.ts` に `getRecentFiles()` / `addRecentFile()` を追加（localStorage、最大10件）
- ファイルメニューにフルパス表示で最近開いたファイルを一覧
- メニュードロップダウンを `width: max-content` で自動拡幅し、パスが折り返されないように対応

#### 3. 設定の永続化
- **対処**: `editorStore.ts` に `saveSettings()` / `loadSettings()` を追加
- フォント種類、サイズ、文字色、背景色、折り返しモード、折り返し文字数を localStorage に保存

#### 4. 設定ダイアログの作成
- **対処**: `SettingsDialog` コンポーネントを新規作成
- フォント選択（3種）、サイズスライダー、文字色・背景色のカラーピッカー、プレビュー領域

#### 5. フォント選択の整理
- 表示フォントを「Source Han Code JP」「MS ゴシック」「MS 明朝」の3種に限定
- 「源ノ角ゴシック Code JP」を App.tsx と SettingsDialog.tsx の両方から削除

#### 6. 新規作成・保存確認ダイアログ
- **対処**: ファイルメニューに「新規作成」「終了」を追加
- 編集中のファイルがある状態で「新規作成」「開く」「終了」を選択した場合、保存確認ダイアログを表示
- ダイアログは「保存する」「保存しない」の二択
- **問題**: ダイアログのボタンをクリックしても何も起きない
- **原因**: `useCallback` のクロージャで `pendingAction` ステートが stale になる問題
- **対処**: `pendingActionRef`（useRef）を併用し、コールバック内では ref から値を読み取るように変更

#### 7. ウィンドウ閉じボタンの制御
- **対処**: `getCurrentWindow().onCloseRequested()` で閉じイベントをインターセプト
- 編集中の場合は `event.preventDefault()` でブロックし、保存確認ダイアログを表示
- **問題**: `getCurrentWindow().close()` が `onCloseRequested` を再トリガーする
- **対処**: `close()` → `destroy()` に変更し、ハンドラを経由せず即座にウィンドウを破棄
- Tauri capabilities に `core:window:allow-destroy` と `core:window:allow-close` を追加

#### 8. フォントサイズ変更時のテキスト消失問題
- **問題**: フォントサイズ変更で `useEffect` が再実行され、EditorView が破棄・再構築されるため入力済みテキストが失われる
- **対処**: CodeMirror の `Compartment` を導入し、表示設定（フォント、サイズ、色、折り返し、ルーラー）を動的に `reconfigure()` で差分適用
- エディタの再構築は構造的変更（ダークモード、区切り文字、読み取り専用、ファイル種別）のみに限定
- テキストと操作履歴が保持されるようになった

### 変更ファイル一覧
- `pluma/src/App.tsx` — メニュー構成、保存確認フロー、フォント選択
- `pluma/src/components/Editor/Editor.tsx` — Compartment による動的設定切替
- `pluma/src/components/Editor/extensions/ruler.ts` — ルーラー文字幅測定の改善
- `pluma/src/components/ConfirmSaveDialog/ConfirmSaveDialog.tsx` — 保存確認ダイアログ（新規）
- `pluma/src/components/ConfirmSaveDialog/ConfirmSaveDialog.css` — 同CSS（新規）
- `pluma/src/components/SettingsDialog/SettingsDialog.tsx` — 設定ダイアログ（新規）
- `pluma/src/components/SettingsDialog/SettingsDialog.css` — 同CSS（新規）
- `pluma/src/components/MenuBar/MenuBar.css` — メニュー自動拡幅
- `pluma/src/stores/editorStore.ts` — 設定永続化
- `pluma/src/hooks/useFileIO.ts` — 最近開いたファイル、ファイル別パス指定オープン
- `pluma/src-tauri/capabilities/default.json` — window destroy/close 権限追加
