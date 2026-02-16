"use client";

import { useState, useEffect } from "react";
import { Package, Link2, Hash, Clock, Trash2, X, AlertCircle, RotateCcw, Archive } from "lucide-react";
import Link from "next/link";

interface DeletedDeployment {
  id: string;
  projectName: string;
  hash: string;
  url: string;
  createdAt: string;
  deletedAt: string;
  status: string;
  artifact_id: string;
}

interface ApiDeployment {
  id: string;
  url: string;
  status: string;
  created_at: string;
  deleted_at: string;
  hash: string;
  size: number;
  file_count: number;
  access_url: string;
  display_name: string;
  artifact_id: string;
}

export default function BinPage() {
  const [deployments, setDeployments] = useState<DeletedDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deploymentToDelete, setDeploymentToDelete] = useState<DeletedDeployment | null>(null);

  useEffect(() => {
    fetchBin();
  }, []);

  const fetchBin = async () => {
    try {
      const res = await fetch("/api/bin");
      const data = await res.json();
      
      if (data.success) {
        setDeployments(
          data.deployments?.map((d: ApiDeployment) => ({
            id: d.id,
            projectName: d.display_name,
            hash: d.hash,
            url: `http://localhost:3000${d.access_url}`,
            createdAt: d.created_at,
            deletedAt: d.deleted_at,
            status: d.status,
            artifact_id: d.artifact_id,
          })) || []
        );
      }
    } catch (error) {
      console.error("Failed to fetch bin:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (deployment: DeletedDeployment) => {
    setProcessingId(deployment.id);
    try {
      const res = await fetch(`/api/bin/${deployment.id}/restore`, {
        method: 'POST',
      });
      
      if (res.ok) {
        setDeployments(prev => prev.filter(d => d.id !== deployment.id));
      }
    } catch (error) {
      console.error("Failed to restore:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteClick = (deployment: DeletedDeployment) => {
    setDeploymentToDelete(deployment);
    setShowDeleteModal(true);
  };

  const handleDeletePermanently = async () => {
    if (!deploymentToDelete) return;
    
    setProcessingId(deploymentToDelete.id);
    try {
      const res = await fetch(`/api/bin/${deploymentToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setDeployments(prev => prev.filter(d => d.id !== deploymentToDelete.id));
      } else {
        const data = await res.json();
        console.error("Failed to delete permanently:", data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Failed to delete permanently:", error);
    } finally {
      setProcessingId(null);
      setShowDeleteModal(false);
      setDeploymentToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center py-24">
        <div className="card p-12 text-center">
          <div className="w-12 h-12 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-6" />
          <p className="text-zinc-400">Loading bin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-center justify-between mb-20">
          <div>
            <div className="w-24 h-24 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-3xl flex items-center justify-center glow mb-8">
              <Archive className="w-12 h-12 text-orange-400" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight mb-6">Bin</h1>
            <p className="text-xl text-zinc-400 max-w-2xl">
              Soft-deleted deployments. Restore them or delete permanently.
            </p>
          </div>
          <Link
            href="/deployments"
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-700/50 rounded-xl transition-all glow"
          >
            <Package className="w-4 h-4" />
            Back to Sites
          </Link>
        </div>

        <div className="grid gap-6">
          {deployments.length === 0 ? (
            <div className="card p-20 text-center rounded-3xl">
              <Archive className="w-24 h-24 text-zinc-500 mx-auto mb-8" />
              <h3 className="text-2xl font-semibold mb-4 text-zinc-400">Bin is empty</h3>
              <p className="text-zinc-500 mb-8">
                Deleted deployments will appear here.
              </p>
              <Link 
                href="/deployments"
                className="btn-primary glow inline-flex items-center gap-3 px-8 py-4 h-14 font-semibold text-lg"
              >
                View My Sites
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deployments.map((deployment) => (
                <div 
                  key={deployment.id}
                  className="group card hover:bg-zinc-950/50 transition-all glow hover:shadow-orange-500/25 p-8 rounded-3xl border-red-500/10 hover:border-red-500/20"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500 glow" />
                      <span className="font-mono text-red-400 text-sm font-semibold">
                        {deployment.hash.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="w-4 h-4 text-red-400" />
                      <span>Deleted {formatDate(deployment.deletedAt)}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-4 group-hover:text-red-400 transition-colors">
                    {deployment.projectName}
                  </h3>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Link2 className="w-4 h-4" />
                      <span className="line-through opacity-50">{deployment.url.replace('http://localhost:3000/', '')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Hash className="w-4 h-4" />
                      <span>Immutable</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-6 border-t border-zinc-800">
                    <button
                      onClick={() => handleRestore(deployment)}
                      disabled={processingId === deployment.id}
                      className="flex-1 flex items-center justify-center gap-2 text-sm bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-xl py-3 px-4 transition-all group-hover:scale-105 disabled:opacity-50"
                    >
                      {processingId === deployment.id ? (
                        <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          Restore
                        </>
                      )}
                    </button>
                    <button 
                      className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-all group-hover:scale-105 glow disabled:opacity-50"
                      onClick={() => handleDeleteClick(deployment)}
                      disabled={processingId === deployment.id}
                      aria-label="Delete permanently"
                      type="button"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Permanent Delete Confirmation Modal */}
      {showDeleteModal && deploymentToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="card bg-zinc-900 border border-zinc-700/50 max-w-md w-full p-8 rounded-3xl glow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Delete Permanently</h3>
                  <p className="text-sm text-zinc-400 mt-1">{deploymentToDelete.projectName}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeploymentToDelete(null);
                }}
                className="p-2 hover:bg-zinc-800/50 rounded-xl transition-colors"
                aria-label="Close"
                type="button"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6">
              <p className="text-red-400 text-sm font-medium mb-2">⚠️ Irreversible Action</p>
              <p className="text-zinc-300 text-sm">
                This will permanently delete:
              </p>
              <ul className="text-zinc-400 text-sm list-disc list-inside mt-2 space-y-1">
                <li>Deployment record from database</li>
                <li>Artifact files from Supabase storage (if no other deployments use it)</li>
              </ul>
            </div>

            <p className="text-zinc-300 mb-6">
              Are you absolutely sure? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeploymentToDelete(null);
                }}
                className="flex-1 py-3 px-4 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 rounded-xl transition-all"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePermanently}
                disabled={processingId === deploymentToDelete.id}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl transition-all disabled:opacity-50"
                type="button"
              >
                {processingId === deploymentToDelete.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Forever
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}