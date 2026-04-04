use encoding_rs::*;

#[tauri::command]
pub fn write_file(
    path: String,
    content: String,
    encoding_name: String,
    has_bom: bool,
    line_ending: String,
) -> Result<(), String> {
    let text = match line_ending.as_str() {
        "CRLF" => content.replace('\n', "\r\n"),
        "CR" => content.replace('\n', "\r"),
        _ => content,
    };

    let encoding = Encoding::for_label(encoding_name.as_bytes())
        .ok_or_else(|| format!("Unknown encoding: {}", encoding_name))?;

    let encoded_bytes = if encoding == UTF_8 {
        text.into_bytes()
    } else {
        let (encoded, _, _) = encoding.encode(&text);
        encoded.into_owned()
    };

    let mut output = Vec::new();
    if has_bom {
        match encoding.name() {
            "UTF-8" => output.extend_from_slice(&[0xEF, 0xBB, 0xBF]),
            "UTF-16LE" => output.extend_from_slice(&[0xFF, 0xFE]),
            "UTF-16BE" => output.extend_from_slice(&[0xFE, 0xFF]),
            _ => {}
        }
    }
    output.extend_from_slice(&encoded_bytes);

    std::fs::write(&path, output).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_file_chunk(path: String, offset: u64, length: u64) -> Result<String, String> {
    use std::io::{Read, Seek, SeekFrom};

    let mut file = std::fs::File::open(&path).map_err(|e| e.to_string())?;
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
