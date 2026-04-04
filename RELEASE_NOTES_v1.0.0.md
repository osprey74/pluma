# Pluma v1.0.0 リリースノート

**リリース日:** 2026-04-05

Pluma の初回正式リリースです。Windows向けの多機能テキストエディタとして、テキスト編集からCSV/TSV操作、Markdownプレビュー、不可視文字検出まで幅広い機能を搭載しています。

---

## 主な機能

### テキストエディタ
- CodeMirror 6ベースの高性能テキストエディタ
- タブによる複数ファイル同時編集
- 文字エンコーディング自動検出・切替（UTF-8, Shift_JIS, EUC-JP, UTF-16LE/BE, ISO-8859-1）
- 改行コード自動検出・切替（LF / CRLF / CR）
- BOM（Byte Order Mark）対応
- 行番号・ルーラー・アクティブ行ハイライト
- 空白文字可視化（スペース・全角スペース・タブ・改行）
- 複数選択・矩形選択（Alt+ドラッグ）
- ライト / ダークテーマ（OS設定自動追従）
- 大ファイル対応（50MB超: 警告、200MB超: 読み取り専用）

### 表示カスタマイズ
- フォント選択（Source Han Code JP / MS ゴシック / MS 明朝）
- 文字サイズ変更（8〜40px）、Ctrl+マウスホイール対応
- 文字色・背景色のカスタマイズ
- テキスト折り返し（なし / ウィンドウ幅 / 指定文字数）

### CSV / TSV サポート
- 区切り文字の自動検出（カンマ / タブ / セミコロン）
- Tab / Shift+Tab によるセル間移動
- アクティブ列ハイライト

### Markdownプレビュー（Ctrl+Shift+M）
- 左右分割によるリアルタイムプレビュー
- エディタ↔プレビュー間の双方向スクロール追従
- リサイザーによるパネル幅調整（200〜1200px、設定永続化）
- 見出し・リスト・テーブル・コードブロック・引用・画像・タスクリスト対応

### 不可視文字インスペクター（Ctrl+Shift+I）
- 25種類以上の不可視文字を検出
  - ゼロ幅スペース（ZWSP）、BOM、双方向制御文字、C1制御文字、Variation Selector 等
- エディット / プレビュー切替モード
- プレビューモード: 不可視文字を `U+XXXX` バッジで可視化
- 文字種色分け表示（数字: 青、記号: 緑）
- クリーンテキストのクリップボードコピー
- 不可視文字の一括削除

### 印刷 / PDF出力（Ctrl+P）
- Chrome DevTools Protocol（CDP）によるPDF生成
- カスタムヘッダ: ファイル名（中央）
- カスタムフッタ: 印刷日時（左）、ページ番号/総ページ数（右）
- A4用紙対応
- 生成したPDFをOS既定のビューアで自動表示

### UI
- メニューバー（ファイル・編集・表示）
- ツールバー（カラーアイコン、全主要機能へのクイックアクセス）
- タブバー（複数ファイル管理、未保存インジケータ）
- ステータスバー（エンコーディング・改行コード・カーソル位置・ファイルサイズ）
- 設定ダイアログ（リアルタイムプレビュー付き）
- キーバインド一覧（F1）
- 最近使ったファイル（最大10件、永続化）

---

## 動作環境

- Windows 10 / 11（WebView2ランタイム必須）

## 技術スタック

- Tauri v2 + React 19 + TypeScript + CodeMirror 6
- Rust（バックエンド）
- marked（Markdownレンダリング）
- WebView2 CDP（PDF生成）
- chardetng + encoding_rs（エンコーディング検出）

## クレジット

- アプリアイコン: [Scroll icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/scroll)

## Support / 開発を応援する

Pluma を気に入っていただけたら、開発の継続を応援してください ☕

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?logo=github)](https://github.com/sponsors/osprey74)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b?logo=ko-fi)](https://ko-fi.com/osprey74)
