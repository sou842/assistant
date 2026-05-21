import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { nanoid } from 'nanoid';
import dbConnect from '@/lib/mongodb';
import VaultItem from '@/lib/models/VaultItem';

const execPromise = promisify(exec);

export async function POST(req: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default';

  if (!cloudName) {
    return NextResponse.json(
      { success: false, error: 'Cloudinary cloud name is not configured in .env.local' },
      { status: 500 }
    );
  }

  let inputPath = '';
  let outputPath = '';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided in the request' },
        { status: 400 }
      );
    }

    const isImage = file.type.startsWith('image/');
    const originalExt = path.extname(file.name) || '.jpg';
    
    // 1. Create OS-provided temp directory (writable on Vercel/serverless)
    const tempDir = path.join(os.tmpdir(), 'samnta-uploads');
    await fs.mkdir(tempDir, { recursive: true });

    // Generate unique names to prevent collision
    const fileId = nanoid();
    inputPath = path.join(tempDir, `input_${fileId}${originalExt}`);
    outputPath = path.join(tempDir, `output_${fileId}.webp`);

    // Write original file buffer to temp input
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(inputPath, buffer);

    // 2. Perform ImageMagick conversion to WebP with resize and optimization if it's an image
    let processedBuffer = buffer;
    let processedMime = file.type;

    if (isImage) {
      try {
        // Run ImageMagick: resize to max 1600x1600px, strip metadata, 90% quality WebP
        await execPromise(`magick "${inputPath}" -resize "1600x1600>" -strip -quality 90 "${outputPath}"`);
        
        // Read optimized image
        processedBuffer = await fs.readFile(outputPath);
        processedMime = 'image/webp';
      } catch (imError: any) {
        console.warn('ImageMagick conversion failed or command not found. Falling back to uploading raw input:', imError.message);
        // Falling back to raw input buffer
      }
    }

    // 3. Upload to Cloudinary using unsigned upload REST API
    const base64Data = `data:${processedMime};base64,${processedBuffer.toString('base64')}`;
    
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64Data,
        upload_preset: uploadPreset,
      }),
    });

    if (!response.ok) {
      const errorJson = await response.json();
      return NextResponse.json(
        { success: false, error: `Cloudinary error: ${errorJson.error?.message || response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 3.5 Auto-persist file to Vault Gallery in MongoDB
    try {
      await dbConnect();
      
      let gallery = await VaultItem.findOne({ type: 'gallery' });
      if (!gallery) {
        gallery = await VaultItem.create({
          title: 'Gallery',
          type: 'gallery',
          content: [],
          tags: ['gallery', 'media', 'uploads'],
        });
      }

      const mediaFile = {
        id: nanoid(),
        url: data.secure_url,
        publicId: data.public_id,
        filename: file.name || 'uploaded-file',
        mediaType: processedMime || file.type || 'application/octet-stream',
        size: data.bytes || file.size || 0,
        createdAt: new Date(),
      };

      await VaultItem.updateOne(
        { _id: gallery._id },
        { 
          $push: { content: mediaFile },
          $set: { updatedAt: new Date() }
        }
      );
    } catch (dbError: any) {
      console.error('Failed to auto-persist upload to Vault Gallery:', dbError.message);
    }

    return NextResponse.json({
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      bytes: data.bytes,
    });

  } catch (error: any) {
    console.error('Upload handler error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred during file upload' },
      { status: 500 }
    );
  } finally {
    // 4. Always clean up temp files
    try {
      if (inputPath) {
        await fs.unlink(inputPath).catch(() => {});
      }
      if (outputPath) {
        await fs.unlink(outputPath).catch(() => {});
      }
    } catch (cleanupError) {
      console.error('Failed to clean up temporary files:', cleanupError);
    }
  }
}
