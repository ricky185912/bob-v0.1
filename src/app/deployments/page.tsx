"use client";

import { useState, useEffect } from "react";
import { Package, Link2, Hash, Clock, CheckCircle2, Trash2, Trash, X, AlertCircle, Archive } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Deployment {
  id: string;
  projectName: string;
  hash: string;
  url: string;
  createdAt: string;
  status: "QUEUED" | "READY" | "FAILED";
  displayName?: string;
}

interface ApiDeployment {
  id: string;
  url: string;
  status: string;
  created_at: string;
  hash: string;
  size: number;
  file_count: number;
  access_url: string;
  display_name: string;
}

export default function DeploymentsPage() {
  const { data: session } = useSession();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deploymentToDelete, setDeploymentToDelete] = useState<Deployment | null>(null);

  useEffect(() => {
    fetchDeployments();
  }, []);

  const fetchDeployments = async () => {
    try {
      const res = await fetch("/api/deployments");
      const data = await res.json();
      
      if (data.success) {
        setDeployments(
          data.deployments?.map((d: ApiDeployment) => ({
            id: d.id,
            projectName: d.display_name || d.url.replace('.bob', ''),
            hash: d.hash,
            // FIXED: Use access_url from API which is /deploy/site-name.bob
            url: d.access_url,
            createdAt: d.created_at,
            status: d.status,
            displayName: d.display_name,
          })) || []
        );
      }
    } catch (error) {
      console.error("Failed to fetch deployments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (deployment: Deployment) => {
    setDeploymentToDelete(deployment);
    setShowDeleteModal(true);
  };

  const handleMoveToBin = async () => {
  if (!deploymentToDelete) return;
  
  setDeletingId(deploymentToDelete.id);
  try {
    const res = await fetch(`/api/deployments/${deploymentToDelete.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'soft-delete' }),
    });
    
    if (res.ok) {
      setDeployments(prev => prev.filter(d => d.id !== deploymentToDelete.id));
    }
  } catch (error) {
    console.error("Failed to move to bin:", error);
  } finally {
    setDeletingId(null);
    setShowDeleteModal(false);
    setDeploymentToDelete(null);
  }
};

  const handleDeletePermanently = async () => {
    if (!deploymentToDelete) return;
    
    setDeletingId(deploymentToDelete.id);
    try {
      // TODO: Implement delete API
      // await fetch(`/api/deployments/${deploymentToDelete.id}`, { method: 'DELETE' });
      
      // For now, just remove from UI
      setDeployments(prev => prev.filter(d => d.id !== deploymentToDelete.id));
      
      console.log(`Permanently deleted "${deploymentToDelete.projectName}"`);
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeletingId(null);
      setShowDeleteModal(false);
      setDeploymentToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center py-24">
        <div className="card p-12 text-center">
          <div className="w-12 h-12 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-6" />
          <p className="text-zinc-400">Loading deployments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-20">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-3xl flex items-center justify-center glow mb-8">
            <Package className="w-12 h-12 text-orange-400" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-6">My Sites</h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            All your immutable deployments. Each has a permanent URL.
          </p>
        </div>
        <Link
          href="/bin"
          className="flex items-center gap-2 px-6 py-3 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-700/50 rounded-xl transition-all glow group">
          <Archive className="w-4 h-4 text-zinc-400 group-hover:text-orange-400 transition-colors" />
          <span className="text-zinc-400 group-hover:text-orange-400 transition-colors">Bin</span>
        </Link>

        <div className="grid gap-6">
          {deployments.length === 0 ? (
            <div className="card p-20 text-center rounded-3xl">
              <Package className="w-24 h-24 text-zinc-500 mx-auto mb-8" />
              <h3 className="text-2xl font-semibold mb-4 text-zinc-400">No deployments yet</h3>
              <Link 
                href="/deploy"
                className="btn-primary glow inline-flex items-center gap-3 px-8 py-4 h-14 font-semibold text-lg"
              >
                Deploy your first site
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deployments.map((deployment) => (
                <div 
                  key={deployment.id}
                  className="group card hover:bg-zinc-950/50 transition-all glow hover:shadow-orange-500/25 p-8 rounded-3xl"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-orange-500 glow" />
                      <span className="font-mono text-orange-400 text-sm font-semibold">
                        {deployment.hash.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      {deployment.status === "READY" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-orange-400" />
                      )}
                      <span>{deployment.status}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-4 group-hover:text-orange-400 transition-colors">
                    {deployment.projectName}
                  </h3>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Link2 className="w-4 h-4" />
                      <span>{deployment.url.replace('http://localhost:3000/', '')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Hash className="w-4 h-4" />
                      <span>Immutable</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-6 border-t border-zinc-800">
                    <a
                      href={deployment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 text-sm bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-xl py-3 px-4 transition-all group-hover:scale-105"
                    >
                      <Link2 className="w-4 h-4" />
                      View
                    </a>
                    <button 
                      className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-all group-hover:scale-105 glow disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleDeleteClick(deployment)}
                      disabled={deletingId === deployment.id}
                      aria-label="Delete deployment"
                      type="button"
                    >
                      {deletingId === deployment.id ? (
                        <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-red-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deploymentToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="card bg-zinc-900 border border-zinc-700/50 max-w-md w-full p-8 rounded-3xl glow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Delete Deployment</h3>
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

            <p className="text-zinc-300 mb-6">
              This deployment will be removed from your list. The artifact files will remain in storage (immutable).
            </p>

            <div className="space-y-3">
              <button
                onClick={handleMoveToBin}
                disabled={deletingId === deploymentToDelete.id}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                <Trash className="w-4 h-4 text-zinc-400" />
                Move to Bin
                <span className="text-xs text-zinc-500 ml-auto">(Soft Delete)</span>
              </button>

              <button
                onClick={handleDeletePermanently}
                disabled={deletingId === deploymentToDelete.id}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {deletingId === deploymentToDelete.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Permanently
                    <span className="text-xs text-red-400/70 ml-auto">(Irreversible)</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-zinc-500 mt-6 text-center">
              Note: Artifacts are immutable and may be referenced by other deployments.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}