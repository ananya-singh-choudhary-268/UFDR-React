// UploadUFDR.jsx
import React, { useState, useRef } from "react";

/**
 * UploadUFDR.jsx
 * - Talks to backend:
 *    POST /api/uploads/init
 *    PUT  presigned URLs (MinIO)
 *    PUT  /api/uploads/{id}/complete
 *    GET  /api/uploads/{id}/ingest-progress
 *
 * Notes:
 * - Uses REACT_APP_API_URL if set, otherwise uses relative /api (works with CRA proxy)
 * - Keeps concurrency low and slices file on client
 * - Extracts ETag header and sends it on complete
 */

const API_BASE = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/$/, "")
  : "";

function apiUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

function humanBytes(n) {
  if (n == null) return "0 B";
  if (typeof n !== "number") return String(n);
  if (n === 0) return "0 B";
  const i = Math.floor(Math.log(n) / Math.log(1024));
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  return (n / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
}

// Simple formatter for ETA in seconds → "Xs", "Xm Ys", "Xh Ym"
function formatEta(seconds) {
  if (seconds == null || !isFinite(seconds) || seconds < 0) return null;
  const s = Math.round(seconds);
  if (s <= 0) return "a few seconds";
  if (s < 60) return `${s} sec`;
  const m = Math.floor(s / 60);
  const remS = s % 60;
  if (m < 60) {
    if (remS === 0) return `${m} min`;
    return `${m} min ${remS} sec`;
  }
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (remM === 0) return `${h} hr`;
  return `${h} hr ${remM} min`;
}

export default function UploadUFDR({ onExtractionStart, onExtractionComplete }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle, initiating, uploading, completing, queued_for_ingest, completed, error, aborted, failed
  const [message, setMessage] = useState(null);
  const [progress, setProgress] = useState({ uploadedBytes: 0, totalBytes: 0 });

  // For aborting upload
  const abortControllerRef = useRef(null);

  // For ETA calculation
  const [etaSeconds, setEtaSeconds] = useState(null);
  const startTimeRef = useRef(null);

  // For UI after completion
  const [showSuccess, setShowSuccess] = useState(false);
  const [hidden, setHidden] = useState(false); // when true, component disappears completely

  // Tunable concurrency for multipart upload
  const concurrency = 3;

  // If we've auto-hidden, render nothing (chat goes back to normal layout)
  if (hidden) {
    return null;
  }

  const onFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setMessage(null);
    setStatus("idle");
    setProgress({ uploadedBytes: 0, totalBytes: 0 });
    setEtaSeconds(null);
    startTimeRef.current = null;
  };

  const postJSON = async (path, body) => {
    const res = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok)
      throw new Error(`POST ${path} failed (${res.status}): ${text}`);
    return JSON.parse(text || "{}");
  };

  const putJSON = async (path, body) => {
    const res = await fetch(apiUrl(path), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`PUT ${path} failed (${res.status}): ${text}`);
    return JSON.parse(text || "{}");
  };

  const uploadToPresignedUrl = async (url, blob) => {
    // Perform the PUT to the presigned URL. Returns the ETag (may include quotes) or null.
    const res = await fetch(url, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": "application/octet-stream" },
      signal: abortControllerRef.current?.signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Storage PUT failed: ${res.status} ${t}`);
    }
    // ETag is commonly returned; keep it exactly as returned (including quotes)
    const etag = res.headers.get("ETag") || res.headers.get("etag") || null;
    return etag;
  };

  const startPollProgress = (id) => {
    let running = true;
    const tick = async () => {
      if (!running) return;
      try {
        const res = await fetch(apiUrl(`/api/uploads/${id}/ingest-progress`));
        if (res.ok) {
          const d = await res.json();
          if (d.processed || d.total) {
            setProgress((p) => ({
              ...p,
              uploadedBytes: d.processed || 0,
              totalBytes: d.total || p.totalBytes,
            }));
          }
          if (
            d.status === "done" ||
            d.status === "completed" ||
            d.status === "failed"
          ) {
            const finalStatus = d.status === "failed" ? "failed" : "completed";
            setStatus(finalStatus);
            setMessage(d);
            // We are already hiding after upload complete; no extra UI change here
            running = false;
            return;
          }
        }
      } catch (e) {
        // ignore transient errors
      }
      setTimeout(tick, 2000);
    };
    tick();
    return () => (running = false);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Choose a file first");
      return;
    }

    setStatus("initiating");
    setMessage(null);
    setEtaSeconds(null);
    startTimeRef.current = null;
    abortControllerRef.current = new AbortController();

    try {
      // 1) init
      const initResp = await postJSON("/api/uploads/init", {
        filename: file.name,
        size: file.size,
        session_id: "web-session",
      });

      if (!initResp || !initResp.upload_id || !initResp.parts) {
        throw new Error("Invalid init response from server");
      }

      setProgress({ uploadedBytes: 0, totalBytes: file.size });
      setStatus("uploading");
      startTimeRef.current = Date.now();
      setEtaSeconds(null);

      // Prepare parts info
      const partsInfo = initResp.parts; // array of { part_number, url }
      const totalParts = initResp.total_parts || partsInfo.length || 1;
      const partSize = initResp.part_size || Math.ceil(file.size / totalParts);

      const uploadedParts = [];
      let index = 0;

      const worker = async () => {
        while (true) {
          const i = index++;
          if (i >= partsInfo.length) break;
          const pinfo = partsInfo[i];
          const partNumber = pinfo.part_number;

          // slice the file for multi-part uploads
          let blobToSend = file;
          if (totalParts > 1 && partSize > 0) {
            const start = (partNumber - 1) * partSize;
            const end = Math.min(start + partSize, file.size);
            blobToSend = file.slice(start, end);
          }

          // Single attempt upload (no retry, simpler / no ESLint issues)
          const etag = await uploadToPresignedUrl(pinfo.url, blobToSend);

          // update approximate progress + ETA
          setProgress((p) => {
            const newUploaded = Math.min(
              p.uploadedBytes + (blobToSend.size || 0),
              p.totalBytes
            );
            const updated = {
              ...p,
              uploadedBytes: newUploaded,
            };

            if (startTimeRef.current && newUploaded > 0 && p.totalBytes > 0) {
              const elapsedSec =
                (Date.now() - startTimeRef.current) / 1000 || 0.1;
              const speed = newUploaded / elapsedSec; // bytes per sec
              const remainingBytes = p.totalBytes - newUploaded;
              if (remainingBytes > 0 && speed > 0) {
                setEtaSeconds(remainingBytes / speed);
              } else {
                setEtaSeconds(0);
              }
            }

            return updated;
          });
          uploadedParts.push({ part_number: partNumber, etag });
        }
      };

      // start concurrency workers
      const runners = new Array(Math.min(concurrency, partsInfo.length))
        .fill(null)
        .map(() => worker());
      await Promise.all(runners);

      setStatus("completing");
      setEtaSeconds(null); // upload finished, no more ETA

      // 3) complete - send parts list exactly as returned ETags
      const completeBody = {
        parts: uploadedParts.map((p) => ({
          part_number: p.part_number,
          etag: p.etag,
        })),
      };
      await putJSON(
        `/api/uploads/${initResp.upload_id}/complete`,
        completeBody
      );

      // 👉 At this point, file upload is done.
      // Show success, then hide component so chat UI looks normal again.
      setStatus("queued_for_ingest");
      setShowSuccess(true);

      // Notify parent that extraction is starting with the upload_id
      onExtractionStart?.(initResp.upload_id);

      setTimeout(() => {
        setShowSuccess(false);
        setHidden(true); // remove upload UI entirely
      }, 2000);

      // 4) start polling for ingest progress (runs in background now)
      startPollProgress(initResp.upload_id);
    } catch (err) {
      setEtaSeconds(null);
      startTimeRef.current = null;
      if (err.name === "AbortError") {
        setStatus("aborted");
        setMessage("Upload aborted");
      } else {
        setStatus("error");
        setMessage(err.message || String(err));
      }
    }
  };

  const abort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus("aborted");
      setEtaSeconds(null);
      startTimeRef.current = null;
    }
  };

  // While success banner is active, show only that (no file input/buttons)
  if (showSuccess) {
    return (
      <div className="p-4 rounded-2xl bg-surface-dark text-sm">
        <h3 className="text-lg font-semibold mb-2">Upload UFDR Report</h3>
        <div className="mt-1 text-sm text-green-400">
          ✅ UFDR report has been uploaded successfully.
        </div>
      </div>
    );
  }

  // Normal upload UI
  return (
    <div className="p-4 rounded-2xl bg-surface-dark text-sm">
      <h3 className="text-lg font-semibold mb-2">Upload UFDR Report</h3>

      <input type="file" onChange={onFileChange} className="mb-2" />

      {file && (
        <div className="mb-3">
          <div className="text-xs text-gray-400">
            {file.name} • {humanBytes(file.size)}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleUpload}
          disabled={
            !file ||
            status === "uploading" ||
            status === "completing" ||
            status === "queued_for_ingest"
          }
          className="px-4 py-2 bg-purple-600 text-white rounded-md disabled:opacity-50"
        >
          Upload
        </button>

        <button
          onClick={abort}
          disabled={!file || status !== "uploading"}
          className="px-3 py-2 border rounded-md text-sm"
        >
          Abort
        </button>
      </div>

      <div className="mt-4">
        <div className="text-xs text-gray-400">
          Status: <span className="font-medium">{status}</span>
        </div>
        <div className="mt-2 w-full bg-zinc-800 h-3 rounded overflow-hidden">
          <div
            className="h-3 bg-purple-500"
            style={{
              width: `${
                progress.totalBytes
                  ? (progress.uploadedBytes / progress.totalBytes) * 100
                  : 0
              }%`,
            }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {humanBytes(progress.uploadedBytes)} /{" "}
          {humanBytes(progress.totalBytes)}
        </div>

        {/* ETA only while uploading */}
        {status === "uploading" && formatEta(etaSeconds) && (
          <div className="text-xs text-gray-400 mt-1">
            Estimated time remaining: ~{formatEta(etaSeconds)}
          </div>
        )}
      </div>

      {message && status !== "aborted" && status !== "error" && (
        <pre className="mt-3 p-3 bg-black/20 rounded text-xs whitespace-pre-wrap">
          {typeof message === "string"
            ? message
            : JSON.stringify(message, null, 2)}
        </pre>
      )}

      {status === "error" && message && (
        <pre className="mt-3 p-3 bg-red-900/40 border border-red-500/40 rounded text-xs whitespace-pre-wrap">
          {typeof message === "string"
            ? message
            : JSON.stringify(message, null, 2)}
        </pre>
      )}
    </div>
  );
}
