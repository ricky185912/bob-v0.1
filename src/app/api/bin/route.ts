import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

interface BinDeployment {
  id: string;
  url: string;
  status: string;
  created_at: Date;
  deleted_at: Date | null;
  hash: string;
  size: number;
  file_count: number;
  access_url: string;
  display_name: string;
  artifact_id: string;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all soft-deleted deployments for this user
    const deployments = await sql<BinDeployment[]>`
      SELECT 
        d.id, 
        d.url, 
        d.status, 
        d.created_at,
        d.deleted_at,
        d.artifact_id,
        a.hash, 
        a.size, 
        a.file_count,
        CONCAT('/deploy/', d.url) as access_url,
        REPLACE(d.url, '.bob', '') as display_name
      FROM deployments d
      JOIN artifacts a ON d.artifact_id = a.id
      WHERE d.user_id = ${session.user.id}
        AND d.deleted_at IS NOT NULL
      ORDER BY d.deleted_at DESC
    `;

    // Convert dates to ISO strings for JSON serialization
    const serializedDeployments = deployments.map(d => ({
      ...d,
      created_at: d.created_at instanceof Date ? d.created_at.toISOString() : String(d.created_at),
      deleted_at: d.deleted_at instanceof Date ? d.deleted_at.toISOString() : 
                  d.deleted_at ? String(d.deleted_at) : null,
    }));

    return NextResponse.json({
      success: true,
      deployments: serializedDeployments,
    });
  } catch (error: unknown) {
    console.error("Bin fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bin" },
      { status: 500 }
    );
  }
}