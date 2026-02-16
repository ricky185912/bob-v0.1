import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
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

    // Get deployment with artifact info
    const deployment = await sql`
      SELECT d.id, d.artifact_id, a.hash
      FROM deployments d
      JOIN artifacts a ON d.artifact_id = a.id
      WHERE d.id = ${id} AND d.user_id = ${session.user.id}
    `;

    if (deployment.length === 0) {
      return NextResponse.json(
        { success: false, error: "Deployment not found" },
        { status: 404 }
      );
    }

    const { artifact_id, hash } = deployment[0];

    // Check if this artifact is used by any other NON-deleted deployments
    const otherDeployments = await sql`
      SELECT COUNT(*)::int as count
      FROM deployments
      WHERE artifact_id = ${artifact_id}
        AND id != ${id}
        AND deleted_at IS NULL
    `;

    console.log("Other deployments using artifact:", otherDeployments[0].count);

    // If this is the last active deployment using this artifact, delete from storage
    if (otherDeployments[0].count === 0) {
      const supabase = await createClient();
      
      // Delete artifact files from storage
      const { error: storageError } = await supabase.storage
        .from("artifacts")
        .remove([hash]);

      if (storageError) {
        console.error("Failed to delete artifact from storage:", storageError);
        // Continue anyway - we'll delete the records
      } else {
        console.log("Successfully deleted artifact from storage:", hash);
      }

      // Delete the artifact first (foreign key constraint might require order)
      await sql`DELETE FROM artifacts WHERE id = ${artifact_id}`;
      console.log("Deleted artifact record from DB:", artifact_id);
      
      // Delete the deployment (should cascade or be handled by FK, but doing explicitly)
      await sql`DELETE FROM deployments WHERE id = ${id}`;
      console.log("Deleted deployment record from DB:", id);
    } else {
      // Just delete the deployment, keep artifact for other deployments
      await sql`DELETE FROM deployments WHERE id = ${id}`;
      console.log("Deleted deployment record from DB (artifact kept):", id);
    }

    return NextResponse.json({
      success: true,
      message: "Deployment permanently deleted",
    });
  } catch (error: unknown) {
    console.error("Permanent delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete deployment" },
      { status: 500 }
    );
  }
}