"""Directory browser dialog utility for selecting folders locally."""

import sys
import subprocess
from pathlib import Path


def open_folder_dialog() -> str:
    """Prompt the user with a native OS folder dialog and return the selected path.

    Returns an empty string if cancelled or closed without selection.
    """
    # 1. Try Tkinter in an isolated subprocess with its own UI message pump
    tk_code = (
        "import tkinter as tk\n"
        "from tkinter import filedialog\n"
        "try:\n"
        "    root = tk.Tk()\n"
        "    root.withdraw()\n"
        "    root.attributes('-topmost', True)\n"
        "    root.focus_force()\n"
        "    folder = filedialog.askdirectory(title='Select Project Folder')\n"
        "    root.destroy()\n"
        "    if folder:\n"
        "        print(folder, end='')\n"
        "except Exception:\n"
        "    pass\n"
    )
    try:
        proc = subprocess.run(
            [sys.executable, "-c", tk_code],
            capture_output=True,
            text=True,
            timeout=180,
        )
        selected = proc.stdout.strip()
        if selected and Path(selected).is_dir():
            return selected
    except Exception:
        pass

    # 2. Windows fallback using PowerShell FolderBrowserDialog
    if sys.platform == "win32":
        ps_code = (
            "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; "
            "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog; "
            "$dialog.Description = 'Select Project Folder'; "
            "$dialog.ShowNewFolderButton = $true; "
            "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { "
            "    [Console]::Write($dialog.SelectedPath) "
            "}"
        )
        try:
            proc = subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_code],
                capture_output=True,
                text=True,
                timeout=180,
            )
            selected = proc.stdout.strip()
            if selected and Path(selected).is_dir():
                return selected
        except Exception:
            pass

    return ""
