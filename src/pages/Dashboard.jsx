import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    setJobs(data || []);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>Total: {jobs.length}</div>
        <div>Open: {jobs.filter(j => j.status === "Open").length}</div>
        <div>Completed: {jobs.filter(j => j.status === "Completed").length}</div>
      </div>

      <h2 className="text-lg mb-2">Recent Jobs</h2>

      {jobs.slice(0, 5).map(job => (
        <div key={job.id} className="p-2 bg-gray-800 mb-2 rounded">
          {job.job_number} - {job.customer}
        </div>
      ))}
    </div>
  );
}