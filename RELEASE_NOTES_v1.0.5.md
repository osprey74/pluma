# Pluma v1.0.5 リリースノート

**リリース日:** 2026-04-13

CSV / TSV 編集体験の改善と、検索パネルの視認性向上が中心のアップデートです。また、保守性向上のためダークモード対応を廃止しました。

---

## 新機能・改善

### CSV / TSV モード
- **列幅自動整列（ビジュアルパディング）**
  各列の最長セル幅に合わせて視覚的に整列表示します。ファイル本体には一切変更を加えず、表示のみが整います。半角 / 全角混在のデータにも対応しています（East Asian Width 判定による全角文字幅 2 換算）。
- **アクティブ列ハイライト色の変更**
  背景色を薄青 (`#e8f4fd`) から薄緑 (`#d4edda`) に変更し、文字色を黒に固定しました。
- **折り返しの自動無効化**
  `.csv` / `.tsv` / `.tab` ファイルを開いている間は、折り返し設定に関わらず折り返しを強制 OFF にします。列の視覚的整列を保つための挙動です。

### 検索 / 置換パネル
- パネル背景をエディタガターと統一した薄グレー (`#f5f5f5`) に変更
- ボタン / 入力欄 / ラベルの文字色を黒に統一し、視認性を改善

---

## 変更点

### ダークモード対応を廃止
- CodeMirror の `oneDark` テーマおよびダークモード用オーバーライドを削除
- UI 全体の `@media (prefers-color-scheme: dark)` ブロックを全削除
- `@codemirror/theme-one-dark` パッケージ依存を除去
- **副次効果**: CSS バンドルサイズが 22.11 KB → 16.89 KB（約 24% 削減）、JS バンドルサイズも軽量化
- OS のダークモード設定に関わらず、常にライトテーマで動作します

---

## パフォーマンスガード

CSV 列幅のビジュアルパディング処理は、20,000 行を超えるファイルでは自動的にスキップされます（列ハイライトのみ有効）。大規模 CSV の編集応答性を維持するための措置です。

---

## 動作環境

- Windows 10 / 11（WebView2 ランタイム必須）
- macOS（Apple Silicon）

## 更新方法

GitHub Releases から最新のインストーラ（`.msi` / `-setup.exe` / `.dmg`）をダウンロードしてください。

## Support / 開発を応援する

Pluma を気に入っていただけたら、開発の継続を応援してください ☕

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?logo=github)](https://github.com/sponsors/osprey74)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b?logo=ko-fi)](https://ko-fi.com/osprey74)

---

# Pluma v1.0.5 Release Notes

**Release date:** 2026-04-13

This update focuses on improving the CSV / TSV editing experience and search panel readability. Dark mode support has also been removed to reduce maintenance burden.

---

## New Features & Improvements

### CSV / TSV Mode
- **Automatic column width alignment (visual padding)**
  Each column is visually padded to match the longest cell width in that column. The file contents remain unchanged — only the display is aligned. Works with mixed half-width / full-width characters (East Asian Width detection treats full-width characters as width 2).
- **Active column highlight color change**
  Background changed from light blue (`#e8f4fd`) to light green (`#d4edda`), with text color fixed to black.
- **Automatic line wrap disable**
  While a `.csv` / `.tsv` / `.tab` file is open, line wrapping is forcibly disabled regardless of the wrap setting to preserve visual column alignment.

### Search / Replace Panel
- Panel background unified with the gutter color (light gray, `#f5f5f5`)
- Button / input / label text colors standardized to black for improved readability

---

## Changes

### Dark Mode Support Removed
- Removed CodeMirror's `oneDark` theme and dark mode overrides
- Removed all UI-level `@media (prefers-color-scheme: dark)` CSS blocks
- Removed the `@codemirror/theme-one-dark` package dependency
- **Side effect**: CSS bundle size reduced from 22.11 KB to 16.89 KB (~24% reduction); JS bundle also slimmed down
- The app now always runs in the light theme regardless of OS dark mode settings

---

## Performance Guard

CSV column visual padding is automatically skipped for files exceeding 20,000 lines (only column highlighting remains active). This maintains editor responsiveness for large CSV files.

---

## System Requirements

- Windows 10 / 11 (WebView2 runtime required)
- macOS (Apple Silicon)

## How to Update

Download the latest installer (`.msi` / `-setup.exe` / `.dmg`) from GitHub Releases.

## Support

If you find Pluma useful, please consider supporting ongoing development ☕

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?logo=github)](https://github.com/sponsors/osprey74)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b?logo=ko-fi)](https://ko-fi.com/osprey74)
