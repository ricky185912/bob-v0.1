// src/app/deploy/[...slug]/route.ts
import { sql } from "@/lib/db";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function getContentType(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  const contentTypes: Record<string, string> = {
    html: 'text/html', htm: 'text/html',
    css: 'text/css',
    js: 'application/javascript', mjs: 'application/javascript',
    json: 'application/json',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', svg: 'image/svg+xml', ico: 'image/x-icon',
    webp: 'image/webp', ttf: 'font/ttf', woff: 'font/woff', woff2: 'font/woff2',
    mp4: 'video/mp4', webm: 'video/webm',
    pdf: 'application/pdf',
  };
  return contentTypes[extension] || 'application/octet-stream';
}

async function processHtmlContent(html: string, deploymentUrl: string): Promise<string> {
  const basePath = `/deploy/${deploymentUrl}/`;
  let processedHtml = html.replace(/<base[^>]*>/gi, '');
  
  const headMatch = processedHtml.match(/<head[^>]*>/i);
  if (headMatch) {
    const headTag = headMatch[0];
    const insertPos = processedHtml.indexOf(headTag) + headTag.length;
    processedHtml = processedHtml.slice(0, insertPos) + `\n<base href="${basePath}">` + processedHtml.slice(insertPos);
  }
  
  return processedHtml;
}

interface DeploymentRecord {
  id: string;
  url: string;
  status: string;
  hash: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
): Promise<Response> {
  try {
    const { slug } = await params;
    
    if (!slug || slug.length === 0) {
      return new Response('Not found', { status: 404 });
    }

    const deploymentUrl = slug[0];
    const filePath = slug.slice(1).join('/') || 'index.html';
    
    console.log(`📁 Serving: ${deploymentUrl} → ${filePath}`);
    
    if (!deploymentUrl.endsWith('.bob')) {
      return new Response('Invalid deployment URL', { status: 400 });
    }

    // ✅ FIXED SQL - Single line, no extra whitespace
    const deployments = await sql<DeploymentRecord[]>`
      SELECT d.id, d.url, d.status, a.hash 
      FROM deployments d 
      JOIN artifacts a ON d.artifact_id = a.id 
      WHERE d.url = ${deploymentUrl} AND d.status = 'READY' 
      LIMIT 1
    `;
    
    if (deployments.length === 0) {
      console.log(`❌ Deployment not found: ${deploymentUrl}`);
      return new Response('Deployment not found', { status: 404 });
    }
    
    const deployment = deployments[0];
    const storagePath = `${deployment.hash}/${filePath}`;
    
    console.log(`📦 Storage path: ${storagePath}`);
    
    const { data, error } = await supabaseAdmin.storage
      .from('artifacts')
      .download(storagePath);
    
    if (error || !data) {
      console.log(`❌ File not found: ${storagePath}`);
      
      if (filePath !== 'index.html') {
        const fallbackPath = `${deployment.hash}/index.html`;
        console.log(`🔄 Fallback: ${fallbackPath}`);
        
        const { data: fallbackData } = await supabaseAdmin.storage
          .from('artifacts')
          .download(fallbackPath);
        
        if (fallbackData) {
          console.log(`✅ Fallback served`);
          const html = await fallbackData.text();
          const processedHtml = await processHtmlContent(html, deployment.url);
          return new Response(processedHtml, {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            }
          });
        }
      }
      
      return new Response('File not found', { status: 404 });
    }
    
    const isHtml = filePath.match(/\.(html|htm)$/i) !== null;
    
    if (isHtml) {
      const text = await data.text();
      const processedHtml = await processHtmlContent(text, deployment.url);
      return new Response(processedHtml, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
    
    return new Response(data, {
      headers: {
        'Content-Type': getContentType(filePath),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      }
    });
    
  } catch (error: unknown) {
    console.error('🔥 Deploy route error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
