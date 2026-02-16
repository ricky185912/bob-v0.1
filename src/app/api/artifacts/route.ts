//src/app/api/artifacts/route.ts
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import AdmZip from 'adm-zip';

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;
// Maximum number of files in a ZIP
const MAX_FILES = 1000;
// Maximum total extracted size: 100MB
const MAX_EXTRACTED_SIZE = 100 * 1024 * 1024;

// Allowed file extensions for security
const ALLOWED_EXTENSIONS = new Set([
  // HTML
  'html', 'htm',
  // CSS
  'css',
  // JavaScript
  'js', 'mjs', 'cjs',
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff',
  // Fonts
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  // Data
  'json', 'xml', 'csv', 'txt', 'md',
  // Media
  'mp4', 'webm', 'mp3', 'wav', 'ogg', 'm4a',
  // Documents
  'pdf',
  // Web files
  'webmanifest', 'map'
]);

interface FileEntry {
  path: string;
  data: Buffer;
  contentType: string;
  size: number;
}

interface ArtifactRecord {
  id: string;
  hash: string;
  size: number;
  file_count: number;
  created_at: string;
}

export async function POST(request: Request): Promise<Response> {
  const log: string[] = [];
  
  try {
    log.push("=== ARTIFACT CREATION START ===");
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      log.push("❌ No session");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    log.push(`User ID: ${session.user.id}`);

    const formData = await request.formData();
    const zipFile = formData.get('zip') as File | null;
    const hash = formData.get('hash') as string | null;
    
    if (!zipFile || !hash) {
      log.push("❌ Missing file or hash");
      return Response.json({ 
        error: "ZIP file and hash are required" 
      }, { status: 400 });
    }
    
    // Validate file size
    if (zipFile.size > MAX_FILE_SIZE) {
      log.push(`❌ File too large: ${zipFile.size} bytes (max: ${MAX_FILE_SIZE})`);
      return Response.json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 400 });
    }
    
    log.push(`Zip file: ${zipFile.name} (${zipFile.size} bytes)`);
    log.push(`Hash received: ${hash}`);
    
    // Validate hash format (SHA256 hex)
    const hashRegex = /^[a-f0-9]{64}$/i;
    if (!hashRegex.test(hash)) {
      log.push("❌ Invalid hash format");
      return Response.json({ 
        error: "Invalid hash format. Must be SHA256 hex string" 
      }, { status: 400 });
    }

    // Check if artifact already exists
    const existing = await sql<Pick<ArtifactRecord, 'id'>[]>`
      SELECT id FROM artifacts WHERE hash = ${hash}
    `;
    
    if (existing.length > 0) {
      log.push("✓ Artifact already exists");
      console.log(log.join('\n'));
      return Response.json({
        success: true,
        artifactId: existing[0].id,
        message: "Artifact already exists"
      });
    }

    // Convert File to Buffer
    const bytes = await zipFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    log.push(`Buffer size: ${buffer.length} bytes`);
    
    // Verify hash matches
    const crypto = await import('crypto');
    const computedHash = crypto.createHash('sha256').update(buffer).digest('hex');
    log.push(`Computed hash: ${computedHash}`);
    
    if (computedHash !== hash) {
      log.push("❌ Hash mismatch");
      throw new Error(`Hash mismatch. Computed: ${computedHash}, Provided: ${hash}`);
    }
    
    // Extract ZIP in memory
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    
    log.push(`ZIP has ${entries.length} entries`);
    
    if (entries.length === 0) {
      log.push("❌ ZIP file is empty");
      throw new Error("ZIP file is empty");
    }
    
    if (entries.length > MAX_FILES) {
      log.push(`❌ Too many files: ${entries.length} (max: ${MAX_FILES})`);
      throw new Error(`Too many files. Maximum is ${MAX_FILES} files`);
    }
    
    // Find all files and detect root folder
    const files: FileEntry[] = [];
    
    let hasIndexHtml = false;
    let rootFolder: string | null = null;
    let totalExtractedSize = 0;
    let indexHtmlPath: string | null = null;
    
    // First pass: Analyze structure and validate
    for (const entry of entries) {
      if (!entry.isDirectory) {
        const entryPath = entry.entryName.replace(/\\/g, '/');
        
        // Skip macOS __MACOSX folders
        if (entryPath.includes('__MACOSX/') || entryPath.includes('.DS_Store')) {
          continue;
        }
        
        // Validate file extension
        const extension = entryPath.split('.').pop()?.toLowerCase();
        if (extension && !ALLOWED_EXTENSIONS.has(extension)) {
          log.push(`⚠️ Skipping disallowed file type: ${entryPath}`);
          continue;
        }
        
        // Check for potential path traversal
        if (entryPath.includes('..') || entryPath.includes('//')) {
          log.push(`⚠️ Skipping suspicious path: ${entryPath}`);
          continue;
        }
        
        // Detect root folder
        const pathParts = entryPath.split('/');
        if (pathParts.length > 1 && !rootFolder) {
          const firstPart = pathParts[0];
          // Ensure it's a valid folder name
          if (firstPart && !firstPart.includes('.')) {
            rootFolder = firstPart;
          }
        }
        
        // Check for index.html
        const normalizedPath = entryPath.toLowerCase();
        if (normalizedPath === 'index.html' || normalizedPath.endsWith('/index.html')) {
          hasIndexHtml = true;
          indexHtmlPath = entryPath;
        }
      }
    }
    
    if (rootFolder) {
      log.push(`Detected root folder: "${rootFolder}"`);
    }
    
    // Second pass: Extract files
    for (const entry of entries) {
      if (!entry.isDirectory) {
        let entryPath = entry.entryName.replace(/\\/g, '/');
        
        // Skip macOS metadata
        if (entryPath.includes('__MACOSX/') || entryPath.includes('.DS_Store')) {
          continue;
        }
        
        // Strip root folder if present
        if (rootFolder && entryPath.startsWith(`${rootFolder}/`)) {
          entryPath = entryPath.substring(rootFolder.length + 1);
        }
        
        if (!entryPath || entryPath === '') {
          continue;
        }
        
        // Get file data
        let fileData = entry.getData();
        const fileSize = fileData.length;
        
        // Check size limits
        totalExtractedSize += fileSize;
        if (totalExtractedSize > MAX_EXTRACTED_SIZE) {
          log.push(`❌ Total extracted size too large: ${totalExtractedSize} bytes`);
          throw new Error(`Total extracted size exceeds limit of ${MAX_EXTRACTED_SIZE / 1024 / 1024}MB`);
        }
        
        // Determine content type
        const contentType = getContentType(entryPath);
        
        // For HTML files, ensure charset is set
        if (contentType === 'text/html') {
          const htmlContent = fileData.toString('utf-8');
          
          // Basic HTML validation
          if (!htmlContent.trim().startsWith('<!DOCTYPE html') && 
              !htmlContent.includes('<html') && 
              !htmlContent.includes('<head>')) {
            log.push(`⚠️ HTML file missing doctype/head: ${entryPath}`);
          }
          
          fileData = Buffer.from(htmlContent, 'utf-8');
        }
        
        files.push({
          path: entryPath,
          data: fileData,
          contentType,
          size: fileSize
        });
        
        log.push(`  File: ${entryPath} (${fileSize} bytes, ${contentType})`);
      }
    }
    
    if (files.length === 0) {
      log.push("❌ No valid files found in ZIP");
      throw new Error("No valid files found in ZIP");
    }
    
    if (!hasIndexHtml) {
      log.push("❌ No index.html found in the ZIP");
      log.push(`Files found: ${files.map(f => f.path).join(', ')}`);
      return Response.json({ 
        error: "ZIP must contain an index.html file at the root or in a subdirectory",
        filesFound: files.map(f => f.path)
      }, { status: 400 });
    }
    
    log.push(`✅ Found index.html at: ${indexHtmlPath}`);
    log.push(`📦 Extracted ${files.length} files (${totalExtractedSize} bytes total)`);
    
    // Upload files to Supabase Storage
    log.push("Uploading to Supabase Storage...");
    let uploadedCount = 0;
    const uploadErrors: string[] = [];
    
    // Upload files in parallel batches (max 5 at a time)
    const BATCH_SIZE = 5;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const uploadPromises = batch.map(async (file) => {
        try {
          const storagePath = `${hash}/${file.path}`;
          
          const { error: uploadError } = await supabaseAdmin.storage
            .from('artifacts')
            .upload(storagePath, file.data, {
              contentType: file.contentType,
              cacheControl: 'public, max-age=31536000, immutable',
              upsert: false
            });
          
          if (uploadError) {
            if (uploadError.message?.includes('already exists')) {
              log.push(`  ⚠️ Already exists: ${file.path}`);
              uploadedCount++;
            } else {
              throw uploadError;
            }
          } else {
            uploadedCount++;
            log.push(`  ✅ Uploaded: ${file.path}`);
          }
        } catch (uploadError: unknown) {
          const errorMessage = uploadError instanceof Error 
            ? uploadError.message 
            : 'Unknown upload error';
          uploadErrors.push(`${file.path}: ${errorMessage}`);
          log.push(`  ❌ Failed: ${file.path} - ${errorMessage}`);
        }
      });
      
      await Promise.all(uploadPromises);
    }
    
    if (uploadErrors.length > 0) {
      log.push(`⚠️ Some files failed to upload: ${uploadErrors.length} errors`);
    }
    
    if (uploadedCount === 0) {
      log.push("❌ No files were uploaded");
      throw new Error("Failed to upload any files to storage");
    }
    
    log.push(`✅ Uploaded ${uploadedCount}/${files.length} files`);
    
    // Create database record
    const [artifact] = await sql<ArtifactRecord[]>`
      INSERT INTO artifacts (hash, size, file_count)
      VALUES (${hash}, ${buffer.length}, ${uploadedCount})
      RETURNING id, hash, size, file_count, created_at
    `;

    log.push(`✅ Artifact created: ${artifact.id}`);
    log.push("=== ARTIFACT CREATION END ===");
    
    console.log(log.join('\n'));
    
    return Response.json({ 
      success: true, 
      artifact,
      summary: {
        files: uploadedCount,
        totalSize: totalExtractedSize,
        indexHtmlPath
      }
    }, { status: 201 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.push(`❌ Artifact creation error: ${errorMessage}`);
    console.error(log.join('\n'));
    
    return Response.json({
      success: false,
      error: errorMessage,
      logs: process.env.NODE_ENV === 'development' ? log : undefined
    }, { status: 500 });
  }
}

// Helper function to determine content type
function getContentType(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  
  const contentTypes: Record<string, string> = {
    // HTML
    html: 'text/html',
    htm: 'text/html',
    
    // CSS
    css: 'text/css',
    
    // JavaScript
    js: 'application/javascript',
    mjs: 'application/javascript',
    cjs: 'application/javascript',
    
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    ico: 'image/x-icon',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    
    // Fonts
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    otf: 'font/otf',
    eot: 'application/vnd.ms-fontobject',
    
    // Data
    json: 'application/json',
    xml: 'application/xml',
    csv: 'text/csv',
    txt: 'text/plain',
    md: 'text/markdown',
    
    // Media
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    
    // Documents
    pdf: 'application/pdf',
    
    // Web files
    webmanifest: 'application/manifest+json',
    map: 'application/json'
  };
  
  return contentTypes[extension] || 'application/octet-stream';
}