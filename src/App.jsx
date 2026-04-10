import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode.react";
import jsPDF from "jspdf";

const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseKey = "YOUR_SUPABASE_ANON_KEY";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [view, setView] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(true);

  const [form, setForm] = useState({
    customer: "",
    email: "",
    phone: "",
    fault: "",
    source: "Drop-Off"
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    const { data } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    setJobs(data || []);
  }

  function generateJobNumber(index) {
    return `TNH-${String(index + 1).padStart(5, "0")}`;
  }

  async function createJob() {
    const jobNumber = generateJobNumber(jobs.length);

    await supabase.from("jobs").insert([
      {
        ...form,
        job_number: jobNumber,
        status: "Open"
      }
    ]);

    fetchJobs();
    setView("dashboard");
  }

  async function updateStatus(id, status) {
    await supabase.from("jobs").update({ status }).eq("id", id);
    fetchJobs();
  }

  function generatePDF(job) {
    const doc = new jsPDF();
    doc.text(`TNH Job Sheet`, 10, 10);
    doc.text(`Job: ${job.job_number}`, 10, 20);
    doc.text(`Customer: ${job.customer}`, 10, 30);
    doc.text(`Fault: ${job.fault}`, 10, 40);
    doc.save(`${job.job_number}.pdf`);
  }

  return (
    <div className={darkMode ? "bg-gray-900 text-white min-h-screen p-4" : "bg-white text-black p-4"}>

      {/* HEADER */}
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-bold">TNH Job System</h1>
        <button onClick={() => setDarkMode(!darkMode)}>🌙</button>
      </div>

      {/* NAV */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setView("dashboard")}>Dashboard</button>
        <button onClick={() => setView("create")}>New Job</button>
        <button onClick={() => setView("jobs")}>Jobs</button>
      </div>

      {/* DASHBOARD */}
      {view === "dashboard" && (
        <div>
          <h2 className="text-lg mb-2">Overview</h2>
          <p>Total Jobs: {jobs.length}</p>
          <p>Open: {jobs.filter(j => j.status === "Open").length}</p>
          <p>In Progress: {jobs.filter(j => j.status === "In Progress").length}</p>
          <p>Completed: {jobs.filter(j => j.status === "Completed").length}</p>

          <h3 className="mt-4">Recent Jobs</h3>
          {jobs.slice(0, 5).map(job => (
            <div key={job.id} className="border p-2 mt-2">
              <b>{job.job_number}</b> - {job.customer}
            </div>
          ))}
        </div>
      )}

      {/* CREATE JOB */}
      {view === "create" && (
        <div>
          <h2>Create Job</h2>

          <input placeholder="Customer Name" onChange={e => setForm({ ...form, customer: e.target.value })} />
          <input placeholder="Email" onChange={e => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Phone" onChange={e => setForm({ ...form, phone: e.target.value })} />
          <textarea placeholder="Fault" onChange={e => setForm({ ...form, fault: e.target.value })} />

          <select onChange={e => setForm({ ...form, source: e.target.value })}>
            <option>Drop-Off</option>
            <option>Collection</option>
            <option>Donation</option>
          </select>

          <button onClick={createJob}>Create Job</button>
        </div>
      )}

      {/* JOB LIST */}
      {view === "jobs" && (
        <div>
          <h2>Jobs</h2>
          {jobs.map(job => (
            <div key={job.id} className="border p-3 mt-2">
              <div className="font-bold">{job.job_number}</div>
              <div>{job.customer}</div>
              <div>Status: {job.status}</div>

              <div className="flex gap-2 mt-2">
                <button onClick={() => updateStatus(job.id, "In Progress")}>Start</button>
                <button onClick={() => updateStatus(job.id, "Completed")}>Complete</button>
                <button onClick={() => generatePDF(job)}>PDF</button>
              </div>

              <div className="mt-2">
                <QRCode value={job.job_number} size={80} />
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}