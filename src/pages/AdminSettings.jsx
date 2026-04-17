import { useState } from "react";

export default function Settings() {
  const [status, setStatus] = useState("");

  const testPrint = async () => {
    setStatus("Sending print request...");

    try {
      const res = await fetch("http://127.0.0.1:1811/print", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: "TNH TEST PRINT\n\nPrinter bridge is working.\n\n---\n",
      });

      const text = await res.text();

      setStatus(`Response: ${res.status} ${text}`);
      alert(`Printer response: ${res.status} ${text}`);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
      alert(`Printer error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Settings</h1>

      <p>Printer Bridge Test</p>

      <button
        onClick={testPrint}
        style={{
          padding: "12px 20px",
          fontSize: "16px",
          marginTop: "10px",
          backgroundColor: "#000",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Test Printer
      </button>

      <p style={{ marginTop: "20px" }}>
        Status: {status || "Idle"}
      </p>
    </div>
  );
}