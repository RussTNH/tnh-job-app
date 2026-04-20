import { useState } from "react";

export default function AdminSettings() {
  const [status, setStatus] = useState("Idle");

  const testPrint = async () => {
    setStatus("Sending test print...");

    try {
      const res = await fetch("http://127.0.0.1:1811/print", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body:
          "TNH TEST PRINT\n\nPrinter bridge is working.\n\n---\n",
      });

      const text = await res.text();
      setStatus(`Printer response: ${res.status} ${text}`);
    } catch (err) {
      const message = err?.message || "Unknown error";
      setStatus(`Printer error: ${message}`);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Admin Settings</h1>

      {/* PRINTER SECTION */}
      <div
        style={{
          marginTop: "20px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          maxWidth: "500px",
        }}
      >
        <h2 style={{ marginBottom: "10px" }}>Printer</h2>

        <p style={{ fontSize: "14px", color: "#666" }}>
          Use this to test the connection between the web app and the
          Android printer bridge.
        </p>

        <button
          onClick={testPrint}
          style={{
            padding: "10px 16px",
            fontSize: "14px",
            marginTop: "10px",
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Test Print
        </button>

        <div
          style={{
            marginTop: "15px",
            fontSize: "13px",
            color: "#333",
          }}
        >
          <strong>Status:</strong> {status}
        </div>
      </div>
    </div>
  );
}