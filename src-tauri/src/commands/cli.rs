#[tauri::command]
pub fn get_cli_file_args() -> Vec<String> {
    std::env::args()
        .skip(1)
        .filter(|arg| !arg.starts_with('-'))
        .collect()
}
