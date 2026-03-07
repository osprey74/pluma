use chardetng::EncodingDetector;
use encoding_rs::*;
use serde::Serialize;

#[derive(Serialize)]
pub struct FileContent {
    pub text: String,
    pub encoding: String,
    pub has_bom: bool,
    pub line_ending: String,
    pub file_size: u64,
}

#[tauri::command]
pub fn read_file(path: String) -> Result<FileContent, String> {
    let raw_bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    let file_size = raw_bytes.len() as u64;

    let (encoding, has_bom, bom_len) = detect_bom(&raw_bytes);

    let encoding = if has_bom {
        encoding
    } else {
        let mut detector = EncodingDetector::new();
        detector.feed(&raw_bytes, true);
        detector.guess(None, true)
    };

    let content_bytes = if has_bom {
        &raw_bytes[bom_len..]
    } else {
        &raw_bytes
    };
    let (decoded, _, _) = encoding.decode(content_bytes);
    let text = decoded.into_owned();

    let line_ending = detect_line_ending(&text);

    Ok(FileContent {
        text,
        encoding: encoding.name().to_string(),
        has_bom,
        line_ending,
        file_size,
    })
}

#[tauri::command]
pub fn read_file_with_encoding(path: String, encoding_name: String) -> Result<FileContent, String> {
    let raw_bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    let file_size = raw_bytes.len() as u64;

    let (_, has_bom, bom_len) = detect_bom(&raw_bytes);

    let encoding = Encoding::for_label(encoding_name.as_bytes())
        .ok_or_else(|| format!("Unknown encoding: {}", encoding_name))?;

    let content_bytes = if has_bom {
        &raw_bytes[bom_len..]
    } else {
        &raw_bytes
    };
    let (decoded, _, _) = encoding.decode(content_bytes);
    let text = decoded.into_owned();

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
        return (UTF_8, true, 3);
    }
    if bytes.starts_with(&[0xFF, 0xFE]) {
        return (UTF_16LE, true, 2);
    }
    if bytes.starts_with(&[0xFE, 0xFF]) {
        return (UTF_16BE, true, 2);
    }
    (UTF_8, false, 0)
}

fn detect_line_ending(text: &str) -> String {
    if text.contains("\r\n") {
        "CRLF".to_string()
    } else if text.contains('\r') {
        "CR".to_string()
    } else {
        "LF".to_string()
    }
}
