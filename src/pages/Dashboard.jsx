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

  const open = jobs.filter(j => j.status === "Open").length;
  const progress = jobs.filter(j => j.status === "In Progress").length;
  const done = jobs.filter(j => j.status === "Completed").length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow">
          <div className="text-gray-500">Total Jobs</div>
          <div className="text-2xl font-bold">{jobs.length}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow">
          <div className="text-gray-500">Open</div>
          <div className="text-2xl font-bold">{open}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow">
          <div className="text-gray-500">Completed</div>
          <div className="text-2xl font-bold">{done}</div>
        </div>
      </div>

      {/* RECENT JOBS */}
      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="text-lg font-semibold mb-3">Recent Jobs</h2>

        {jobs.slice(0, 5).map(job => (
          <div key={job.id} className="flex justify-between border-b py-2">
            <span>{job.job_number}</span>
            <span className="text-gray-500">{job.customer}</span>
          </div>
        ))}
      </div>
    </div>
  );
}