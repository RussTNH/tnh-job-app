import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

function formatBytes(bytes) {
  const num = Number(bytes || 0);
  if (!num) return "—";
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isImage(file) {
  return String(file?.mime_type || "").startsWith("image/");
}

function safeFileName(name) {
  return String(name || "file")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

export default function JobFilesPanel({ jobId }) {
  const inputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState({});
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (jobId) {
      loadFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function loadFiles() {
    setLoading(true);
    setErrorText("");

    const { data, error } = await supabase
      .from("job_files")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Load job files error:", error);
      setErrorText(error.message || "Could not load files");
      setFiles([]);
      setPreviewUrls({});
      setLoading(false);
      return;
    }

    const loadedFiles = data || [];
    setFiles(loadedFiles);

    const imageFiles = loadedFiles.filter(isImage);

    if (imageFiles.length > 0) {
      const previewMap = {};

      await Promise.all(
        imageFiles.map(async (file) => {
          const { data: signedData, error: signedError } = await supabase.storage
            .from("job-files")
            .createSignedUrl(file.file_path, 3600);

          if (signedError) {
            console.error("Preview signed URL error:", signedError);
            return;
          }

          if (signedData?.signedUrl) {
            previewMap[file.id] = signedData.signedUrl;
          }
        })
      );

      setPreviewUrls(previewMap);
    } else {
      setPreviewUrls({});
    }

    setLoading(false);
  }

  async function uploadFiles(fileList) {
    const filesArr = Array.from(fileList || []);
    if (!filesArr.length) return;

    setUploading(true);
    setErrorText("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      for (const file of filesArr) {
        const cleanName = safeFileName(file.name);
        const path = `${jobId}/${Date.now()}-${cleanName}`;

        const upload = await supabase.storage
          .from("job-files")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });

        if (upload.error) {
          throw upload.error;
        }

        const insertResult = await supabase.from("job_files").insert({
          job_id: jobId,
          file_name: file.name,
          file_path: path,
          mime_type: file.type || null,
          file_size: file.size || null,
          uploaded_by: user?.id || null,
        });

        if (insertResult.error) {
          await supabase.storage.from("job-files").remove([path]);
          throw insertResult.error;
        }
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      await loadFiles();
    } catch (error) {
      console.error("Upload files error:", error);
      setErrorText(error.message || "Could not upload files");
    } finally {
      setUploading(false);
    }
  }

  async function openFile(file) {
    setErrorText("");

    try {
      const { data, error } = await supabase.storage
        .from("job-files")
        .createSignedUrl(file.file_path, 60);

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error("Could not create file link");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Open file error:", error);
      setErrorText(error.message || "Could not open file");
    }
  }

  async function deleteFile(file) {
    const confirmed = window.confirm(`Delete file "${file.file_name}"?`);
    if (!confirmed) return;

    setErrorText("");

    try {
      const storageDelete = await supabase.storage
        .from("job-files")
        .remove([file.file_path]);

      if (storageDelete.error) {
        throw storageDelete.error;
      }

      const rowDelete = await supabase
        .from("job_files")
        .delete()
        .eq("id", file.id);

      if (rowDelete.error) {
        throw rowDelete.error;
      }

      await loadFiles();
    } catch (error) {
      console.error("Delete file error:", error);
      setErrorText(error.message || "Could not delete file");
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    uploadFiles(e.dataTransfer.files);
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Photos & Files</h2>
          <p className="mt-1 text-sm text-slate-400">
            Upload images or PDFs for record keeping. Click a file to open it in a new tab.
          </p>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`mt-4 rounded-2xl border-2 border-dashed p-6 text-center transition ${
          dragActive
            ? "border-blue-500 bg-blue-500/10"
            : "border-slate-700 bg-slate-950"
        }`}
      >
        <p className="text-slate-400">
          Drag and drop files here or click below to upload
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          onChange={(e) => uploadFiles(e.target.files)}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 rounded-2xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
        >
          Upload Files
        </button>
      </div>

      {uploading ? (
        <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
          Uploading file(s)...
        </div>
      ) : null}

      {errorText ? (
        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          {errorText}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
          Loading files...
        </div>
      ) : files.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
          No files uploaded yet.
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="rounded-2xl border border-slate-800 bg-slate-950 p-3"
            >
              {isImage(file) ? (
                previewUrls[file.id] ? (
                  <img
                    src={previewUrls[file.id]}
                    alt={file.file_name}
                    className="h-40 w-full cursor-pointer rounded-lg object-cover"
                    onClick={() => openFile(file)}
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                    Preview unavailable
                  </div>
                )
              ) : (
                <div
                  onClick={() => openFile(file)}
                  className="flex h-40 cursor-pointer items-center justify-center rounded-lg bg-slate-800 text-slate-400"
                >
                  PDF / FILE
                </div>
              )}

              <div className="mt-3 truncate text-sm font-medium text-white">
                {file.file_name}
              </div>

              <div className="mt-1 text-xs text-slate-400">
                {file.mime_type || "Unknown type"} • {formatBytes(file.file_size)}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {formatDateTime(file.created_at)}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => openFile(file)}
                  className="flex-1 rounded-xl bg-slate-800 py-2 text-xs text-white hover:bg-slate-700"
                >
                  Open
                </button>

                <button
                  type="button"
                  onClick={() => deleteFile(file)}
                  className="flex-1 rounded-xl bg-rose-500/20 py-2 text-xs text-white hover:bg-rose-500/30"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}