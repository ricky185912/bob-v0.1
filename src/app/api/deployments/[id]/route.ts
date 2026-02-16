import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params Promise to get the actual params object
    const { id } = await params;
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    if (body.action === "soft-delete") {
      // Check if deployment belongs to user
      const deployment = await sql`
        SELECT id FROM deployments 
        WHERE id = ${id} AND user_id = ${session.user.id}
      `;

      if (deployment.length === 0) {
        return NextResponse.json(
          { error: "Deployment not found" },
          { status: 404 }
        );
      }

      // Soft delete by setting deleted_at
      const [updated] = await sql`
        UPDATE deployments 
        SET deleted_at = NOW(), status = 'DELETED'
        WHERE id = ${id} AND user_id = ${session.user.id}
        RETURNING id, url, status
      `;

      return NextResponse.json({
        success: true,
        deployment: updated,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("Update deployment error:", error);
    return NextResponse.json(
      { error: "Failed to update deployment" },
      { status: 500 }
    );
  }
}