# Pluma v1.1.0 リリースノート

**リリース日:** 2026-05-16

「名前を付けて保存」実行時にエディタ表示領域が空になる不具合を修正しました。

---

## 不具合修正

### 「名前を付けて保存」でエディタ表示が空になる問題を修正

「名前を付けて保存」を実行すると、タブのファイル名は新しい名前に更新されるものの、エディタの表示領域だけが空（または保存前の旧コンテンツ）になる不具合を修正しました。保存されたファイル自体は正しい内容を持っていたため、表示のみの異常でした。

- **原因**: エディタのビュー生成 `useEffect` が `getFileExtension`（`filePath` 依存の `useCallback`）を依存に持つ構造になっており、「名前を付けて保存」が zustand の `filePath` を先に更新するため、まだ `activeTab.content` がエディタの実コンテンツに同期される前に `useEffect` が再走し、`initialContent` が古い値（新規タブなら空文字列）のまま CodeMirror ビューが再生成されていました。
- **対処**: `doSave` / `doSaveAs` の冒頭で、ファイル保存呼び出しの前にエディタの現在コンテンツを active tab に同期するよう変更。これにより `filePath` 変更によってビュー再生成が走るタイミングでも `activeTab.content` が最新となり、新規ビューが正しい内容で初期化されます。新規（無題）タブの初回「保存」も同じ経路を踏んでいたため、両方のパスで修正しています。

---

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

# Pluma v1.1.0 Release Notes

**Release date:** 2026-05-16

This release fixes a bug where the editor display area became blank after performing **Save As**.

---

## Bug Fixes

### Editor display area cleared after Save As

Fixed a bug where performing **Save As** updated the tab title to the new filename but left the editor display area blank (or showing the pre-edit content). The saved file on disk always contained the correct content — only the on-screen view was wrong.

- **Root cause**: The editor's view-creation `useEffect` had `getFileExtension` (a `useCallback` that depends on `filePath`) in its dependency list. **Save As** updated `filePath` in the zustand store first, so the effect re-ran and rebuilt the CodeMirror view from `initialContent={activeTab.content}` *before* the tab's `content` was synced to the latest editor text — leaving the new view initialized with the stale (or empty, for an untitled tab) content.
- **Fix**: `doSave` and `doSaveAs` now sync the editor's current content into the active tab at the *start* of the handler, before the save call. So when `filePath` changes and triggers a view rebuild, `activeTab.content` is already current and the new view is initialized correctly. The first save of a brand-new (untitled) tab took the same path, so both code paths are fixed.

---

## System Requirements

- Windows 10 / 11 (WebView2 runtime required)
- macOS (Apple Silicon)

## How to Update

Download the latest installer (`-setup.exe` / `.dmg`) from GitHub Releases. On Windows, installing the new version over an existing one preserves your settings (font, theme, etc.).

## Support

If you find Pluma useful, please consider supporting ongoing development ☕

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?logo=github)](https://github.com/sponsors/osprey74)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b?logo=ko-fi)](https://ko-fi.com/osprey74)
