<#
  Drive a running DCS window for unattended checks: click (e.g. the briefing's FLY), press a key, screenshot.
  Verified 2026-11-21 on DCS 2.9 MT, 3840x2160 at 150 %: FLY at physical (2623,1528); keys reach DCS only as
  SendInput SCANCODES after SetForegroundWindow (F2 = 0x3C next-unit view, F10 = 0x44 map). Virtual-key input does not.

    powershell -File scripts/dev/dcs-input.ps1 -Action click -X 2623 -Y 1528 -Shot out.png
    powershell -File scripts/dev/dcs-input.ps1 -Action key -Scan 0x3C -Shot f2.png
#>
param([string]$Action, [int]$X = 0, [int]$Y = 0, [int]$Scan = 0, [string]$Shot = '')
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type @'
using System; using System.Runtime.InteropServices;
public class DcsIn {
  [StructLayout(LayoutKind.Sequential)] public struct KI { public ushort vk, scan; public uint flags, time; public IntPtr extra; }
  [StructLayout(LayoutKind.Explicit, Size=40)] public struct IN { [FieldOffset(0)] public uint type; [FieldOffset(8)] public KI ki; }
  [DllImport("user32.dll")] public static extern uint SendInput(uint n, IN[] i, int size);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(int f, int x, int y, int d, int e);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  public static void Key(ushort scan, bool up) { var i = new IN[1]; i[0].type = 1; i[0].ki.scan = scan; i[0].ki.flags = 0x0008u | (up ? 0x0002u : 0u); SendInput(1, i, Marshal.SizeOf(typeof(IN))); }
}
'@
[DcsIn]::SetProcessDPIAware() | Out-Null
$p = Get-Process DCS -ErrorAction SilentlyContinue | Select-Object -First 1
if ($p) { [DcsIn]::SetForegroundWindow($p.MainWindowHandle) | Out-Null; Start-Sleep -Milliseconds 300 }
if ($Action -eq 'click') { [DcsIn]::SetCursorPos($X, $Y); Start-Sleep -Milliseconds 300; [DcsIn]::mouse_event(2,0,0,0,0); Start-Sleep -Milliseconds 120; [DcsIn]::mouse_event(4,0,0,0,0) }
if ($Action -eq 'key') { [DcsIn]::Key([uint16]$Scan, $false); Start-Sleep -Milliseconds 120; [DcsIn]::Key([uint16]$Scan, $true) }
if ($Shot) {
  Start-Sleep -Milliseconds 1500
  $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
  [System.Drawing.Graphics]::FromImage($bmp).CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
  $small = New-Object System.Drawing.Bitmap $bmp, 1280, 720; $small.Save($Shot); "shot $Shot"
}
