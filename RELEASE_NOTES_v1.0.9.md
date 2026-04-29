# Pluma v1.0.9 リリースノート

**リリース日:** 2026-04-30

CSV / TSV モードのアクティブ列ハイライトを刷新し、選択範囲の文字数カウンタを追加しました。

---

## 主な変更

### CSV / TSV のアクティブ列ハイライトを刷新

これまで列幅と同色の塗りつぶしで列を強調していたため、テキスト選択（青の半透明ハイライト）と重なると選択範囲が見えなくなる課題がありました。本バージョンから、列の **左端に 1px の緑（`#16a34a`）の縦連続線** を描画する方式に変更しました。

- テキスト選択や複数行選択と干渉せず、コピー＆ペースト時の視認性が大幅向上
- 行高ぴったりの矩形マーカー方式で**行間も途切れず連続線**として描画
- **空セル**でも縦線が途切れない（パディングウィジェット位置でも適切な高さで描画）
- ボーダー位置をセル左端から 2px 外側にオフセット（カーソルとの混同を防止）

### テキスト選択の背景色を薄緑に統一

テキスト選択の背景色を **薄緑（`#d4edda`）** に変更しました（フォーカス時 / 非フォーカス時とも）。CSV モードと通常モードで一貫した選択色になります。

### 文字数カウンタを追加

ステータスバーの右側に、選択範囲の **「文字数：N文字」** が表示されるようになりました。

- 半角英数・全角文字・改行をそれぞれ 1 文字としてカウント
- 矩形選択や `Ctrl+D` による複数選択は全範囲の合計を表示
- 未選択時は非表示（ステータスバーがすっきり）

---

## 不具合修正

### CSV モードでパディングウィジェット位置にカーソルが移動するとキャレットが消える問題を修正

列幅 > 文字幅のセル（パディングウィジェットがある状態）で、右隣のセルから左にカーソルを移動した際、カーソルがパディング位置に入るとキャレットが描画されなくなる問題を修正しました。原因はパディング用の `<span>` がテキストノードを持たず `display: inline-block` のベースライン上で実質高さ 0 になっていたことで、その位置で `coordsAtPos` が高さ 0 の座標を返し、キャレットの描画高も 0 になっていました。ウィジェット要素にゼロ幅スペース（`U+200B`）を追加して行高を持たせることで解決しています。

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

# Pluma v1.0.9 Release Notes

**Release date:** 2026-04-30

This release reworks the CSV / TSV active-column highlighting and adds a character counter for the current selection.

---

## Highlights

### Reworked active-column highlighting in CSV / TSV mode

The previous implementation filled the active column with a solid background tint, which caused the text-selection background to disappear when selecting cells in that column. The active column is now indicated by a **1 px green (`#16a34a`) vertical line at the column's left edge**.

- No interference with text selection or multi-line selection — copy & paste in CSV cells is now actually usable
- Drawn as line-height rectangle markers with vertical overlap so the line stays **continuous across rows** (no inter-line gaps)
- **Empty cells** keep the line continuous (the marker uses the line block height instead of the comma's bounding box)
- The line is offset 2 px to the left of the cell start so it never gets confused with the caret

### Unified text-selection background color

The text-selection background is now **light green (`#d4edda`)** in both focused and unfocused states, matching the CSV-mode aesthetic.

### Character counter

The status bar now shows a **「文字数：N文字」** entry (character count) on the right side while a selection is active.

- Half-width, full-width, and newline characters each count as 1
- Multi-cursor and rectangular selections sum across all ranges
- Hidden when no selection is active, keeping the status bar uncluttered

---

## Bug Fixes

### Caret invisible at padding-widget positions in CSV mode

When the cursor moved into a cell whose visual width exceeds its text content (i.e. cells where the alignment padding widget is present) by entering it from the right, the caret would briefly disappear at the position immediately after the cell's text. Root cause: the alignment padding `<span>` had no text node, so on the inline-block baseline it collapsed to zero height — `coordsAtPos` then returned a zero-height rect and the caret was drawn at zero height. Fixed by giving the widget a zero-width space (`U+200B`) so it carries proper line-height.

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
