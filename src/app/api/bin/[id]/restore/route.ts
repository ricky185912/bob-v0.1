import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await the params Promise to get the actual params object
    const { id } = await params;

    // Check if deployment exists and belongs to user
    const deployment = await sql`
      SELECT id, deleted_at 
      FROM deployments 
      WHERE id = ${id} AND user_id = ${session.user.id}
    `;

    if (deployment.length === 0) {
      return NextResponse.json(
        { success: false, error: "Deployment not found" },
        { status: 404 }
      );
    }

    if (!deployment[0].deleted_at) {
      return NextResponse.json(
        { success: false, error: "Deployment is not in bin" },
        { status: 400 }
      );
    }

    // Restore by setting deleted_at to NULL
    const [restored] = await sql`
      UPDATE deployments 
      SET deleted_at = NULL, status = 'READY'
      WHERE id = ${id} AND user_id = ${session.user.id}
      RETURNING id, url, status
    `;

    return NextResponse.json({
      success: true,
      deployment: restored,
    });
  } catch (error: unknown) {
    console.error("Restore error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to restore deployment" },
      { status: 500 }
    );
  }
}