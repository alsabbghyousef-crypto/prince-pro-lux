<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DataSheet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class DataSheetController extends Controller
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

    public function index(Request $request)
    {
        $query = DataSheet::with(['category', 'subcategory', 'user']);

        // Search by title, original name, description, tags
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('original_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('tags', 'like', "%{$search}%");
            });
        }

        // Category filter
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Subcategory filter
        if ($request->filled('subcategory_id')) {
            $query->where('subcategory_id', $request->subcategory_id);
        }

        // File type filter
        if ($request->filled('file_type')) {
            $query->where('file_type', $request->file_type);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'latest');
        switch ($sortBy) {
            case 'oldest':
                $query->oldest();
                break;
            case 'title_asc':
                $query->orderBy('title', 'asc');
                break;
            case 'title_desc':
                $query->orderBy('title', 'desc');
                break;
            case 'size_desc':
                $query->orderBy('file_size', 'desc');
                break;
            case 'size_asc':
                $query->orderBy('file_size', 'asc');
                break;
            case 'latest':
            default:
                $query->latest();
                break;
        }

        $datasheets = $query->get();

        // Calculate stats
        $totalSize = DataSheet::sum('file_size');
        $totalCount = DataSheet::count();
        $typeCounts = DataSheet::selectRaw('file_type, count(*) as count')
            ->groupBy('file_type')
            ->pluck('count', 'file_type');

        return response()->json([
            'datasheets' => $datasheets,
            'stats' => [
                'total_count' => $totalCount,
                'total_size' => (int) $totalSize,
                'type_counts' => $typeCounts,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:51200', // up to 50 MB
            'title' => 'required|string|max:255',
            'category_id' => 'nullable|exists:datasheet_categories,id',
            'subcategory_id' => 'nullable|exists:datasheet_categories,id',
            'description' => 'nullable|string|max:2000',
            'tags' => 'nullable|string|max:255',
        ]);

        $uploadedFile = $request->file('file');
        $originalName = $uploadedFile->getClientOriginalName();
        $extension = strtolower($uploadedFile->getClientOriginalExtension());
        $fileSize = $uploadedFile->getSize();
        $fileType = $this->detectFileType($extension);

        $destinationPath = public_path('uploads/datasheets');
        if (!File::isDirectory($destinationPath)) {
            File::makeDirectory($destinationPath, 0777, true, true);
        }

        $safeFileName = time() . '_' . uniqid() . '.' . $extension;
        $uploadedFile->move($destinationPath, $safeFileName);
        $filePath = '/uploads/datasheets/' . $safeFileName;

        $datasheet = DataSheet::create([
            'title' => $request->title,
            'original_name' => $originalName,
            'file_path' => $filePath,
            'file_type' => $fileType,
            'file_extension' => $extension,
            'file_size' => $fileSize,
            'category_id' => $request->category_id,
            'subcategory_id' => $request->subcategory_id,
            'description' => $request->description,
            'tags' => $request->tags,
            'downloads_count' => 0,
            'user_id' => $request->user() ? $request->user()->id : null,
        ]);

        $datasheet->load(['category', 'subcategory', 'user']);

        return response()->json($datasheet, 201);
    }

    public function show($id)
    {
        $datasheet = DataSheet::with(['category', 'subcategory', 'user'])->findOrFail($id);
        return response()->json($datasheet);
    }

    public function update(Request $request, $id)
    {
        $datasheet = DataSheet::findOrFail($id);

        $request->validate([
            'file' => 'nullable|file|max:51200',
            'title' => 'required|string|max:255',
            'category_id' => 'nullable|exists:datasheet_categories,id',
            'subcategory_id' => 'nullable|exists:datasheet_categories,id',
            'description' => 'nullable|string|max:2000',
            'tags' => 'nullable|string|max:255',
        ]);

        $data = [
            'title' => $request->title,
            'category_id' => $request->category_id,
            'subcategory_id' => $request->subcategory_id,
            'description' => $request->description,
            'tags' => $request->tags,
        ];

        // If replacing file
        if ($request->hasFile('file')) {
            // Delete old file
            $oldPath = public_path($datasheet->file_path);
            if (File::exists($oldPath)) {
                File::delete($oldPath);
            }

            $uploadedFile = $request->file('file');
            $originalName = $uploadedFile->getClientOriginalName();
            $extension = strtolower($uploadedFile->getClientOriginalExtension());
            $fileSize = $uploadedFile->getSize();
            $fileType = $this->detectFileType($extension);

            $destinationPath = public_path('uploads/datasheets');
            if (!File::isDirectory($destinationPath)) {
                File::makeDirectory($destinationPath, 0777, true, true);
            }

            $safeFileName = time() . '_' . uniqid() . '.' . $extension;
            $uploadedFile->move($destinationPath, $safeFileName);

            $data['original_name'] = $originalName;
            $data['file_path'] = '/uploads/datasheets/' . $safeFileName;
            $data['file_type'] = $fileType;
            $data['file_extension'] = $extension;
            $data['file_size'] = $fileSize;
        }

        $datasheet->update($data);
        $datasheet->load(['category', 'subcategory', 'user']);

        return response()->json($datasheet);
    }

    public function destroy($id)
    {
        $datasheet = DataSheet::findOrFail($id);

        // Delete physical file
        $fullPath = public_path($datasheet->file_path);
        if (File::exists($fullPath)) {
            File::delete($fullPath);
        }

        $datasheet->delete();

        return response()->json(['message' => 'تم حذف الملف بنجاح.']);
    }

    public function download($id)
    {
        $datasheet = DataSheet::findOrFail($id);
        $fullPath = public_path($datasheet->file_path);

        if (!File::exists($fullPath)) {
            return response()->json(['message' => 'الملف غير موجود على الخادم.'], 404);
        }

        $datasheet->increment('downloads_count');

        return response()->download($fullPath, $datasheet->original_name);
    }

    public function preview($id)
    {
        $datasheet = DataSheet::findOrFail($id);
        $fullPath = public_path($datasheet->file_path);

        if (!File::exists($fullPath)) {
            return response()->json(['message' => 'الملف غير موجود على الخادم.'], 404);
        }

        $ext = strtolower($datasheet->file_extension);
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
            'Content-Disposition' => 'inline; filename="' . rawurlencode($datasheet->original_name) . '"',
            'Access-Control-Allow-Origin' => '*',
            'X-Frame-Options' => 'ALLOWALL',
        ]);
    }
}
