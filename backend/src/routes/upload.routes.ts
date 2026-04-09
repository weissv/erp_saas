// src/routes/upload.routes.ts
import { Router, Request, Response } from "express";
import multer from "multer";
import { StorageService } from "../services/StorageService";

const router = Router();

// Configure multer with memory storage (buffer) and 50 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: StorageService.MAX_FILE_SIZE,
    files: 1,
  },
});

/**
 * POST /api/uploads
 * Upload a single file to tenant-scoped storage.
 *
 * The file is stored at /{tenantId}/{userId}/{randomToken}_{originalName}.
 * Requires authentication (applied globally before this route is mounted).
 *
 * Body: multipart/form-data with field name "file".
 * Optional body field: "tenantId" (defaults to "default").
 */
router.post("/", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file provided" });
    }

    // tenantId comes from the authenticated user context or body
    const tenantId: string =
      (req as any).tenantId ?? req.body.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "Missing tenantId" });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = String(req.user.id);

    const result = await StorageService.upload(
      tenantId,
      userId,
      file.originalname,
      file.buffer,
      file.mimetype
    );

    res.status(201).json({
      message: "File uploaded successfully",
      ...result,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    const status = error.message?.includes("exceeds maximum size") ? 413 : 500;
    res.status(status).json({ message: error.message || "Upload failed" });
  }
});

/**
 * DELETE /api/uploads/:key(*)
 * Delete a file from tenant-scoped storage.
 */
router.delete("/*", async (req: Request, res: Response) => {
  try {
    const key = req.params[0]; // everything after /api/uploads/
    if (!key) {
      return res.status(400).json({ message: "Missing file key" });
    }

    const tenantId: string = (req as any).tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "Missing tenantId" });
    }

    await StorageService.remove(tenantId, key);
    res.json({ message: "File deleted" });
  } catch (error: any) {
    console.error("Delete error:", error);
    const status = error.message?.includes("Access denied") ? 403 : 500;
    res.status(status).json({ message: error.message || "Delete failed" });
  }
});

export default router;
