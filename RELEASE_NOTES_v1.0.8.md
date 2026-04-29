# Pluma v1.0.8 リリースノート

**リリース日:** 2026-04-29

大きいファイル（特に空白文字を多く含むファイル）を開いた際のパフォーマンスを大幅に改善しました。あわせて TAB キーの挙動を実用的にし、設定ダイアログのアクセシビリティも改善しています。

---

## パフォーマンス改善

### 空白文字表示の描画方式を刷新

100KB 程度のテキストファイル（特にディレクトリ階層出力など空白の多いファイル）でカーソル移動・タイピング・スクロールが重くなる問題を修正しました。

- **連続空白の 1 マークへのマージ**: インデント領域が深くても 1 行あたり 1〜2 span に集約
- **`::before` 疑似要素を `background-image` SVG に置き換え**: レイアウトボックスを半減し、`position: relative/absolute` を不要化（paint 段階のみで描画）
- **表示メニューに「空白文字を表示」トグル追加**: 必要に応じて完全にオフにできます（設定は永続化）

### 再レンダリング連鎖の解消

- `useFileIO` フックがストア全体を購読していた問題を修正。カーソル移動毎に App / MenuBar / Toolbar / TabBar が再レンダリングされていたのを抑止
- App / Editor / StatusBar / SettingsDialog を `useShallow` セレクタベースに刷新

### 重い処理の見直し

- 不可視文字インスペクターの `analyzeText` をシングルパスに最適化（53K 文字で約 5 倍高速化、5 万件超のオブジェクト確保を排除）
- 不可視文字インスペクター・Markdown プレビューの 500ms ポーリングを廃止し、エディタの変更通知を 250ms デバウンスで配信する方式に変更
- インスペクタープレビューで本文変更のたびに CodeMirror インスタンスを再作成していた問題を修正
- エディタが毎キーストロークで全文を `toString()` していた不要な処理を削除

---

## 機能変更

### TAB キーでタブ文字を挿入

これまで TAB キーは半角スペース 2 つを挿入していましたが、本バージョンから **タブ文字 (`\t`) を挿入** するようになりました。Shift+TAB で 1 タブ分のインデント解除も可能です。

### Enter キーの挙動を素直に

CodeMirror デフォルトの「空白のみの行で Enter を押すと、その空白を次の行に移す」挙動を抑止し、**純粋にカーソル位置で改行のみを挿入** するよう変更しました。

### 「空白文字を表示」トグルを追加

表示メニューから空白文字（半角スペース・全角スペース・タブ・改行）の可視化のオン/オフを切り替えられるようになりました。

---

## その他

- 設定ダイアログのアクセシビリティ改善（フォーム要素のラベル関連付け、動的スタイルを CSS 変数経由で適用）

## 動作環境

- Windows 10 / 11（WebView2 ランタイム必須）
- macOS（Apple Silicon）

## 更新方法

GitHub Releases から最新のインストーラ（`-setup.exe` / `.dmg`）をダウンロードしてください。Windows をご利用中の場合、新バージョンを上書きインストールすれば設定（フォント・テーマ等）は維持されます。

## Support / 開発を応援する

Pluma を気に入っていただけたら、開発の継続を応援してください ☕

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?logo=github)](https://github.com/sponsors/osprey74)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b?logo=ko-fi)](https://ko-fi.com/osprey74)

---

# Pluma v1.0.8 Release Notes

**Release date:** 2026-04-29

This release significantly improves performance when opening large files (especially those with lots of whitespace), makes the TAB key behave like a real text editor, and improves accessibility of the settings dialog.

---

## Performance Improvements

### Whitespace rendering overhaul

Fixed an issue where ~100KB text files (particularly those with heavy indentation, such as directory tree dumps) would lag during cursor movement, typing, and scrolling.

- **Merge consecutive whitespace into a single mark**: Even deeply-indented lines now use only 1–2 spans per line
- **Replaced `::before` pseudo-elements with `background-image` SVGs**: Halves the layout-box count and removes `position: relative/absolute` (rendered at paint time only)
- **Added "Show whitespace" toggle in the View menu**: Turn it off entirely when not needed (setting is persisted)

### Eliminated re-render cascades

- Fixed `useFileIO` hook subscribing to the entire store, which caused App / MenuBar / Toolbar / TabBar to re-render on every cursor move
- Refactored App / Editor / StatusBar / SettingsDialog to use `useShallow` selectors

### Hot-path optimizations

- Rewrote `analyzeText` (invisible-character inspector) as a single pass — about 5× faster on 53K characters, eliminating 50K+ intermediate object allocations
- Removed 500 ms polling for the invisible-character inspector and Markdown preview; both now receive change notifications via a 250 ms debounced callback from the editor
- Fixed the inspector preview re-creating its CodeMirror instance on every text change
- Removed an unnecessary full-document `toString()` call on every keystroke

---

## Feature Changes

### TAB inserts a tab character

Previously the TAB key inserted two ASCII spaces. It now inserts a literal tab character (`\t`). Shift+TAB removes one indent.

### Enter behaves as expected in plain text

Suppressed CodeMirror's default "smart" behavior that, when pressing Enter on a whitespace-only line, would move the leading whitespace to the new line. Enter now simply inserts a newline at the cursor position.

### "Show whitespace" toggle

Added a toggle in the View menu to enable or disable visualization of whitespace characters (space, full-width space, tab, newline).

---

## Other

- Improved accessibility of the settings dialog (form label associations, dynamic styles applied via CSS variables)

## System Requirements

- Windows 10 / 11 (WebView2 runtime required)
- macOS (Apple Silicon)

## How to Update

Download the latest installer (`-setup.exe` / `.dmg`) from GitHub Releases. On Windows, installing the new version over an existing one preserves your settings (font, theme, etc.).

## Support

If you find Pluma useful, please consider supporting ongoing development ☕

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?logo=github)](https://github.com/sponsors/osprey74)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b?logo=ko-fi)](https://ko-fi.com/osprey74)
