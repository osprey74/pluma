use tauri::WebviewWindow;

/// Generate a PDF via CDP Page.printToPDF with custom footer (page numbers),
/// save to a temp file, and open it with the default PDF viewer.
#[tauri::command]
pub async fn print_to_pdf(
    window: WebviewWindow,
    file_name: String,
) -> Result<String, String> {
    #[cfg(windows)]
    {
        use webview2_com::Microsoft::Web::WebView2::Win32::*;
        use windows_core::HSTRING;
        use std::sync::{Arc, Mutex, Condvar};

        // Create temp file path
        let temp_dir = std::env::temp_dir().join("pluma-print");
        std::fs::create_dir_all(&temp_dir).map_err(|e| format!("mkdir: {e}"))?;
        let pdf_path = temp_dir.join(format!("{file_name}.pdf"));
        let pdf_path_str = pdf_path.to_string_lossy().to_string();

        let result: Arc<(Mutex<Option<Result<(), String>>>, Condvar)> =
            Arc::new((Mutex::new(None), Condvar::new()));
        let result_clone = result.clone();
        let path_clone = pdf_path_str.clone();

        window.with_webview(move |webview| {
            unsafe {
                let core: ICoreWebView2 = webview.controller().CoreWebView2().unwrap();

                let header_html = r#"<div style="font-size:8px;width:100%;text-align:center;color:#666;"><span class="title"></span></div>"#;
                let footer_html = r#"<div style="font-size:8px;width:100%;display:flex;justify-content:space-between;padding:0 10mm;color:#666;"><span class="date"></span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>"#;

                let params = serde_json::json!({
                    "landscape": false,
                    "displayHeaderFooter": true,
                    "headerTemplate": header_html,
                    "footerTemplate": footer_html,
                    "printBackground": false,
                    "marginTop": 0.4,
                    "marginBottom": 0.5,
                    "marginLeft": 0.4,
                    "marginRight": 0.4,
                    "paperWidth": 8.27,
                    "paperHeight": 11.69
                });

                let method = HSTRING::from("Page.printToPDF");
                let params_str = HSTRING::from(params.to_string().as_str());

                let result_inner = result_clone;
                let path_inner = path_clone;

                let handler = webview2_com::CallDevToolsProtocolMethodCompletedHandler::create(
                    Box::new(move |_hresult, result_json| {
                        let res = (|| {
                            let json_str = &result_json;
                            let parsed: serde_json::Value = serde_json::from_str(&json_str)
                                .map_err(|e| format!("JSON parse: {e}"))?;
                            let data = parsed.get("data")
                                .and_then(|v| v.as_str())
                                .ok_or("No PDF data in response")?;

                            // Decode base64
                            let decoded = base64_decode(data)?;
                            std::fs::write(&path_inner, &decoded)
                                .map_err(|e| format!("write: {e}"))?;
                            Ok(())
                        })();

                        let (lock, cvar) = &*result_inner;
                        *lock.lock().unwrap() = Some(res);
                        cvar.notify_one();
                        Ok(())
                    }),
                );

                let _ = core.CallDevToolsProtocolMethod(&method, &params_str, &handler);
            }
        }).map_err(|e| format!("webview: {e:?}"))?;

        // Wait for callback
        let (lock, cvar) = &*result;
        let mut guard = lock.lock().unwrap();
        let timeout = std::time::Duration::from_secs(30);
        while guard.is_none() {
            let (g, wait_result) = cvar.wait_timeout(guard, timeout).unwrap();
            guard = g;
            if wait_result.timed_out() {
                return Err("PDF generation timed out".to_string());
            }
        }

        guard.take().unwrap()?;

        // Open the PDF
        opener::open(&pdf_path_str).map_err(|e| format!("open: {e}"))?;
        Ok(pdf_path_str)
    }

    #[cfg(not(windows))]
    {
        let _ = (window, file_name);
        Err("PDF printing is only available on Windows".to_string())
    }
}

#[cfg(windows)]
fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    let table: [u8; 256] = {
        let mut t = [255u8; 256];
        for (i, &c) in b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".iter().enumerate() {
            t[c as usize] = i as u8;
        }
        t[b'=' as usize] = 0;
        t
    };

    let mut output = Vec::with_capacity(input.len() * 3 / 4);
    let mut buf = 0u32;
    let mut bits = 0u32;

    for &byte in input.as_bytes() {
        if byte == b'\n' || byte == b'\r' || byte == b' ' { continue; }
        if byte == b'=' { break; }
        let val = table[byte as usize];
        if val == 255 { return Err(format!("invalid base64 char: {}", byte as char)); }
        buf = (buf << 6) | val as u32;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            output.push((buf >> bits) as u8);
            buf &= (1 << bits) - 1;
        }
    }
    Ok(output)
}
