<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Container;
use App\Models\ContainerFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ContainerController extends Controller
{
    /**
     * Map file extensions to broad categories.
     */
    protected function detectFileType(string $extension): string
    {
        $ext = strtolower($extension);

        if ($ext === 'pdf') {
            return 'pdf';
        }
        if (in_array($ext, ['xls', 'xlsx', 'csv', 'ods'])) {
            return 'excel';
        }
        if (in_array($ext, ['doc', 'docx', 'rtf', 'odt'])) {
            return 'word';
        }
        if (in_array($ext, ['ppt', 'pptx'])) {
            return 'powerpoint';
        }
        if (in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'])) {
            return 'image';
        }
        if (in_array($ext, ['zip', 'rar', '7z', 'tar', 'gz'])) {
            return 'archive';
        }
        if (in_array($ext, ['txt', 'json', 'xml', 'md'])) {
            return 'text';
        }

        return 'other';
    }

    /**
     * List containers with search, status filtering, and pagination.
     */
    public function index(Request $request)
    {
        $query = Container::with(['files.user', 'user']);

        // Search by container number, title, supplier, origin, notes, or file names
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('container_number', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%")
                  ->orWhere('supplier', 'like', "%{$search}%")
                  ->orWhere('origin', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%")
                  ->orWhereHas('files', function ($fileQuery) use ($search) {
                      $fileQuery->where('title', 'like', "%{$search}%")
                                ->orWhere('original_name', 'like', "%{$search}%");
                  });
            });
        }

        // Status filter
        if ($request->filled('status') && $request->status !== 'ALL') {
            $query->where('status', $request->status);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'latest');
        switch ($sortBy) {
            case 'oldest':
                $query->oldest();
                break;
            case 'number_asc':
                $query->orderBy('container_number', 'asc');
                break;
            case 'number_desc':
                $query->orderBy('container_number', 'desc');
                break;
            case 'latest':
            default:
                $query->latest();
                break;
        }

        // Pagination ("بيجنت")
        $perPage = (int) $request->get('per_page', 12);
        if ($perPage <= 0 || $perPage > 200) {
            $perPage = 12;
        }

        $containers = $query->paginate($perPage);

        // Overall stats for summary cards
        $totalContainers = Container::count();
        $totalFiles = ContainerFile::count();
        $totalFilesSize = (int) ContainerFile::sum('file_size');
        $statusCounts = Container::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        return response()->json([
            'containers' => $containers,
            'stats' => [
                'total_containers' => $totalContainers,
                'total_files'      => $totalFiles,
                'total_size'       => $totalFilesSize,
                'status_counts'    => $statusCounts,
            ],
        ]);
    }

    /**
     * Create a new container with optional initial file attachment.
     */
    public function store(Request $request)
    {
        $request->validate([
            'container_number' => 'required|string|max:100',
            'title'            => 'nullable|string|max:255',
            'status'           => 'nullable|string|in:SHIPPING,ARRIVED,UNLOADING,COMPLETED',
            'supplier'         => 'nullable|string|max:255',
            'origin'           => 'nullable|string|max:255',
            'shipping_date'    => 'nullable|date',
            'arrival_date'     => 'nullable|date',
            'notes'            => 'nullable|string|max:5000',
            'file'             => 'nullable|file|max:102400', // up to 100 MB
            'file_title'       => 'nullable|string|max:255',
        ]);

        $container = Container::create([
            'container_number' => trim($request->container_number),
            'title'            => $request->title ?: ('حاوية رقم ' . trim($request->container_number)),
            'status'           => $request->status ?: 'ARRIVED',
            'supplier'         => $request->supplier,
            'origin'           => $request->origin,
            'shipping_date'    => $request->shipping_date,
            'arrival_date'     => $request->arrival_date,
            'notes'            => $request->notes,
            'user_id'          => $request->user()?->id,
        ]);

        // If file provided during container creation
        if ($request->hasFile('file')) {
            $this->saveContainerFile($container, $request->file('file'), $request->file_title ?: $request->title, $request->user()?->id);
        }

        $container->load(['files.user', 'user']);

        return response()->json($container, 201);
    }

    /**
     * Get single container details with files.
     */
    public function show($id)
    {
        $container = Container::with(['files.user', 'user'])->findOrFail($id);
        return response()->json($container);
    }

    /**
     * Update container metadata.
     */
    public function update(Request $request, $id)
    {
        $container = Container::findOrFail($id);

        $request->validate([
            'container_number' => 'required|string|max:100',
            'title'            => 'nullable|string|max:255',
            'status'           => 'nullable|string|in:SHIPPING,ARRIVED,UNLOADING,COMPLETED',
            'supplier'         => 'nullable|string|max:255',
            'origin'           => 'nullable|string|max:255',
            'shipping_date'    => 'nullable|date',
            'arrival_date'     => 'nullable|date',
            'notes'            => 'nullable|string|max:5000',
        ]);

        $container->update([
            'container_number' => trim($request->container_number),
            'title'            => $request->title ?: ('حاوية رقم ' . trim($request->container_number)),
            'status'           => $request->status ?: $container->status,
            'supplier'         => $request->supplier,
            'origin'           => $request->origin,
            'shipping_date'    => $request->shipping_date,
            'arrival_date'     => $request->arrival_date,
            'notes'            => $request->notes,
        ]);

        $container->load(['files.user', 'user']);

        return response()->json($container);
    }

    /**
     * Delete container and all its physical files.
     */
    public function destroy($id)
    {
        $container = Container::with('files')->findOrFail($id);

        // Delete all physical files
        foreach ($container->files as $file) {
            $fullPath = public_path($file->file_path);
            if (File::exists($fullPath)) {
                File::delete($fullPath);
            }
        }

        $container->delete();

        return response()->json(['message' => 'تم حذف الحاوية وجميع ملفاتها بنجاح.']);
    }

    /**
     * Add a file directly to an existing container.
     */
    public function addFile(Request $request, $id)
    {
        $container = Container::findOrFail($id);

        $request->validate([
            'file'        => 'required|file|max:102400', // up to 100 MB
            'title'       => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
        ]);

        $fileRecord = $this->saveContainerFile(
            $container,
            $request->file('file'),
            $request->title,
            $request->user()?->id,
            $request->description
        );

        $container->load(['files.user', 'user']);

        return response()->json([
            'message'   => 'تم رفع الملف وإرفاقه بالحاوية بنجاح.',
            'file'      => $fileRecord,
            'container' => $container,
        ], 201);
    }

    /**
     * Quick Upload: upload file by entering or selecting container number (auto creates container if new).
     */
    public function quickUpload(Request $request)
    {
        $request->validate([
            'container_number' => 'required|string|max:100',
            'file'             => 'required|file|max:102400',
            'title'            => 'nullable|string|max:255',
            'description'      => 'nullable|string|max:2000',
            'status'           => 'nullable|string|in:SHIPPING,ARRIVED,UNLOADING,COMPLETED',
        ]);

        $cNumber = trim($request->container_number);

        // Find or create container
        $container = Container::firstOrCreate(
            ['container_number' => $cNumber],
            [
                'title'   => 'حاوية رقم ' . $cNumber,
                'status'  => $request->status ?: 'ARRIVED',
                'user_id' => $request->user()?->id,
            ]
        );

        $fileRecord = $this->saveContainerFile(
            $container,
            $request->file('file'),
            $request->title,
            $request->user()?->id,
            $request->description
        );

        $container->load(['files.user', 'user']);

        return response()->json([
            'message'   => "تم إرفاق الملف بالحاوية رقم {$cNumber} بنجاح.",
            'file'      => $fileRecord,
            'container' => $container,
        ], 201);
    }

    /**
     * Delete an individual container file.
     */
    public function deleteFile($fileId)
    {
        $file = ContainerFile::findOrFail($fileId);

        $fullPath = public_path($file->file_path);
        if (File::exists($fullPath)) {
            File::delete($fullPath);
        }

        $containerId = $file->container_id;
        $file->delete();

        $container = Container::with(['files.user', 'user'])->find($containerId);

        return response()->json([
            'message'   => 'تم حذف الملف بنجاح.',
            'container' => $container,
        ]);
    }

    /**
     * Download container file.
     */
    public function downloadFile($fileId)
    {
        $file = ContainerFile::findOrFail($fileId);
        $fullPath = public_path($file->file_path);

        if (!File::exists($fullPath)) {
            return response()->json(['message' => 'الملف غير موجود على الخادم.'], 404);
        }

        $file->increment('downloads_count');

        return response()->download($fullPath, $file->original_name);
    }

    /**
     * Preview file inline (PDF, images, etc.).
     */
    public function previewFile($fileId)
    {
        $file = ContainerFile::findOrFail($fileId);
        $fullPath = public_path($file->file_path);

        if (!File::exists($fullPath)) {
            return response()->json(['message' => 'الملف غير موجود على الخادم.'], 404);
        }

        $ext = strtolower($file->file_extension);
        $mimeType = match ($ext) {
            'pdf' => 'application/pdf',
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
            'txt' => 'text/plain; charset=utf-8',
            'json' => 'application/json',
            'csv' => 'text/csv; charset=utf-8',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls' => 'application/vnd.ms-excel',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc' => 'application/msword',
            default => File::mimeType($fullPath) ?: 'application/octet-stream',
        };

        return response()->file($fullPath, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . rawurlencode($file->original_name) . '"',
            'Access-Control-Allow-Origin' => '*',
            'X-Frame-Options' => 'ALLOWALL',
        ]);
    }

    /**
     * Helper to save uploaded file and create ContainerFile record.
     */
    protected function saveContainerFile(Container $container, $uploadedFile, ?string $title, ?int $userId, ?string $description = null): ContainerFile
    {
        $originalName = $uploadedFile->getClientOriginalName();
        $extension    = strtolower($uploadedFile->getClientOriginalExtension());
        $fileSize     = $uploadedFile->getSize();
        $fileType     = $this->detectFileType($extension);

        $destinationPath = public_path('uploads/containers');
        if (!File::isDirectory($destinationPath)) {
            File::makeDirectory($destinationPath, 0777, true, true);
        }

        $safeFileName = time() . '_' . uniqid() . '.' . $extension;
        $uploadedFile->move($destinationPath, $safeFileName);
        $filePath = '/uploads/containers/' . $safeFileName;

        return ContainerFile::create([
            'container_id'   => $container->id,
            'title'          => $title ?: pathinfo($originalName, PATHINFO_FILENAME),
            'original_name'  => $originalName,
            'file_path'      => $filePath,
            'file_type'      => $fileType,
            'file_extension' => $extension,
            'file_size'      => $fileSize,
            'description'    => $description,
            'downloads_count'=> 0,
            'user_id'        => $userId,
        ]);
    }
}
