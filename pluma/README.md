# Pluma

Windows向けの多機能テキストエディタです。Tauri v2 + React + TypeScript + CodeMirror 6で構築されています。

## 主な機能

### エディタ
- タブによる複数ファイル同時編集
- 文字エンコーディング自動検出・切替（UTF-8, Shift_JIS, EUC-JP, UTF-16LE/BE, ISO-8859-1）
- 改行コード自動検出・切替（LF / CRLF / CR）
- BOM（Byte Order Mark）対応
- 元に戻す / やり直し
- 検索と置換
- 複数選択・矩形選択
- 行番号表示・アクティブ行ハイライト
- ルーラー（文字位置目盛り）
- 空白文字可視化（スペース・全角スペース・タブ・改行）
- ライト / ダークテーマ（OS設定自動追従）

### 表示設定
- フォント選択（Source Han Code JP / MS ゴシック / MS 明朝）
- 文字サイズ変更（8〜40px、Ctrl+ホイール対応）
- 文字色・背景色カスタマイズ
- テキスト折り返し（なし / ウィンドウ幅 / 指定文字数）

### CSV / TSV 対応
- 区切り文字自動検出（カンマ / タブ / セミコロン）
- Tab / Shift+Tab でセル間移動
- アクティブ列ハイライト

### Markdownプレビュー
- 左右分割リアルタイムプレビュー
- 双方向スクロール追従
- リサイザーによるパネル幅調整
- 見出し・リスト・テーブル・コードブロック・引用・画像対応

### 不可視文字インスペクター
- 25種類以上の不可視文字を検出（ゼロ幅スペース、BOM、双方向制御文字等）
- 不可視文字を `U+XXXX` バッジで可視化するプレビューモード
- 文字種色分け表示（数字: 青、記号: 緑）
- クリーンテキストのコピー・不可視文字の一括削除

### 印刷 / PDF出力
- CDP（Chrome DevTools Protocol）によるPDF生成
- カスタムヘッダ（ファイル名）・フッタ（日時・ページ番号）
- A4用紙対応
- OS既定のPDFビューアで自動表示

### UI
- メニューバー・ツールバー（カラーアイコン）・タブバー・ステータスバー
- 未保存確認ダイアログ
- 設定ダイアログ（リアルタイムプレビュー付き）
- キーバインド一覧（F1）
- 最近使ったファイル（最大10件）

## キーボードショートカット

| ショートカット | 機能 |
|---|---|
| Ctrl+N | 新規タブ |
| Ctrl+O | ファイルを開く |
| Ctrl+S | 保存 |
| Ctrl+P | 印刷（PDF出力） |
| Ctrl+W | タブを閉じる |
| Ctrl+Z | 元に戻す |
| Ctrl+Y | やり直し |
| Ctrl+F | 検索と置換 |
| Ctrl+A | すべて選択 |
| Ctrl+D | 次の同一語句を選択 |
| Ctrl++ / Ctrl+ホイール↑ | 文字サイズ拡大 |
| Ctrl+- / Ctrl+ホイール↓ | 文字サイズ縮小 |
| Ctrl+0 | 文字サイズリセット |
| Ctrl+Shift+I | 不可視文字インスペクター |
| Ctrl+Shift+M | Markdownプレビュー |
| Alt+ドラッグ | 矩形選択 |
| F1 | キーバインド一覧 |

## 対応ファイル形式

- テキストファイル (.txt)
- CSV (.csv)
- TSV (.tsv, .tab)
- Markdown (.md)
- その他すべてのテキストファイル

## 技術スタック

- **フロントエンド**: React 19, TypeScript, CodeMirror 6, Zustand, Vite
- **バックエンド**: Rust, Tauri v2
- **Markdownレンダリング**: marked
- **印刷**: WebView2 CDP (Chrome DevTools Protocol)
- **エンコーディング検出**: chardetng + encoding_rs

## 開発

```bash
# 依存関係のインストール
npm install

# 開発モードで起動
npm run tauri dev

# リリースビルド
npm run tauri build
```

## クレジット

- アプリアイコン: [Scroll icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/scroll)

## ライセンス

MIT

## Support / 開発を応援する

Pluma を気に入っていただけたら、開発の継続を応援してください ☕

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?logo=github)](https://github.com/sponsors/osprey74)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b?logo=ko-fi)](https://ko-fi.com/osprey74)