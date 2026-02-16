import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 50;
const NAME_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

interface DeploymentRecord {
  id: string;
  url: string;
  status: string;
  created_at: string;
  artifact_id: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    console.log("=== DEPLOYMENT CREATION START ===");
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log("❌ No session");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User ID:", session.user.id);
    
    const body = await request.json();
    console.log("Request body:", JSON.stringify(body, null, 2));

    const { url, artifactId, siteName } = body;
    const requestedName = url || siteName;
    
    if (!requestedName || !artifactId) {
      console.log("❌ Missing parameters");
      return Response.json({ 
        error: "Site name/URL and artifact ID are required"
      }, { status: 400 });
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(artifactId)) {
      return Response.json({ error: "Invalid artifact ID format" }, { status: 400 });
    }
    
    let baseName = requestedName.toLowerCase().trim();
    if (baseName.endsWith('.bob')) baseName = baseName.slice(0, -4);
    baseName = baseName.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    
    const normalizedName = baseName
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
    
    if (normalizedName.length < MIN_NAME_LENGTH || normalizedName.length > MAX_NAME_LENGTH || !NAME_REGEX.test(normalizedName)) {
      return Response.json({ error: "Invalid site name format" }, { status: 400 });
    }
    
    const deploymentUrl = `${normalizedName}.bob`;
    console.log('Normalized deployment URL:', deploymentUrl);
    
    // Check existing deployment
    const existing = await sql`SELECT id FROM deployments WHERE "url" = ${deploymentUrl}`;
    if (existing.length > 0) {
      return Response.json({ error: "Deployment already exists" }, { status: 409 });
    }
    
    // Check artifact exists
    const artifactCheck = await sql`SELECT id FROM artifacts WHERE id = ${artifactId}`;
    if (artifactCheck.length === 0) {
      return Response.json({ error: "Artifact not found" }, { status: 404 });
    }
    
    // User deployment limit
    const MAX_DEPLOYMENTS = 50;
    const userCount = await sql`SELECT COUNT(*)::int as count FROM deployments WHERE user_id = ${session.user.id}`;
    if (userCount[0].count >= MAX_DEPLOYMENTS) {
      return Response.json({ error: `Max ${MAX_DEPLOYMENTS} deployments reached` }, { status: 400 });
    }
    
    // Create deployment
    const [deployment] = await sql<DeploymentRecord[]>`
      INSERT INTO deployments ("url", artifact_id, user_id, status) 
      VALUES (${deploymentUrl}, ${artifactId}, ${session.user.id}, 'READY') 
      RETURNING id, "url", status, created_at, artifact_id
    `;
    
    console.log('✅ Deployment created:', deployment.url);
    return Response.json({ 
      success: true, 
      deployment,
      accessUrl: `/deploy/${deployment.url}`
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("❌ Deploy error:", error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
