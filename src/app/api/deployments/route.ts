import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface DeploymentList {
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

export async function GET(): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deployments = await sql<DeploymentList[]>`
      SELECT 
        d.id, d.url, d.status, d.created_at,
        a.hash, a.size, a.file_count,
        CONCAT('/deploy/', d.url) as access_url,
        REPLACE(d.url, '.bob', '') as display_name
      FROM deployments d
      JOIN artifacts a ON d.artifact_id = a.id
      WHERE d.user_id = ${session.user.id}
        AND d.deleted_at IS NULL
      ORDER BY d.created_at DESC
    `;

    return Response.json({ 
      success: true, 
      deployments,
      count: deployments.length
    });
  } catch (error: unknown) {
    console.error("Deployments list error:", error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
