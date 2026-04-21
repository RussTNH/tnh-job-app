export function printViaBridge(text) {
  if (!text) return;

  try {
    const url = "tnhprinter://print?text=" + encodeURIComponent(text);
    window.location.href = url;
  } catch (err) {
    console.error("Printer bridge error:", err);
    alert("Printer bridge failed to open");
  }
}

export function buildSimpleTestPrint() {
  return [
    "TNH TEST PRINT",
    "",
    "Printer bridge is working.",
    "",
    "------------------------------",
    "",
    ""
  ].join("\n");
}