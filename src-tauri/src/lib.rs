mod commands;

use commands::cli::get_cli_file_args;
use commands::encoding::{read_file, read_file_with_encoding};
use commands::file_io::{get_file_size, read_file_chunk, write_file};
use commands::print::print_to_pdf;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_cli_file_args,
            read_file,
            read_file_with_encoding,
            write_file,
            read_file_chunk,
            get_file_size,
            print_to_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
