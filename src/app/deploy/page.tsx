/* eslint-disable */
"use client";

import { useState, useCallback } from "react";
import { Upload, Package, Hash, Link2, AlertCircle } from "lucide-react";

export default function DeployPage() {
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    hash?: string;
    url?: string;
    error?: string;
  } | null>(null);

  const validateZip = useCallback((zip: File) => {
    if (!zip.name.toLowerCase().endsWith('.zip')) return "Only ZIP files allowed";
    if (zip.size > 50 * 1024 * 1024) return "Max 50MB";
    return null;
  }, []);

  const handleUpload = async () => {
    if (!file || !projectName) {
      setResult({ error: "Add project name and ZIP file" });
      return;
    }

    const validationError = validateZip(file);
    if (validationError) {
      setResult({ error: validationError });
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      // Step 1: Create artifact with ACTUAL FILE
      const hash = await calculateHash(file);
      
      // Use FormData to send the file
      const formData = new FormData();
      formData.append('zip', file);
      formData.append('hash', hash);

      console.log("Uploading artifact with hash:", hash.substring(0, 16));

      const artifactRes = await fetch("/api/artifacts", {
        method: "POST",
        body: formData,
      });

      const artifactData = await artifactRes.json();
      console.log("Artifact response:", artifactData);
      
      if (!artifactData.success) {
        throw new Error(artifactData.error || "Failed to create artifact");
      }

      const artifactId = artifactData.artifact?.id || artifactData.artifactId;
      
      if (!artifactId) {
        console.error("No artifact ID found in response:", artifactData);
        throw new Error("Server did not return artifact ID");
      }

      console.log("Using artifact ID:", artifactId);

      // Step 2: Create deployment
      console.log("Creating deployment with:", {
        artifactId,
        url: `${projectName}.bob`
      });

      const deploymentRes = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifactId,
          url: `${projectName}.bob`,
        }),
      });

      const deploymentData = await deploymentRes.json();
      console.log("Deployment response:", deploymentData);
      
      if (deploymentData.success) {
        // FIXED: Use access_url from API response which is /deploy/project-name.bob
        setResult({
          hash: hash.substring(0, 16),
          url: deploymentData.accessUrl || `/deploy/${projectName}.bob`,
        });
        
        // Clear form on success
        setFile(null);
        setProjectName("");
      } else {
        setResult({ error: deploymentData.error || "Deployment failed" });
      }
    } catch (error: unknown) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      setResult({ error: errorMessage });
    } finally {
      setUploading(false);
    }
  };

  // Helper: Calculate file hash
  const calculateHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  return (
    <div className="min-h-screen bg-black text-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header - Perfect Center */}
        <div className="text-center mb-24">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-3xl flex items-center justify-center glow mb-8">
            <Upload className="w-12 h-12 text-orange-400" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-6">Deploy Site</h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Upload ZIP → Get permanent URL. Immutable. No overwrites.
          </p>
        </div>

        {/* MAIN CONTENT - DEAD CENTER */}
        <div className="flex flex-col lg:flex-row gap-12 items-stretch justify-center">
          {/* Upload Box - FULLY CENTERED */}
          <div className="flex-1 max-w-2xl flex flex-col items-center justify-center lg:items-start">
            <div 
              className={`w-full max-w-md h-80 border-4 border-dashed border-zinc-700 rounded-3xl flex flex-col items-center justify-center p-12 transition-all duration-300 hover:border-orange-500/50 hover:bg-zinc-950/30 group ${
                file ? 'border-orange-500/50 bg-orange-500/5 glow shadow-2xl' : ''
              }`}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile) setFile(droppedFile);
              }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              {file ? (
                <>
                  <Package className="w-20 h-20 text-orange-400 mb-6 opacity-80" />
                  <div className="text-center space-y-2">
                    <p className="text-xl font-semibold truncate max-w-[200px]">{file.name}</p>
                    <p className="text-zinc-500 text-sm">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button 
                    onClick={() => setFile(null)}
                    className="mt-6 px-6 py-2 border border-zinc-700 rounded-xl hover:border-zinc-600 hover:bg-zinc-900 text-sm transition-all glow"
                  >
                    Change file
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-24 h-24 text-zinc-500 mb-8 group-hover:scale-110 group-hover:text-orange-400 transition-all duration-200" />
                  <div className="text-center space-y-3">
                    <p className="text-2xl font-semibold mb-1">Drop ZIP here</p>
                    <p className="text-zinc-500 text-lg">or click to browse</p>
                    <p className="text-sm text-zinc-500">Pure HTML/CSS/JS • Max 50MB • Needs index.html</p>
                  </div>
                </>
              )}
              <input
                id="file-upload"
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) setFile(selected);
                }}
              />
            </div>

            {/* Project Name - Perfectly Aligned */}
            <div className="w-full max-w-md mt-12 space-y-4">
              <label className="flex items-center gap-3 text-sm font-semibold text-zinc-300">
                Project Name
              </label>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-site-v1"
                className="w-full rounded-2xl bg-zinc-900/50 border border-zinc-700/50 hover:border-zinc-600 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 px-6 py-4 text-lg placeholder-zinc-500 transition-all"
                disabled={uploading}
              />
            </div>

            {/* Deploy Button - Perfect Center */}
            <button
              onClick={handleUpload}
              disabled={!file || !projectName || uploading}
              className="btn-primary glow w-full max-w-md h-16 mt-12 font-semibold text-xl shadow-2xl hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {uploading ? (
                <>
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3 inline-block" />
                  Deploying...
                </>
              ) : (
                "Deploy Site → Get Permanent URL"
              )}
            </button>
          </div>

          {/* Result Panel - Right Side Perfect */}
          <div className="flex-1 lg:min-w-[400px] flex flex-col justify-center">
            {result?.error && (
              <div className="card bg-red-500/5 border-red-500/30 p-8 rounded-2xl self-center max-w-md">
                <AlertCircle className="w-12 h-12 text-red-400 mb-6 mx-auto" />
                <p className="text-red-300 text-lg text-center">{result.error}</p>
              </div>
            )}

            {result?.hash && (
              <div className="card p-8 rounded-2xl glow self-center max-w-md">
                <div className="text-center space-y-6">
                  <Hash className="w-16 h-16 text-orange-400 mx-auto glow" />
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold">Deployed!</h3>
                    <div className="bg-zinc-950/50 rounded-xl p-4">
                      <p className="text-sm text-zinc-400 mb-2">Artifact Hash</p>
                      <code className="font-mono text-orange-400 break-all text-sm block text-center">
                        {result.hash}
                      </code>
                    </div>
                    {result.url && (
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary glow w-full h-14 flex items-center justify-center font-semibold shadow-2xl hover:shadow-orange-500/25"
                      >
                        <Link2 className="w-5 h-5 mr-2" />
                        Open Site
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}