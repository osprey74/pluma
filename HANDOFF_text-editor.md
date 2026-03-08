# HANDOFF: シンプル高速テキストエディタ開発

**作成日：** 2026-03-06  
**担当者：** Sohshi (osprey74)  
**ステータス：** 実装中（v1.0 基盤構築＋コア機能の大半が完了）

---

## 1. プロジェクト概要

### 目的
txt / csv / tsv / md の4形式に対応した、軽量・高速なデスクトップテキストエディタを開発する。

### 技術スタック
| レイヤー | 技術 |
|---------|------|
| デスクトップフレームワーク | Tauri v2 |
| フロントエンド | React + TypeScript |
| ビルドツール | Vite |
| エディタコア | CodeMirror 6 |
| バックエンド（ファイルI/O） | Rust (Tauri commands) |
| エンコーディング処理 | encoding_rs + chardetng |

### 対応プラットフォーム
- macOS（優先）
- Windows
- Linux

---

## 2. 機能要件

### 2.1 必須機能（v1.0）

#### ファイル形式対応
- `.txt` — プレーンテキスト
- `.csv` — カンマ区切り
- `.tsv` / `.tab` — タブ区切り
- `.md` — Markdownシンタックスハイライト付き

#### エディタ機能
- **矩形選択（Column Selection）** — Alt + ドラッグ
- **正規表現 検索 / 置換** — パネルUI付き、フラグ（i, g, m）対応
- **CSV/TSV専用機能**
  - Tab / Shift+Tab でセル間移動
  - 区切り文字の自動検出（`,` / `\t` / `;`）
  - アクティブ列のハイライト（列ハイライト Lv.1）
- **シンタックスハイライト** — Markdown, CSV
- **行番号表示**
- **アンドゥ / リドゥ** — 無制限
- **テーマ** — ライト / ダーク（OSに追従）

#### エンコーディング対応
- UTF-8（BOMあり / なし）
- Shift-JIS (CP932)
- EUC-JP
- UTF-16 LE / BE
- ステータスバーにエンコーディング表示、クリックで変更可能

#### ファイルサイズ対応
- 〜50MB：フル機能（正式サポート範囲）
- 50MB超：警告ダイアログ（「読み込み継続 / キャンセル」選択）
- 50〜200MB：チャンク読み込みで対応（機能制限なし）
- 200MB超：読み込み制限モード（閲覧・行ジャンプのみ、編集不可）

### 2.2 将来機能（v2.0以降）
- CSVテーブルビュー（TanStack Table v8 統合）
- 列ソート / フィルタ
- 分割表示（Split Pane）
- プラグイン機構

---

## 3. アーキテクチャ設計

### 3.1 ディレクトリ構成

```
pluma/
├── src/                           # フロントエンド (React + TS)
│   ├── components/
│   │   ├── Editor/
│   │   │   ├── Editor.tsx             # CodeMirrorラッパー（Compartment動的設定）
│   │   │   └── extensions/
│   │   │       ├── csvHighlight.ts    # CSV列ハイライト
│   │   │       ├── csvKeymap.ts       # Tab/Shift+Tabセル移動
│   │   │       ├── ruler.ts           # 文字数ルーラー
│   │   │       ├── theme.ts           # ライト/ダークテーマ
│   │   │       └── whitespace.ts      # 空白文字可視化
│   │   ├── MenuBar/
│   │   │   ├── MenuBar.tsx            # メニューバー
│   │   │   └── MenuBar.css
│   │   ├── StatusBar/
│   │   │   ├── StatusBar.tsx          # エンコーディング/行列情報
│   │   │   └── StatusBar.css
│   │   ├── SettingsDialog/
│   │   │   ├── SettingsDialog.tsx     # フォント・色の設定ダイアログ
│   │   │   └── SettingsDialog.css
│   │   └── ConfirmSaveDialog/
│   │       ├── ConfirmSaveDialog.tsx  # 保存確認ダイアログ
│   │       └── ConfirmSaveDialog.css
│   ├── hooks/
│   │   └── useFileIO.ts               # ファイルI/O・最近開いたファイル
│   ├── stores/
│   │   └── editorStore.ts             # Zustandグローバル状態（設定永続化）
│   ├── utils/
│   │   └── detectDelimiter.ts         # 区切り文字自動検出
│   └── App.tsx
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/
│   │   │   ├── file_io.rs             # ファイル読み書き
│   │   │   ├── encoding.rs            # エンコーディング処理
│   │   │   └── mod.rs
│   │   └── lib.rs
│   ├── capabilities/
│   │   └── default.json               # Tauri権限設定
│   └── Cargo.toml
└── package.json
```

### 3.2 状態管理方針
- グローバル状態：Zustand（軽量、Reduxより設定が少ない）
- エディタ内状態：CodeMirror 6 の `EditorState` に委譲
- ファイルメタ情報（パス・エンコーディング・改行コード）：Zustandで管理

---

## 4. 実装詳細

### 4.1 CodeMirror 6 セットアップ

#### インストールパッケージ

```bash
npm install \
  @codemirror/view \
  @codemirror/state \
  @codemirror/commands \
  @codemirror/search \
  @codemirror/rectangular-selection \
  @codemirror/lang-markdown \
  @codemirror/language \
  @codemirror/theme-one-dark
```

#### 基本エクステンション構成

```typescript
// src/components/Editor/Editor.tsx
import { EditorView, keymap, lineNumbers } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { defaultKeymap, historyKeymap, history } from "@codemirror/commands"
import { search, searchKeymap } from "@codemirror/search"
import { rectangularSelection, crosshairCursor } from "@codemirror/rectangular-selection"
import { markdown } from "@codemirror/lang-markdown"

const baseExtensions = [
  lineNumbers(),
  history(),
  search({ top: false }),          // 正規表現検索パネル（下部表示）
  rectangularSelection(),           // Alt+ドラッグで矩形選択
  crosshairCursor(),                // 矩形選択中のカーソル変更
  keymap.of([
    ...defaultKeymap,
    ...historyKeymap,
    ...searchKeymap,
  ]),
]
```

### 4.2 矩形選択

**実装コスト：ゼロ（公式拡張で即時対応）**

```typescript
import { rectangularSelection, crosshairCursor } from "@codemirror/rectangular-selection"

// baseExtensionsに追加するだけで動作する
// キー操作: Alt + ドラッグ（macOS: Option + ドラッグ）
```

### 4.3 正規表現 検索 / 置換

**実装コスト：ゼロ（公式拡張で即時対応）**

```typescript
import { search, openSearchPanel } from "@codemirror/search"
import { keymap } from "@codemirror/view"

// Ctrl+F / Cmd+F で検索パネルを開く（デフォルト動作）
// 検索パネル内に「正規表現」トグルが標準で含まれる
const searchExtension = search({
  top: false,   // エディタ下部に表示
})
```

### 4.4 CSV/TSV専用機能

#### 区切り文字自動検出

```typescript
// src/utils/detectDelimiter.ts
export function detectDelimiter(text: string): ',' | '\t' | ';' {
  const sample = text.split('\n').slice(0, 10).join('\n')
  const counts = {
    ',': (sample.match(/,/g) ?? []).length,
    '\t': (sample.match(/\t/g) ?? []).length,
    ';': (sample.match(/;/g) ?? []).length,
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)[0][0] as ',' | '\t' | ';'
}
```

#### Tab キーによるセル移動

```typescript
// src/components/Editor/extensions/csvKeymap.ts
import { keymap } from "@codemirror/view"
import { EditorView } from "@codemirror/view"

function moveToNextCell(view: EditorView, delimiter: string): boolean {
  const { state } = view
  const pos = state.selection.main.head
  const line = state.doc.lineAt(pos)
  const lineText = line.text
  const colPos = pos - line.from
  
  const nextDelim = lineText.indexOf(delimiter, colPos)
  if (nextDelim !== -1) {
    view.dispatch({
      selection: { anchor: line.from + nextDelim + 1 }
    })
    return true
  }
  return false
}

export const csvKeymap = (delimiter: string) => keymap.of([
  {
    key: "Tab",
    run: (view) => moveToNextCell(view, delimiter),
  },
  {
    key: "Shift-Tab",
    run: (view) => moveToPrevCell(view, delimiter),
  },
])
```

#### 列ハイライト（Lv.1）

```typescript
// src/components/Editor/extensions/csvHighlight.ts
import { StateField, RangeSetBuilder } from "@codemirror/state"
import { Decoration, DecorationSet, EditorView } from "@codemirror/view"

const columnHighlightTheme = EditorView.baseTheme({
  ".cm-csv-column-active": { backgroundColor: "#e8f4fd" },
})

export function csvColumnHighlight(delimiter: string) {
  return StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(decorations, tr) {
      if (!tr.docChanged && !tr.selection) return decorations
      return buildColumnDecorations(tr.state, delimiter)
    },
    provide: f => [
      EditorView.decorations.from(f),
      columnHighlightTheme,
    ],
  })
}
```

### 4.5 ファイルI/O（Rust側）

#### Cargo.toml 依存関係

```toml
[dependencies]
tauri = { version = "2", features = ["dialog"] }
encoding_rs = "0.8"     # エンコーディング変換（Firefoxも採用）
chardetng = "0.1"       # エンコーディング自動検出
serde = { version = "1", features = ["derive"] }
tokio = { version = "1", features = ["fs"] }
```

#### ファイル読み込みコマンド（エンコーディング自動検出付き）

```rust
// src-tauri/src/commands/encoding.rs
use encoding_rs::*;
use chardetng::EncodingDetector;
use serde::Serialize;

#[derive(Serialize)]
pub struct FileContent {
    pub text: String,
    pub encoding: String,
    pub has_bom: bool,
    pub line_ending: String,   // "CRLF" | "LF" | "CR"
    pub file_size: u64,
}

#[tauri::command]
pub fn read_file(path: String) -> Result<FileContent, String> {
    let raw_bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    let file_size = raw_bytes.len() as u64;
    
    // ① BOM検出（最優先）
    let (encoding, has_bom, bom_len) = detect_bom(&raw_bytes);
    
    // ② BOMなし → chardetngで自動検出
    let encoding = if has_bom {
        encoding
    } else {
        let mut detector = EncodingDetector::new();
        detector.feed(&raw_bytes, true);
        detector.guess(None, true)
    };
    
    // ③ デコード
    let content_bytes = if has_bom { &raw_bytes[bom_len..] } else { &raw_bytes };
    let (decoded, _, _) = encoding.decode(content_bytes);
    let text = decoded.into_owned();
    
    // ④ 改行コード検出
    let line_ending = detect_line_ending(&text);
    
    Ok(FileContent {
        text,
        encoding: encoding.name().to_string(),
        has_bom,
        line_ending,
        file_size,
    })
}

fn detect_bom(bytes: &[u8]) -> (&'static Encoding, bool, usize) {
    if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        return (UTF_8, true, 3);      // UTF-8 BOM
    }
    if bytes.starts_with(&[0xFF, 0xFE]) {
        return (UTF_16LE, true, 2);   // UTF-16 LE
    }
    if bytes.starts_with(&[0xFE, 0xFF]) {
        return (UTF_16BE, true, 2);   // UTF-16 BE
    }
    (UTF_8, false, 0)  // デフォルト：BOMなしUTF-8
}

fn detect_line_ending(text: &str) -> String {
    if text.contains("\r\n") { "CRLF".to_string() }
    else if text.contains('\r') { "CR".to_string() }
    else { "LF".to_string() }
}
```

#### チャンク読み込みコマンド（大容量ファイル用）

```rust
// src-tauri/src/commands/file_io.rs
#[tauri::command]
pub async fn read_file_chunk(
    path: String,
    offset: u64,
    length: u64,
) -> Result<String, String> {
    use std::io::{Read, Seek, SeekFrom};
    
    let mut file = std::fs::File::open(&path)
        .map_err(|e| e.to_string())?;
    file.seek(SeekFrom::Start(offset))
        .map_err(|e| e.to_string())?;
    
    let mut buf = vec![0u8; length as usize];
    let n = file.read(&mut buf).map_err(|e| e.to_string())?;
    
    Ok(String::from_utf8_lossy(&buf[..n]).to_string())
}

#[tauri::command]
pub fn get_file_size(path: String) -> Result<u64, String> {
    std::fs::metadata(&path)
        .map(|m| m.len())
        .map_err(|e| e.to_string())
}
```

### 4.6 大容量ファイル処理フロー

```
ファイルオープン
      ↓
get_file_size() で事前チェック
      ↓
┌─────────────────────────────────────┐
│ ～50MB     → 通常読み込み（フル機能）  │
│ 50～200MB  → 読み込み継続の確認ダイアログ表示│
│            → 確認後チャンク読み込み  │
│ 200MB超    → 警告 + 制限モード提案   │
└─────────────────────────────────────┘
      ↓
ステータスバーにファイルサイズ表示
```

---

## 5. UIコンポーネント設計

### 5.1 ステータスバー

```
[ Shift-JIS ▾ ] [ CRLF ▾ ] | 行: 42  列: 8  | 1,024 KB | UTF-8で再読み込み
```

- エンコーディング名：クリックでドロップダウン → 選択で再読み込み
- 改行コード：クリックで CRLF / LF / CR 切り替え
- 行・列番号：リアルタイム更新
- ファイルサイズ：KB/MB で自動切り替え表示

### 5.2 ファイルサイズ警告ダイアログ

```
⚠️ 大容量ファイル

このファイルは 87.3 MB あります。
50MB を超えるファイルは一部の操作が
遅くなる場合があります。

[ キャンセル ]  [ 読み込む ]
```

---

## 6. 開発ロードマップ

### Phase 1：基盤構築 ✅ 完了
- [x] Tauri v2 プロジェクト初期化（`create-tauri-app`）
- [x] CodeMirror 6 統合（基本エクステンション）
- [x] ファイル開く / 保存（txt / md / csv / tsv）
- [x] ステータスバー基本UI（エンコーディング、改行コード、行列番号、ファイルサイズ）

### Phase 2：コア機能実装 ✅ 完了
- [x] 矩形選択（`@codemirror/rectangular-selection` 有効化）
- [x] 正規表現 検索 / 置換（`@codemirror/search` 有効化）
- [x] エンコーディング検出・表示（encoding_rs + chardetng）
- [x] エンコーディング手動変更UI（ステータスバークリックで再読み込み）
- [x] CSV/TSV モード（区切り検出・Tab移動・列ハイライト）
- [x] ファイルサイズ判定・警告ダイアログ（50MB警告、200MB超は読み取り専用）
- [x] ライト / ダークテーマ（OS追従）

### Phase 3：UI改善・設定 ✅ 完了
- [x] メニューバー（ファイル / 編集 / 表示）
- [x] 新規作成・開く・保存・終了
- [x] 最近開いたファイル（最大10件、localStorage永続化）
- [x] 保存確認ダイアログ（新規作成・開く・終了時）
- [x] ウィンドウ閉じボタンのインターセプト（保存確認付き）
- [x] 設定ダイアログ（フォント種類・サイズ・文字色・背景色）
- [x] 設定の永続化（localStorage）
- [x] フォントサイズ変更時のテキスト保護（Compartment による動的再構成）
- [x] ルーラー（文字幅の正確な測定、ウィンドウ幅全体に表示）
- [x] 空白文字の可視化
- [x] 折り返しモード（なし / ウィンドウ幅 / 指定文字数）

### Phase 4：仕上げ — 未着手
- [ ] キーバインド一覧（ヘルプパネル）
- [ ] 50MB超チャンク読み込み実装
- [ ] 基本的なパフォーマンステスト
- [ ] アプリアイコンの作成
- [ ] ビルド・配布設定（CI/CD）

---

## 7. 注意事項・既知の制約

### エンコーディング
- chardetng は **Shift-JIS中にASCIIが多い場合**に誤検出することがある
- 誤検出時はユーザーが手動でエンコーディングを選択できるフォールバックUIを必ず用意すること
- BOM付きファイルは読み込み時のエンコーディングを保持し、同じ形式で保存する（特にExcelとの互換性のためBOM付きCSVは重要）

### 大容量ファイル
- 50MB を「正式サポート上限」として明記し、超過時は警告を表示する
- CodeMirror 6 はデフォルトで全文をメモリに展開するため、200MB超ではチャンク処理が必須
- チャンク読み込み中はプログレスインジケーターを表示する

### CSV テーブルビュー（v2.0以降）
- テキストモードとテーブルビューの**双方向同期**は実装複雑度が高い
- v1.0 では「テキストで編集」のみとし、テーブルビューは v2.0 以降で対応する
- v2.0 ではTanStack Table v8（MIT、ヘッドレス）を採用予定

---

## 8. 参考リンク

| 技術 | URL |
|------|-----|
| Tauri v2 公式 | https://v2.tauri.app/ |
| CodeMirror 6 公式 | https://codemirror.net/ |
| @codemirror/search | https://codemirror.net/docs/ref/#search |
| @codemirror/rectangular-selection | https://codemirror.net/docs/ref/#rectangular-selection |
| CodeMirror 百万行デモ | https://codemirror.net/examples/million-lines/ |
| encoding_rs (docs.rs) | https://docs.rs/encoding_rs/ |
| chardetng (docs.rs) | https://docs.rs/chardetng/ |
| TanStack Table v8 | https://tanstack.com/table/v8 |

---

*このドキュメントはClaudeとの対話から生成されました（2026-03-06）*
*最終更新：2026-03-08（ロードマップ・ディレクトリ構成を実装状況に合わせて更新）*
