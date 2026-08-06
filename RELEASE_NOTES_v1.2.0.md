# Pluma v1.2.0 リリースノート

**リリース日:** 2026-08-06

行の高さ（行間）を設定できる項目を追加し、起動直後や新規ファイル作成後すぐに入力・貼り付けができるよう操作性を改善しました。

---

## 新機能

### 行の高さ（Line-Height）設定を追加

設定ダイアログに「行の高さ」のスライダーを追加しました。1.0〜3.0 の範囲で行間を調整でき、リアルタイムプレビューで見え方を確認しながら設定できます。設定値は保存され、次回起動時にも引き継がれます。

- 文章の可読性や好みに合わせて行間を広めにも狭めにも調整できます。
- 既存のフォント・文字サイズ設定と同様に、変更は即座にエディタへ反映されます。

## 改善

### 起動直後・新規作成後にエディタへ自動フォーカス

アプリの起動直後や新規ファイル作成後、これまではエディタ領域を一度クリックしないと入力やクリップボードからの貼り付けができませんでした。本バージョンからはエディタ領域へ自動的にカーソルが当たるようになり、起動・新規作成・タブ切り替え・ファイルを開いた直後からそのまま入力・貼り付けが行えます。

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

# Pluma v1.2.0 Release Notes

**Release date:** 2026-08-06

This release adds a configurable line height (line spacing) setting and improves usability so you can type or paste immediately after launching the app or creating a new file.

---

## New Features

### Line-height setting

A "Line height" slider has been added to the Settings dialog. You can adjust line spacing from 1.0 to 3.0 and preview the result in real time. The value is persisted and restored on the next launch.

- Widen or tighten line spacing to match readability preferences.
- Like the existing font and font-size settings, changes apply to the editor instantly.

## Improvements

### Editor auto-focus on launch and new file

Previously you had to click the editor area once before you could type or paste after launching the app or creating a new file. The editor area is now focused automatically, so you can type and paste right away after launch, new-file creation, tab switching, or opening a file.

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
